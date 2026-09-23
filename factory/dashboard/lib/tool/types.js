'use strict';

/**
 * Shared constants for the Tool Runtime (factory/docs/09-TOOL-ARCHITECTURE.md,
 * factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md Phase 3). Same pattern as
 * factory/dashboard/lib/agent/types.js and factory/dashboard/lib/model/types.js.
 */

const { ACTORS } = require('../stateMachine');

const RESULT_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
});

const RESULT_STATUSES = Object.freeze(Object.values(RESULT_STATUS));

// Doc 09 §11's own vocabulary, used verbatim rather than the smaller placeholder list this
// phase's own instructions suggested as an example — the instructions explicitly say to follow
// the repository documentation when it defines different/more specific names, and it does.
const SIDE_EFFECT_LEVELS = Object.freeze([
  'READ_ONLY',
  'LOCAL_MUTATION',
  'REPOSITORY_MUTATION',
  'EXTERNAL_MUTATION',
  'FINANCIAL',
  'PUBLISHING',
  'DESTRUCTIVE',
]);

// Reuse the factory's one actor vocabulary (factory/dashboard/lib/stateMachine.js) rather than
// inventing a second, incompatible one — this phase's explicit instruction.
const TOOL_ACTORS = ACTORS;

// Same reserved-key rule as AgentResult/ModelResponse — tool output is untrusted and must never
// be able to look like an authorization claim.
const RESERVED_OUTPUT_KEYS = Object.freeze(['actor', 'lifecycle_state', 'approved_by']);

const FAILURE_REASON = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNKNOWN_TOOL: 'UNKNOWN_TOOL',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_OUTPUT: 'INVALID_OUTPUT',
  TOOL_THREW: 'TOOL_THREW',
});

const BLOCK_REASON = Object.freeze({
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  HUMAN_APPROVAL_REQUIRED: 'HUMAN_APPROVAL_REQUIRED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
});

class ToolContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolContractError';
  }
}

class ToolRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolRequestError';
  }
}

class ToolResultError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolResultError';
  }
}

class UnknownToolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownToolError';
  }
}

class DuplicateToolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateToolError';
  }
}

/** Thrown by a tool's execute() to signal a *technical*, retry-eligible failure (analogous to
 * ProviderTechnicalError in the Model Router). Anything else a tool throws is treated as a
 * non-retryable failure. */
class ToolTechnicalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolTechnicalError';
  }
}

module.exports = {
  RESULT_STATUS,
  RESULT_STATUSES,
  SIDE_EFFECT_LEVELS,
  TOOL_ACTORS,
  RESERVED_OUTPUT_KEYS,
  FAILURE_REASON,
  BLOCK_REASON,
  ToolContractError,
  ToolRequestError,
  ToolResultError,
  UnknownToolError,
  DuplicateToolError,
  ToolTechnicalError,
};
