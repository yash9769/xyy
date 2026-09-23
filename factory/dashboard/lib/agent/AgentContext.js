'use strict';

/**
 * AgentContext — the only information an agent receives (factory/docs/07-AGENT-ARCHITECTURE.md
 * §8). Deliberately narrow: no arbitrary global state, no filesystem handle, no shell, no
 * secrets. `input`/`configuration` are plain, JSON-serializable data the caller constructs.
 */

const { AgentContextError } = require('./types');

const DEFAULT_LIMITS = Object.freeze({
  // Wall-clock budget for a single agent.run() call.
  maxDurationMs: 5000,
  // How many times this same agent may be invoked through one AgentRunner instance's lifetime.
  // A coarse, deterministic stand-in for "prevent uncontrolled recursive/repeated execution" —
  // Phase 1 explicitly does not implement a full sandbox or retry/iteration budget (that's a
  // later phase's `max_iterations`/`max_tool_calls`/`max_cost`, per doc 07 §11).
  maxInvocations: 100,
});

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively rejects functions/symbols/undefined-values — JSON.stringify() silently drops these
 * (turning `{fn: () => {}}` into `{}`) rather than throwing, so a round-trip check alone would
 * miss them. This walks the value itself instead of trusting JSON.stringify to fail loudly.
 */
function assertSerializable(value, label) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AgentContextError(`${label} must not contain non-finite numbers`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSerializable(item, `${label}[${i}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, val] of Object.entries(value)) {
      assertSerializable(val, `${label}.${key}`);
    }
    return;
  }
  throw new AgentContextError(`${label} must be JSON-serializable (found ${typeof value})`);
}

/**
 * Builds a frozen, serializable AgentContext. Throws AgentContextError for anything malformed —
 * callers (the AgentRunner) decide how to turn that into a controlled result rather than letting
 * it propagate as an uncaught exception.
 */
function createAgentContext(input) {
  if (!isPlainObject(input)) {
    throw new AgentContextError('AgentContext input must be a plain object');
  }

  const { run_id, agent_id, workflow_id, opportunity_id, input: taskInput, configuration, limits } = input;

  if (typeof run_id !== 'string' || run_id.trim() === '') {
    throw new AgentContextError('AgentContext requires a non-empty string run_id');
  }
  if (typeof agent_id !== 'string' || agent_id.trim() === '') {
    throw new AgentContextError('AgentContext requires a non-empty string agent_id');
  }
  if (workflow_id !== undefined && typeof workflow_id !== 'string') {
    throw new AgentContextError('AgentContext.workflow_id must be a string when provided');
  }
  if (opportunity_id !== undefined && typeof opportunity_id !== 'string') {
    throw new AgentContextError('AgentContext.opportunity_id must be a string when provided');
  }
  if (taskInput !== undefined && !isPlainObject(taskInput)) {
    throw new AgentContextError('AgentContext.input must be a plain object when provided');
  }
  if (configuration !== undefined && !isPlainObject(configuration)) {
    throw new AgentContextError('AgentContext.configuration must be a plain object when provided');
  }
  if (limits !== undefined && !isPlainObject(limits)) {
    throw new AgentContextError('AgentContext.limits must be a plain object when provided');
  }

  const resolvedLimits = { ...DEFAULT_LIMITS, ...(limits || {}) };
  if (!Number.isFinite(resolvedLimits.maxDurationMs) || resolvedLimits.maxDurationMs <= 0) {
    throw new AgentContextError('AgentContext.limits.maxDurationMs must be a positive number');
  }
  if (!Number.isInteger(resolvedLimits.maxInvocations) || resolvedLimits.maxInvocations <= 0) {
    throw new AgentContextError('AgentContext.limits.maxInvocations must be a positive integer');
  }

  const context = {
    run_id,
    agent_id,
    workflow_id: workflow_id ?? null,
    opportunity_id: opportunity_id ?? null,
    input: taskInput ? { ...taskInput } : {},
    configuration: configuration ? { ...configuration } : {},
    limits: resolvedLimits,
  };

  // Guarantee the context is actually serializable, per §2's requirement — rejects functions,
  // symbols, non-finite numbers, etc. in input/configuration (a plain JSON.stringify round-trip
  // is not enough, since it silently drops function-valued properties instead of failing).
  assertSerializable(context.input, 'AgentContext.input');
  assertSerializable(context.configuration, 'AgentContext.configuration');
  try {
    JSON.parse(JSON.stringify(context));
  } catch (e) {
    throw new AgentContextError(`AgentContext must be JSON-serializable: ${e.message}`);
  }

  return Object.freeze(context);
}

module.exports = { createAgentContext, DEFAULT_LIMITS };
