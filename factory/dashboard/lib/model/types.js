'use strict';

/**
 * Shared constants for the Model Router (factory/docs/08-MODEL-ROUTING.md,
 * factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md Phase 2). Same pattern as
 * factory/dashboard/lib/agent/types.js — frozen objects, no enum library.
 */

const RESULT_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
});

const RESULT_STATUSES = Object.freeze(Object.values(RESULT_STATUS));

// Deliberately small vocabulary — doc 08 §10's own example is three capabilities; more are added
// only when a concrete Phase 2+ requirement needs them, per this phase's explicit instruction not
// to build a sophisticated capability taxonomy up front.
const CAPABILITIES = Object.freeze(['text_generation', 'structured_output', 'long_context']);

// Same reserved-key rule as the Agent Runtime's AgentResult — model output is untrusted and must
// never be able to look like an authorization claim.
const RESERVED_OUTPUT_KEYS = Object.freeze(['actor', 'lifecycle_state', 'approved_by']);

const FAILURE_REASON = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNKNOWN_PROVIDER: 'UNKNOWN_PROVIDER',
});

const BLOCK_REASON = Object.freeze({
  NO_MODEL_SUPPORTS_REQUIRED_CAPABILITIES: 'NO_MODEL_SUPPORTS_REQUIRED_CAPABILITIES',
  NO_AVAILABLE_MODEL: 'NO_AVAILABLE_MODEL',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  MAX_FALLBACK_ATTEMPTS_EXCEEDED: 'MAX_FALLBACK_ATTEMPTS_EXCEEDED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
});

class ModelRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelRequestError';
  }
}

class ModelResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelResponseError';
  }
}

class UnknownProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownProviderError';
  }
}

class DuplicateProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateProviderError';
  }
}

class UnknownModelError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownModelError';
  }
}

class DuplicateModelError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateModelError';
  }
}

/** A thrown error a provider adapter uses to signal a *technical* execution failure (provider
 * unavailable, transport error) — the only kind of failure the router may fall back on. Anything
 * else a provider throws is still caught and treated the same way (fallback-eligible), but
 * provider adapters are expected to prefer this class so intent is explicit. */
class ProviderTechnicalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderTechnicalError';
  }
}

module.exports = {
  RESULT_STATUS,
  RESULT_STATUSES,
  CAPABILITIES,
  RESERVED_OUTPUT_KEYS,
  FAILURE_REASON,
  BLOCK_REASON,
  ModelRequestError,
  ModelResponseError,
  UnknownProviderError,
  DuplicateProviderError,
  UnknownModelError,
  DuplicateModelError,
  ProviderTechnicalError,
};
