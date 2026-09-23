'use strict';

/**
 * AgentRunner — the bounded execution boundary between the registry and an agent's run(). Sits
 * strictly above the existing services; it never touches stateMachine.js/store.js itself (agents
 * that need a lifecycle transition use lifecycle.js, which hardcodes actor: 'AGENT').
 *
 * Every call to run() returns a structured result — it does not throw for any of the expected
 * failure modes (unknown agent, malformed context, malformed result, agent exception, bounded-
 * execution limit) because those are exactly the failures this runtime exists to make explicit
 * and auditable rather than letting them surface as uncaught exceptions or silent successes.
 */

const crypto = require('crypto');
const { createAgentContext } = require('./AgentContext');
const { validateAgentResult } = require('./AgentResult');
const { appendAgentRun } = require('./persistence');
const auditLog = require('../auditLog');
const { RESULT_STATUS, FAILURE_REASON, BLOCK_REASON } = require('./types');

const DEFAULT_MAX_TOTAL_INVOCATIONS = 1000;

class AgentRunner {
  constructor(registry, options = {}) {
    if (!registry || typeof registry.get !== 'function') {
      throw new TypeError('AgentRunner requires an AgentRegistry');
    }
    this._registry = registry;
    this._maxTotalInvocations = options.maxTotalInvocations ?? DEFAULT_MAX_TOTAL_INVOCATIONS;
    this._persistAgentRun = options.persistAgentRun ?? appendAgentRun;
    this._appendAudit = options.appendAudit ?? auditLog.append;
    this._invocationCount = 0;
    this._activeRunIds = new Set();
  }

