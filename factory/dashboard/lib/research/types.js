'use strict';

/**
 * Shared constants for the Research Factory (factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md
 * Phase 4). Same pattern as the agent/model/tool `types.js` files — frozen objects, no enum
 * library.
 *
 * Confidence levels are deliberately the *same* vocabulary already used by
 * schemas/opportunity.schema.json's `evidence[].type` field (VERIFIED_FACT/INFERRED/ESTIMATE/
 * OPINION) rather than a new one — this phase's own "Core Principle" (never collapse SOURCE /
 * FACT / EVIDENCE / INFERENCE / HYPOTHESIS into one generic field) is exactly what that existing
 * enum was already trying to express, so it is reused rather than duplicated.
 */

const SOURCE_TYPES = Object.freeze([
  'WEB_PAGE',
  'SEARCH_RESULT',
  'REDDIT_POST',
  'GITHUB_REPOSITORY',
  'PLAY_STORE_REVIEW',
  'DOCUMENT',
  'OTHER',
]);

const EVIDENCE_TYPES = Object.freeze(['OBSERVATION', 'REPORTED_CLAIM', 'STATISTIC', 'QUOTE', 'OTHER']);

// Reused verbatim from schemas/opportunity.schema.json's evidence[].type enum.
const CONFIDENCE_LEVELS = Object.freeze(['VERIFIED_FACT', 'INFERRED', 'ESTIMATE', 'OPINION']);

const MARKET_SIGNAL_STRENGTHS = Object.freeze(['weak', 'moderate', 'strong']);

const SCHEMA_VERSION = '1.0.0';

const RESULT_STATUS = Object.freeze({ SUCCESS: 'SUCCESS', FAILED: 'FAILED', BLOCKED: 'BLOCKED' });

const BLOCK_REASON = Object.freeze({
  RESEARCH_BUDGET_EXHAUSTED: 'RESEARCH_BUDGET_EXHAUSTED',
  SEARCH_PROVIDER_NOT_CONFIGURED: 'SEARCH_PROVIDER_NOT_CONFIGURED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
});

class ResearchValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResearchValidationError';
  }
}

module.exports = {
  SOURCE_TYPES,
  EVIDENCE_TYPES,
  CONFIDENCE_LEVELS,
  MARKET_SIGNAL_STRENGTHS,
  SCHEMA_VERSION,
  RESULT_STATUS,
  BLOCK_REASON,
  ResearchValidationError,
};
