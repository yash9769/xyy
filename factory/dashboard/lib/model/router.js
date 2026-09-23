'use strict';

/**
 * ModelRouter — the deterministic routing + bounded-fallback boundary between an agent and a
 * provider (doc 08 §2, this phase's items 5/8). Sits above ProviderRegistry/ModelRegistry, never
 * touches stateMachine.js/store.js/auditLog.js directly except to append the existing audit log
 * (no second audit log) and never lets a model response mutate lifecycle state.
 *
 * route() never throws for an expected failure mode (invalid request, no eligible model, budget
 * exceeded, provider technical failure, malformed provider response, fallback exhausted) — each
 * becomes a structured FAILED or BLOCKED response, recorded and audited, same discipline as
 * AgentRunner.run().
 */

const crypto = require('crypto');
const { createModelRequest } = require('./ModelRequest');
const { validateModelResponse } = require('./ModelResponse');
const { selectModel } = require('./routingPolicy');
const { appendModelRun } = require('./persistence');
const auditLog = require('../auditLog');
const { RESULT_STATUS, FAILURE_REASON, BLOCK_REASON } = require('./types');

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_FALLBACK_ATTEMPTS = 1; // 1 fallback attempt beyond the initial one = 2 total tries

class ModelRouter {
  constructor(providerRegistry, modelRegistry, options = {}) {
    if (!providerRegistry || typeof providerRegistry.get !== 'function') {
      throw new TypeError('ModelRouter requires a ProviderRegistry');
    }
    if (!modelRegistry || typeof modelRegistry.list !== 'function') {
      throw new TypeError('ModelRouter requires a ModelRegistry');
    }
    this._providers = providerRegistry;
    this._models = modelRegistry;
    this._timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this._maxFallbackAttempts = options.maxFallbackAttempts ?? DEFAULT_MAX_FALLBACK_ATTEMPTS;
    this._persistModelRun = options.persistModelRun ?? appendModelRun;
    this._appendAudit = options.appendAudit ?? auditLog.append;
  }