  /**
   * @param {object} rawContextInput - see AgentContext.createAgentContext for shape.
   * @returns {Promise<object>} always a plain object with at least { run_id, status, ... } —
   *   never throws for an expected failure mode.
   */
  async run(rawContextInput) {
    const fallbackRunId =
      rawContextInput && typeof rawContextInput.run_id === 'string' && rawContextInput.run_id.trim()
        ? rawContextInput.run_id
        : crypto.randomUUID();
    const agentIdForRecord =
      (rawContextInput && typeof rawContextInput.agent_id === 'string' && rawContextInput.agent_id) || null;
    const startedAt = new Date().toISOString();

    // -- Bounded execution: total-invocation cap --
    this._invocationCount += 1;
    if (this._invocationCount > this._maxTotalInvocations) {
      return this._finish({
        runId: fallbackRunId,
        agentId: agentIdForRecord,
        agentVersion: null,
        opportunityId: rawContextInput?.opportunity_id ?? null,
        workflowId: rawContextInput?.workflow_id ?? null,
        startedAt,
        result: {
          run_id: fallbackRunId,
          agent_id: agentIdForRecord,
          agent_version: null,
          status: RESULT_STATUS.BLOCKED,
          block_reason: `${BLOCK_REASON.RUNNER_INVOCATION_LIMIT_EXCEEDED}: this runner instance has exceeded its configured maxTotalInvocations (${this._maxTotalInvocations})`,
          warnings: [],
        },
      });
    }

    // -- Bounded execution: reentrancy guard (the same run_id cannot execute concurrently) --
    if (this._activeRunIds.has(fallbackRunId)) {
      return this._finish({
        runId: fallbackRunId,
        agentId: agentIdForRecord,
        agentVersion: null,
        opportunityId: rawContextInput?.opportunity_id ?? null,
        workflowId: rawContextInput?.workflow_id ?? null,
        startedAt,
        result: {
          run_id: fallbackRunId,
          agent_id: agentIdForRecord,
          agent_version: null,
          status: RESULT_STATUS.BLOCKED,
          block_reason: `${BLOCK_REASON.RUN_ID_ALREADY_EXECUTING}: run_id '${fallbackRunId}' is already executing`,
          warnings: [],
        },
      });
    }

    // -- Context validation --
    let context;
    try {
      context = createAgentContext(rawContextInput);
    } catch (e) {
      return this._finish({
        runId: fallbackRunId,
        agentId: agentIdForRecord,
        agentVersion: null,
        opportunityId: rawContextInput?.opportunity_id ?? null,
        workflowId: rawContextInput?.workflow_id ?? null,
        startedAt,
        result: {
          run_id: fallbackRunId,
          agent_id: agentIdForRecord,
          agent_version: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_CONTEXT}: ${e.message}`],
          warnings: [],
        },
      });
    }

    // -- Agent resolution --
    let agent;
    try {
      agent = this._registry.get(context.agent_id);
    } catch (e) {
      return this._finish({
        runId: context.run_id,
        agentId: context.agent_id,
        agentVersion: null,
        opportunityId: context.opportunity_id,
        workflowId: context.workflow_id,
        startedAt,
        result: {
          run_id: context.run_id,
          agent_id: context.agent_id,
          agent_version: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.UNKNOWN_AGENT}: ${e.message}`],
          warnings: [],
        },
      });
    }

    // -- Execution, bounded by maxDurationMs, with a reentrancy guard held for the duration --
    this._activeRunIds.add(context.run_id);
    let candidate;
    let executionError = null;
    try {
      candidate = await this._executeWithTimeout(agent, context);
    } catch (e) {
      executionError = e;
    } finally {
      this._activeRunIds.delete(context.run_id);
    }

    if (executionError) {
      const isTimeout = executionError.__isAgentTimeout === true;
      const result = isTimeout
        ? {
            run_id: context.run_id,
            agent_id: agent.agent_id,
            agent_version: agent.version,
            status: RESULT_STATUS.BLOCKED,
            block_reason: `${BLOCK_REASON.EXECUTION_TIMEOUT}: agent exceeded maxDurationMs (${context.limits.maxDurationMs}ms)`,
            warnings: [],
          }
        : {
            run_id: context.run_id,
            agent_id: agent.agent_id,
            agent_version: agent.version,
            status: RESULT_STATUS.FAILED,
            errors: [`${FAILURE_REASON.AGENT_THREW}: ${executionError.message}`],
            warnings: [],
          };
      return this._finish({
        runId: context.run_id,
        agentId: agent.agent_id,
        agentVersion: agent.version,
        opportunityId: context.opportunity_id,
        workflowId: context.workflow_id,
        startedAt,
        context,
        result,
      });
    }

    // -- Result validation: agent output is untrusted --
    let validated;
    try {
      validated = validateAgentResult({ ...candidate, agent_version: agent.version }, context);
    } catch (e) {
      return this._finish({
        runId: context.run_id,
        agentId: agent.agent_id,
        agentVersion: agent.version,
        opportunityId: context.opportunity_id,
        workflowId: context.workflow_id,
        startedAt,
        context,
        result: {
          run_id: context.run_id,
          agent_id: agent.agent_id,
          agent_version: agent.version,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_RESULT}: ${e.message}`],
          warnings: [],
        },
      });
    }

    return this._finish({
      runId: context.run_id,
      agentId: agent.agent_id,
      agentVersion: agent.version,
      opportunityId: context.opportunity_id,
      workflowId: context.workflow_id,
      startedAt,
      context,
      result: validated,
    });
  }

  async _executeWithTimeout(agent, context) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('agent execution timed out');
        err.__isAgentTimeout = true;
        reject(err);
      }, context.limits.maxDurationMs);
    });
    try {
      return await Promise.race([Promise.resolve().then(() => agent.run(context)), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Persists the AgentRun record and writes the audit entry, then returns the plain result. */
  _finish({ runId, agentId, agentVersion, opportunityId, workflowId, startedAt, context, result }) {
    const finishedAt = new Date().toISOString();

    this._persistAgentRun({
      run_id: runId,
      agent_id: agentId,
      agent_version: agentVersion,
      workflow_id: workflowId ?? null,
      opportunity_id: opportunityId ?? null,
      input: context ? context.input : undefined,
      configuration: context ? context.configuration : undefined,
      status: result.status,
      output: result.output,
      errors: result.errors,
      block_reason: result.block_reason,
      warnings: result.warnings,
      started_at: startedAt,
      finished_at: finishedAt,
    });

    this._appendAudit({
      actor: 'AGENT',
      actorName: agentId || 'agent',
      action: 'AGENT_RUN',
      opportunityId: opportunityId ?? null,
      previousState: null,
      newState: null,
      note: `agent_id=${agentId ?? 'unknown'} agent_version=${agentVersion ?? 'unknown'} run_id=${runId} status=${result.status}`,
    });

    return { ...result, run_id: result.run_id ?? runId, started_at: startedAt, finished_at: finishedAt };
  }
}

module.exports = { AgentRunner, DEFAULT_MAX_TOTAL_INVOCATIONS };
