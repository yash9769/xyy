'use strict';

/**
 * Shared constants for the Agent Runtime (factory/docs/07-AGENT-ARCHITECTURE.md,
 * factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md Phase 1). Kept in one small file rather than
 * scattered magic strings, per this module's own "keep it minimal" mandate — no enum library,
 * just frozen objects.
 */

const RESULT_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
});

const RESULT_STATUSES = Object.freeze(Object.values(RESULT_STATUS));

// Reserved keys an agent's `output` must never set — output is evidence, not authority. Nothing
// in this runtime reads these keys as authorization, but rejecting them outright makes the
// invariant ("agent output cannot mutate/impersonate") a checked boundary, not just a convention.
const RESERVED_OUTPUT_KEYS = Object.freeze(['actor', 'lifecycle_state', 'approved_by']);

const FAILURE_REASON = Object.freeze({
  UNKNOWN_AGENT: 'UNKNOWN_AGENT',
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  INVALID_RESULT: 'INVALID_RESULT',
  AGENT_THREW: 'AGENT_THREW',
});

const BLOCK_REASON = Object.freeze({
  RUNNER_INVOCATION_LIMIT_EXCEEDED: 'RUNNER_INVOCATION_LIMIT_EXCEEDED',
  RUN_ID_ALREADY_EXECUTING: 'RUN_ID_ALREADY_EXECUTING',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
});

class AgentContextError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AgentContextError';
  }
}

class AgentResultError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AgentResultError';
  }
}

class UnknownAgentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownAgentError';
  }
}

class DuplicateAgentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateAgentError';
  }
}

module.exports = {
  RESULT_STATUS,
  RESULT_STATUSES,
  RESERVED_OUTPUT_KEYS,
  FAILURE_REASON,
  BLOCK_REASON,
  AgentContextError,
  AgentResultError,
  UnknownAgentError,
  DuplicateAgentError,
};
