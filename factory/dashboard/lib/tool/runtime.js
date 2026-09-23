'use strict';

/**
 * ToolRuntime — the deny-by-default security boundary between an agent and a tool (doc 09 §2/§6,
 * this phase's item 11). Enforces, in order, for every execution attempt: request validation,
 * tool resolution (deny if unregistered), actor validation, permission check (deny by default),
 * input validation, bounded execution (timeout + bounded retry on technical failures only),
 * output validation, persistence, and audit — a denied request never reaches execute().
 *
 * execute() never throws for an expected failure mode (invalid request, unknown tool, permission
 * denied, invalid input, tool exception, timeout, malformed output) — each becomes a structured
 * FAILED or BLOCKED ToolResult, persisted and audited, same discipline as AgentRunner.run() and
 * ModelRouter.route().
 *
 * HUMAN identity cannot be established through execute()'s request object at all — actor is
 * restricted to 'AGENT'/'SYSTEM' at the ToolExecutionRequest boundary (see
 * ToolExecutionRequest.js). The only path that can run a tool as HUMAN is
 * executeAsHumanConfirmed(), which takes no actor parameter and requires a real interactive
 * confirmation, mirroring factory/dashboard/lib/cli.js's human-transition command exactly.
 */

const crypto = require('crypto');
const fs = require('fs');
const { createToolExecutionRequest } = require('./ToolExecutionRequest');
const { validateToolResult } = require('./ToolResult');
const { appendToolExecution } = require('./persistence');
const auditLog = require('../auditLog');
const { RESULT_STATUS, FAILURE_REASON, BLOCK_REASON, ToolTechnicalError } = require('./types');

class ToolRuntime {
  constructor(toolRegistry, options = {}) {
    if (!toolRegistry || typeof toolRegistry.get !== 'function') {
      throw new TypeError('ToolRuntime requires a ToolRegistry');
    }
    this._registry = toolRegistry;
    this._persistToolExecution = options.persistToolExecution ?? appendToolExecution;
    this._appendAudit = options.appendAudit ?? auditLog.append;
  }

  /** The only entry point for AGENT/SYSTEM-actor executions. Rejects actor: 'HUMAN' at the
   * request-validation stage (createToolExecutionRequest), before anything else runs. */
  async execute(rawRequestInput) {
    return this._run(rawRequestInput);
  }

  /**
   * The only entry point that can produce a HUMAN-actor execution. `rawRequestInput` must NOT
   * (and structurally cannot, since this function ignores any `actor` field) contain an actor —
   * identity is established solely by a real interactive confirmation, exactly like
   * factory/dashboard/lib/cli.js's `human-transition` command.
   *
   * @param {object} rawRequestInput - same shape as execute(), minus `actor`.
   * @param {object} [options]
   * @param {function} [options.confirmHuman] - injectable for tests; defaults to a real /dev/tty
   *   confirmation prompt requiring the operator to type the execution_id back.
   */
  async executeAsHumanConfirmed(rawRequestInput, options = {}) {
    const executionId =
      rawRequestInput && typeof rawRequestInput.execution_id === 'string' && rawRequestInput.execution_id.trim()
        ? rawRequestInput.execution_id
        : crypto.randomUUID();
    const confirmHuman = options.confirmHuman ?? ToolRuntime._defaultTtyConfirmation;

    let confirmed;
    try {
      confirmed = await confirmHuman(executionId);
    } catch (e) {
      confirmed = false;
    }
    if (confirmed !== true) {
      return this._finish({
        executionId,
        toolId: rawRequestInput?.tool_id ?? null,
        agentRunId: rawRequestInput?.agent_run_id ?? null,
        startedAt: new Date().toISOString(),
        attempts: 0,
        result: {
          execution_id: executionId,
          tool_id: rawRequestInput?.tool_id ?? null,
          tool_version: null,
          side_effect_level: null,
          status: RESULT_STATUS.BLOCKED,
          block_reason: `${BLOCK_REASON.HUMAN_APPROVAL_REQUIRED}: interactive human confirmation was not obtained`,
          warnings: [],
        },
      });
    }

    // Confirmation succeeded — actor is hardcoded here, never taken from rawRequestInput.
    return this._run({ ...rawRequestInput, execution_id: executionId, actor: 'HUMAN' }, { allowHumanActor: true });
  }

  static _defaultTtyConfirmation(executionId) {
    let ttyFd;
    try {
      ttyFd = fs.openSync('/dev/tty', 'r+');
    } catch (e) {
      return false; // no controlling terminal -> cannot confirm human presence -> fail closed.
    }
    try {
      fs.writeSync(
        ttyFd,
        `=== HUMAN CONFIRMATION REQUIRED ===\nTool execution: ${executionId}\n` +
        `Type the execution id exactly (${executionId}) to confirm you are a human operator: `,
      );
      const buf = Buffer.alloc(4096);
      const bytesRead = fs.readSync(ttyFd, buf, 0, buf.length, null);
      return buf.toString('utf8', 0, bytesRead).trim() === executionId;
    } finally {
      fs.closeSync(ttyFd);
    }
  }

