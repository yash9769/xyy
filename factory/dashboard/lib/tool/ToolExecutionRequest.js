'use strict';

/**
 * ToolExecutionRequest — what an agent (or system process) is asking the Tool Runtime to do
 * (doc 09 §2, this phase's item 9). Deliberately narrow: no secrets, no arbitrary executable
 * code, and — critically — `actor` here can only ever resolve to 'AGENT' or 'SYSTEM'. There is no
 * way to request HUMAN through this object; ToolRuntime.execute() rejects actor: 'HUMAN' outright
 * regardless of what a caller passes, exactly like the generic `transition` CLI command from
 * Phase 0's remediation. The only path that can produce a HUMAN-actor execution is
 * ToolRuntime.executeAsHumanConfirmed(), which takes no actor field at all (see runtime.js).
 */

const { ToolRequestError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSerializable(value, label) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ToolRequestError(`${label} must not contain non-finite numbers`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSerializable(item, `${label}[${i}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, val] of Object.entries(value)) assertSerializable(val, `${label}.${key}`);
    return;
  }
  throw new ToolRequestError(`${label} must be JSON-serializable (found ${typeof value})`);
}

/**
 * @param {object} input
 *   execution_id: string (required)
 *   agent_run_id: string (required)
 *   tool_id: string (required)
 *   actor: 'AGENT' | 'SYSTEM' (required — 'HUMAN' is explicitly rejected here; see file header)
 *   input: plain object (required)
 *   workflow_id / opportunity_id: string (optional)
 *   limits: { timeoutMs } (optional override, still bounded by the tool's own declared timeout)
 */
function createToolExecutionRequest(input) {
  if (!isPlainObject(input)) {
    throw new ToolRequestError('ToolExecutionRequest input must be a plain object');
  }
  const { execution_id, agent_run_id, tool_id, actor, input: toolInput, workflow_id, opportunity_id, limits } = input;

  if (typeof execution_id !== 'string' || execution_id.trim() === '') {
    throw new ToolRequestError('ToolExecutionRequest requires a non-empty string execution_id');
  }
  if (typeof agent_run_id !== 'string' || agent_run_id.trim() === '') {
    throw new ToolRequestError('ToolExecutionRequest requires a non-empty string agent_run_id');
  }
  if (typeof tool_id !== 'string' || tool_id.trim() === '') {
    throw new ToolRequestError('ToolExecutionRequest requires a non-empty string tool_id');
  }
  if (actor !== 'AGENT' && actor !== 'SYSTEM') {
    throw new ToolRequestError(
      `ToolExecutionRequest.actor must be 'AGENT' or 'SYSTEM' (got ${JSON.stringify(actor)}) — a HUMAN-actor ` +
      `execution cannot be requested through this object; see ToolRuntime.executeAsHumanConfirmed()`,
    );
  }
  if (toolInput !== undefined && !isPlainObject(toolInput)) {
    throw new ToolRequestError('ToolExecutionRequest.input must be a plain object when provided');
  }
  if (workflow_id !== undefined && typeof workflow_id !== 'string') {
    throw new ToolRequestError('ToolExecutionRequest.workflow_id must be a string when provided');
  }
  if (opportunity_id !== undefined && typeof opportunity_id !== 'string') {
    throw new ToolRequestError('ToolExecutionRequest.opportunity_id must be a string when provided');
  }
  if (limits !== undefined) {
    if (!isPlainObject(limits) || (limits.timeoutMs !== undefined && (!Number.isFinite(limits.timeoutMs) || limits.timeoutMs <= 0))) {
      throw new ToolRequestError('ToolExecutionRequest.limits.timeoutMs must be a positive number when provided');
    }
  }

  const request = {
    execution_id,
    agent_run_id,
    tool_id,
    actor,
    input: toolInput ? { ...toolInput } : {},
    workflow_id: workflow_id ?? null,
    opportunity_id: opportunity_id ?? null,
    limits: limits ? { ...limits } : {},
  };

  assertSerializable(request.input, 'ToolExecutionRequest.input');

  return Object.freeze(request);
}

module.exports = { createToolExecutionRequest };
