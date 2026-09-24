'use strict';

/**
 * Shared constants for the Product Factory (Phase 5). Same pattern as the agent/model/tool/
 * research `types.js` files — frozen objects, no enum library.
 */

const SCHEMA_VERSION = '1.0.0';

const CLAIM_TYPES = Object.freeze(['FACT', 'INFERENCE', 'HYPOTHESIS', 'PRODUCT_DECISION', 'SYSTEM_CONSTRAINT']);

// Reused from research/types.js (schemas/opportunity.schema.json's evidence[].type enum).
const VERIFIED_FACT = 'VERIFIED_FACT';

const PLATFORMS = Object.freeze(['android']);

const DATA_CLASSIFICATIONS = Object.freeze([
  'NONE',
  'PUBLIC',
  'INTERNAL',
  'PERSONAL',
  'SENSITIVE_PERSONAL',
  'FINANCIAL',
  'HEALTH',
  'PRECISE_LOCATION',
  'CREDENTIALS',
]);

// Any of these requires at least one privacy requirement in the specification.
const PRIVACY_RELEVANT_CLASSIFICATIONS = Object.freeze([
  'PERSONAL',
  'SENSITIVE_PERSONAL',
  'FINANCIAL',
  'HEALTH',
  'PRECISE_LOCATION',
  'CREDENTIALS',
]);

// Any of these additionally requires at least one security requirement.
const SENSITIVE_CLASSIFICATIONS = Object.freeze(['SENSITIVE_PERSONAL', 'FINANCIAL', 'HEALTH', 'PRECISE_LOCATION', 'CREDENTIALS']);

// Android runtime ("dangerous") permissions that grant access to user data.
const DANGEROUS_ANDROID_PERMISSIONS = Object.freeze([
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.GET_ACCOUNTS',
  'android.permission.READ_SMS',
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_CALL_LOG',
  'android.permission.WRITE_CALL_LOG',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_PHONE_NUMBERS',
  'android.permission.CALL_PHONE',
  'android.permission.BODY_SENSORS',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.READ_CALENDAR',
  'android.permission.WRITE_CALENDAR',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
]);

// The only artifacts a SYSTEM_CONSTRAINT may cite. A constraint_source must equal one of these
// repository paths, optionally followed by `#<section>`. product.test.js asserts every path exists,
// so a model cannot invent an authority ("system says so") and the list cannot silently rot.
const SYSTEM_CONSTRAINT_SOURCES = Object.freeze([
  'CLAUDE.md',
  'COST_MODEL.md',
  'factory/ARCHITECTURE.md',
  'factory/config/kill-criteria.yaml',
  'factory/config/scoring-weights.yaml',
  'factory/dashboard/lib/stateMachine.js',
  'factory/docs/12-SECURITY.md',
  'factory/docs/26-HUMAN-APPROVALS.md',
  'templates/android',
]);

// Keys that could read as an authorization/actor/lifecycle claim. Never accepted anywhere in model
// output (a superset of the runtimes' RESERVED_OUTPUT_KEYS). `decided_by` is included because it
// is derived from the runtime ProductAgent identity, never from the model.
const AUTHORITY_KEYS = Object.freeze([
  'actor',
  'lifecycle_state',
  'approved_by',
  'approved',
  'approval',
  'human_approval',
  'decided_by',
]);

const FORBIDDEN_OBJECT_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

const SPECIFICATION_STATUS = Object.freeze({ DRAFT: 'DRAFT' });

const DISCLAIMER =
  'This specification is an agent-generated DRAFT. HYPOTHESIS and PRODUCT_DECISION claims are not ' +
  'established facts. It has no authority until a human performs APPROVE_SPEC through the lifecycle ' +
  'state machine; approval applies only to this exact specification_id/version.';

const DEFAULT_LIMITS = Object.freeze({
  maxMvpFeatures: 8,
  maxPostMvpFeatures: 10,
  maxFunctionalRequirements: 25,
  maxNonFunctionalRequirements: 15,
  maxAcceptanceCriteria: 40,
  maxClaimsPerList: 20,
  maxStringListItems: 30,
  maxEvidenceIdsPerClaim: 20,
  maxStatementLength: 2000,
  maxCandidateBytes: 200_000,
  maxDepth: 12,
});

const MODEL_INPUT_LIMITS = Object.freeze({
  maxEvidence: 30,
  maxFindings: 20,
  maxListItems: 10,
  maxTextLength: 500,
  maxInputBytes: 64_000,
});

const TASK_TYPE = 'product_specification_generation';
const REQUIRED_CAPABILITIES = Object.freeze(['text_generation', 'structured_output']);

const RESULT_STATUS = Object.freeze({ SUCCESS: 'SUCCESS', FAILED: 'FAILED', BLOCKED: 'BLOCKED' });

const BLOCK_REASON = Object.freeze({
  SPEC_GENERATION_UNAVAILABLE: 'SPEC_GENERATION_UNAVAILABLE',
});

const VALIDATION_STAGES = Object.freeze([
  'STRUCTURAL',
  'SCHEMA',
  'IDENTITY',
  'EVIDENCE',
  'CLAIM_SEMANTICS',
  'REFERENTIAL',
  'SECURITY_PRIVACY',
  'GOVERNANCE',
  'NORMALIZATION',
]);

const AUDIT_ACTIONS = Object.freeze({
  GENERATED: 'PRODUCT_SPECIFICATION_GENERATED',
  VALIDATED: 'PRODUCT_SPECIFICATION_VALIDATED',
  REJECTED: 'PRODUCT_SPECIFICATION_REJECTED',
  PERSISTED: 'PRODUCT_SPECIFICATION_PERSISTED',
});

class ProductValidationError extends Error {
  constructor(message, violations = []) {
    super(message);
    this.name = 'ProductValidationError';
    this.violations = violations;
  }
}

class ProductPersistenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductPersistenceError';
  }
}

module.exports = {
  SCHEMA_VERSION,
  CLAIM_TYPES,
  VERIFIED_FACT,
  PLATFORMS,
  DATA_CLASSIFICATIONS,
  PRIVACY_RELEVANT_CLASSIFICATIONS,
  SENSITIVE_CLASSIFICATIONS,
  DANGEROUS_ANDROID_PERMISSIONS,
  SYSTEM_CONSTRAINT_SOURCES,
  AUTHORITY_KEYS,
  FORBIDDEN_OBJECT_KEYS,
  SPECIFICATION_STATUS,
  DISCLAIMER,
  DEFAULT_LIMITS,
  MODEL_INPUT_LIMITS,
  TASK_TYPE,
  REQUIRED_CAPABILITIES,
  RESULT_STATUS,
  BLOCK_REASON,
  VALIDATION_STAGES,
  AUDIT_ACTIONS,
  ProductValidationError,
  ProductPersistenceError,
};