  async route(rawRequestInput) {
    const startedAt = new Date().toISOString();
    const fallbackRequestId =
      rawRequestInput && typeof rawRequestInput.request_id === 'string' && rawRequestInput.request_id.trim()
        ? rawRequestInput.request_id
        : crypto.randomUUID();

    let request;
    try {
      request = createModelRequest(rawRequestInput);
    } catch (e) {
      return this._finish({
        requestId: fallbackRequestId,
        agentRunId: rawRequestInput?.agent_run_id ?? null,
        taskType: rawRequestInput?.task_type ?? null,
        startedAt,
        attempts: [],
        result: {
          request_id: fallbackRequestId,
          provider_id: null,
          model_id: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_REQUEST}: ${e.message}`],
          warnings: [],
        },
      });
    }

    const excludedModelIds = [];
    const attempts = [];
    const maxAttempts = this._maxFallbackAttempts + 1;
    let finalResult = null;

    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
      const selection = selectModel(this._models, {
        requiredCapabilities: request.model_requirements.capabilities,
        maxCostUsd: request.budget?.maxCostUsd,
        excludeModelIds: excludedModelIds,
      });

      if (!selection.model) {
        attempts.push({ attempt: attemptIndex, model_id: null, provider_id: null, outcome: 'BLOCKED', reason: selection.blockReason });
        finalResult = {
          request_id: request.request_id,
          provider_id: null,
          model_id: null,
          status: RESULT_STATUS.BLOCKED,
          block_reason: selection.blockReason,
          warnings: [],
        };
        break;
      }

      const { model } = selection;
      let provider;
      try {
        provider = this._providers.get(model.provider_id);
      } catch (e) {
        attempts.push({ attempt: attemptIndex, model_id: model.model_id, provider_id: model.provider_id, outcome: 'FAILED', reason: e.message });
        finalResult = {
          request_id: request.request_id,
          provider_id: model.provider_id,
          model_id: model.model_id,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.UNKNOWN_PROVIDER}: ${e.message}`],
          warnings: [],
        };
        break;
      }

      let candidate;
      let technicalError = null;
      try {
        candidate = await this._invokeWithTimeout(provider, model.model_id, request);
      } catch (e) {
        technicalError = e;
      }

      if (technicalError) {
        const isTimeout = technicalError.__isModelTimeout === true;
        attempts.push({
          attempt: attemptIndex,
          model_id: model.model_id,
          provider_id: provider.provider_id,
          outcome: 'TECHNICAL_FAILURE',
          reason: isTimeout ? BLOCK_REASON.EXECUTION_TIMEOUT : technicalError.message,
        });
        excludedModelIds.push(model.model_id);
        // Technical failures are the only ones eligible for a bounded fallback attempt. Loop
        // continues to try selectModel again (still honoring the same capability/budget filters).
        continue;
      }

      // -- Response validation: model output is untrusted --
      let validated;
      try {
        validated = validateModelResponse(candidate, request, model, provider);
      } catch (e) {
        attempts.push({ attempt: attemptIndex, model_id: model.model_id, provider_id: provider.provider_id, outcome: 'FAILED', reason: e.message });
        finalResult = {
          request_id: request.request_id,
          provider_id: provider.provider_id,
          model_id: model.model_id,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_RESPONSE}: ${e.message}`],
          warnings: [],
        };
        break;
      }

      // A non-technical FAILED/BLOCKED response from the provider is final — it is not a
      // technical execution failure, so it must never trigger fallback (this phase's item 8).
      attempts.push({ attempt: attemptIndex, model_id: model.model_id, provider_id: provider.provider_id, outcome: validated.status });
      finalResult = validated;
      break;
    }

    if (!finalResult) {
      // Every attempt was a technical failure and the fallback budget is exhausted.
      finalResult = {
        request_id: request.request_id,
        provider_id: null,
        model_id: null,
        status: RESULT_STATUS.BLOCKED,
        block_reason: BLOCK_REASON.MAX_FALLBACK_ATTEMPTS_EXCEEDED,
        warnings: [],
      };
    }

    return this._finish({
      requestId: request.request_id,
      agentRunId: request.agent_run_id,
      taskType: request.task_type,
      startedAt,
      attempts,
      result: finalResult,
    });
  }

  async _invokeWithTimeout(provider, modelId, request) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('model invocation timed out');
        err.__isModelTimeout = true;
        reject(err);
      }, this._timeoutMs);
    });
    try {
      return await Promise.race([Promise.resolve().then(() => provider.invoke(modelId, request)), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  _finish({ requestId, agentRunId, taskType, startedAt, attempts, result }) {
    const finishedAt = new Date().toISOString();
    const fallbackUsed = attempts.filter((a) => a.outcome === 'TECHNICAL_FAILURE').length > 0;

    this._persistModelRun({
      request_id: requestId,
      agent_run_id: agentRunId ?? null,
      task_type: taskType ?? null,
      provider_id: result.provider_id,
      model_id: result.model_id,
      status: result.status,
      output: result.output,
      errors: result.errors,
      block_reason: result.block_reason,
      usage: result.usage,
      warnings: result.warnings,
      attempts,
      fallback_used: fallbackUsed,
      fallback_attempt_count: attempts.filter((a) => a.outcome === 'TECHNICAL_FAILURE').length,
      started_at: startedAt,
      finished_at: finishedAt,
    });

    this._appendAudit({
      actor: 'AGENT',
      actorName: result.provider_id || 'model-router',
      action: 'MODEL_RUN',
      opportunityId: null,
      previousState: null,
      newState: null,
      note:
        `request_id=${requestId} agent_run_id=${agentRunId ?? 'unknown'} ` +
        `provider_id=${result.provider_id ?? 'none'} model_id=${result.model_id ?? 'none'} ` +
        `status=${result.status} fallback_used=${fallbackUsed}`,
    });

    return { ...result, request_id: result.request_id ?? requestId, started_at: startedAt, finished_at: finishedAt, attempts };
  }
}

module.exports = { ModelRouter, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_FALLBACK_ATTEMPTS };