  async _run(rawRequestInput, { allowHumanActor = false } = {}) {
    const startedAt = new Date().toISOString();
    const fallbackExecutionId =
      rawRequestInput && typeof rawRequestInput.execution_id === 'string' && rawRequestInput.execution_id.trim()
        ? rawRequestInput.execution_id
        : crypto.randomUUID();

    // A caller (including this class's own executeAsHumanConfirmed) may only supply actor:
    // 'HUMAN' when allowHumanActor is true, which only _run's internal HUMAN-confirmed call site
    // sets — createToolExecutionRequest itself always rejects 'HUMAN' from raw external input.
    if (!allowHumanActor && rawRequestInput && rawRequestInput.actor === 'HUMAN') {
      return this._finish({
        executionId: fallbackExecutionId,
        toolId: rawRequestInput?.tool_id ?? null,
        agentRunId: rawRequestInput?.agent_run_id ?? null,
        startedAt,
        attempts: 0,
        result: {
          execution_id: fallbackExecutionId,
          tool_id: rawRequestInput?.tool_id ?? null,
          tool_version: null,
          side_effect_level: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_REQUEST}: actor 'HUMAN' cannot be requested through execute() — use executeAsHumanConfirmed()`],
          warnings: [],
        },
      });
    }

    let request;
    try {
      request = allowHumanActor
        ? this._createHumanConfirmedRequest(rawRequestInput)
        : createToolExecutionRequest(rawRequestInput);
    } catch (e) {
      return this._finish({
        executionId: fallbackExecutionId,
        toolId: rawRequestInput?.tool_id ?? null,
        agentRunId: rawRequestInput?.agent_run_id ?? null,
        startedAt,
        attempts: 0,
        result: {
          execution_id: fallbackExecutionId,
          tool_id: rawRequestInput?.tool_id ?? null,
          tool_version: null,
          side_effect_level: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_REQUEST}: ${e.message}`],
          warnings: [],
        },
      });
    }

    // -- Deny by default: the tool must be explicitly registered --
    let tool;
    try {
      tool = this._registry.get(request.tool_id);
    } catch (e) {
      return this._finish({
        executionId: request.execution_id,
        toolId: request.tool_id,
        agentRunId: request.agent_run_id,
        startedAt,
        attempts: 0,
        input: request.input,
        actorOverride: request.actor,
        result: {
          execution_id: request.execution_id,
          tool_id: request.tool_id,
          tool_version: null,
          side_effect_level: null,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.UNKNOWN_TOOL}: ${e.message}`],
          warnings: [],
        },
      });
    }

    // -- Permission check: deny by default --
    if (!tool.allowedActors.includes(request.actor)) {
      const isHumanOnly = tool.allowedActors.length === 1 && tool.allowedActors[0] === 'HUMAN';
      return this._finish({
        executionId: request.execution_id,
        toolId: tool.tool_id,
        agentRunId: request.agent_run_id,
        startedAt,
        attempts: 0,
        input: request.input,
        actorOverride: request.actor,
        result: {
          execution_id: request.execution_id,
          tool_id: tool.tool_id,
          tool_version: tool.version,
          side_effect_level: tool.side_effect_level,
          status: RESULT_STATUS.BLOCKED,
          block_reason: isHumanOnly ? BLOCK_REASON.HUMAN_APPROVAL_REQUIRED : BLOCK_REASON.PERMISSION_DENIED,
          warnings: [],
        },
      });
    }

    // -- Input validation: tool input is untrusted --
    let validatedInput;
    try {
      validatedInput = tool.validateInput(request.input);
    } catch (e) {
      return this._finish({
        executionId: request.execution_id,
        toolId: tool.tool_id,
        agentRunId: request.agent_run_id,
        startedAt,
        attempts: 0,
        input: request.input,
        actorOverride: request.actor,
        result: {
          execution_id: request.execution_id,
          tool_id: tool.tool_id,
          tool_version: tool.version,
          side_effect_level: tool.side_effect_level,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_INPUT}: ${e.message}`],
          warnings: [],
        },
      });
    }

    // -- Bounded execution: timeout + bounded retry, technical failures only --
    const timeoutMs = request.limits.timeoutMs ?? tool.timeoutMs;
    const maxAttempts = tool.retryPolicy.maxRetries + 1;
    let candidate;
    let lastError = null;
    let attemptsUsed = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      attemptsUsed += 1;
      try {
        candidate = await this._executeWithTimeout(tool, validatedInput, request, timeoutMs);
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        if (!(e instanceof ToolTechnicalError) && e.__isToolTimeout !== true) {
          break; // non-retryable failure: fail immediately, no further attempts.
        }
        // technical/timeout failure: loop continues if attempts remain.
      }
    }

    if (lastError) {
      const isTimeout = lastError.__isToolTimeout === true;
      const exhaustedRetries = (lastError instanceof ToolTechnicalError || isTimeout) && attemptsUsed >= maxAttempts;
      const result = isTimeout
        ? {
            execution_id: request.execution_id,
            tool_id: tool.tool_id,
            tool_version: tool.version,
            side_effect_level: tool.side_effect_level,
            status: RESULT_STATUS.BLOCKED,
            block_reason: exhaustedRetries && maxAttempts > 1
              ? `${BLOCK_REASON.MAX_RETRIES_EXCEEDED}: ${BLOCK_REASON.EXECUTION_TIMEOUT}`
              : BLOCK_REASON.EXECUTION_TIMEOUT,
            warnings: [],
          }
        : {
            execution_id: request.execution_id,
            tool_id: tool.tool_id,
            tool_version: tool.version,
            side_effect_level: tool.side_effect_level,
            status: RESULT_STATUS.FAILED,
            errors: [
              exhaustedRetries
                ? `${BLOCK_REASON.MAX_RETRIES_EXCEEDED}: ${lastError.message}`
                : `${FAILURE_REASON.TOOL_THREW}: ${lastError.message}`,
            ],
            warnings: [],
          };
      return this._finish({
        executionId: request.execution_id,
        toolId: tool.tool_id,
        agentRunId: request.agent_run_id,
        startedAt,
        attempts: attemptsUsed,
        input: request.input,
        actorOverride: request.actor,
        result,
      });
    }

    // -- Output validation: tool output is untrusted --
    let validated;
    try {
      validated = validateToolResult(candidate, request, tool);
    } catch (e) {
      return this._finish({
        executionId: request.execution_id,
        toolId: tool.tool_id,
        agentRunId: request.agent_run_id,
        startedAt,
        attempts: attemptsUsed,
        input: request.input,
        actorOverride: request.actor,
        result: {
          execution_id: request.execution_id,
          tool_id: tool.tool_id,
          tool_version: tool.version,
          side_effect_level: tool.side_effect_level,
          status: RESULT_STATUS.FAILED,
          errors: [`${FAILURE_REASON.INVALID_OUTPUT}: ${e.message}`],
          warnings: [],
        },
      });
    }

    return this._finish({
      executionId: request.execution_id,
      toolId: tool.tool_id,
      agentRunId: request.agent_run_id,
      startedAt,
      attempts: attemptsUsed,
      actorOverride: request.actor,
      result: validated,
    });
  }

  /** Builds a request for the HUMAN-confirmed path without ever trusting a caller-supplied
   * actor — the object is reconstructed here with actor hardcoded, bypassing
   * createToolExecutionRequest's own 'AGENT'/'SYSTEM'-only restriction intentionally, since this
   * is the one legitimate path a real confirmation has already gated. */
  _createHumanConfirmedRequest(rawRequestInput) {
    const { createToolExecutionRequest: create } = require('./ToolExecutionRequest');
    // Reuse the same validation logic by temporarily presenting actor as 'AGENT' for shape
    // validation, then overriding it back to 'HUMAN' — no field from rawRequestInput can
    // influence this override.
    const shapeChecked = create({ ...rawRequestInput, actor: 'AGENT' });
    return Object.freeze({ ...shapeChecked, actor: 'HUMAN' });
  }

  async _executeWithTimeout(tool, validatedInput, request, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('tool execution timed out');
        err.__isToolTimeout = true;
        reject(err);
      }, timeoutMs);
    });
    try {
      return await Promise.race([Promise.resolve().then(() => tool.execute(validatedInput, request)), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  _finish({ executionId, toolId, agentRunId, startedAt, attempts, result, actorOverride, input }) {
    const finishedAt = new Date().toISOString();
    const actor = actorOverride ?? 'AGENT';

    this._persistToolExecution({
      execution_id: executionId,
      agent_run_id: agentRunId ?? null,
      tool_id: toolId,
      tool_version: result.tool_version,
      actor,
      input: input ?? null,
      status: result.status,
      output: result.output,
      errors: result.errors,
      block_reason: result.block_reason,
      side_effect_level: result.side_effect_level,
      attempts,
      retried: attempts > 1,
      started_at: startedAt,
      finished_at: finishedAt,
    });

    this._appendAudit({
      actor,
      actorName: toolId || 'tool-runtime',
      action: 'TOOL_EXECUTION',
      opportunityId: null,
      previousState: null,
      newState: null,
      note:
        `execution_id=${executionId} agent_run_id=${agentRunId ?? 'unknown'} tool_id=${toolId ?? 'none'} ` +
        `status=${result.status} attempts=${attempts} side_effect_level=${result.side_effect_level ?? 'unknown'}`,
    });

    return { ...result, execution_id: result.execution_id ?? executionId, started_at: startedAt, finished_at: finishedAt, attempts };
  }
}

module.exports = { ToolRuntime };
