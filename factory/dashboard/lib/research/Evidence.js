'use strict';

/**
 * Evidence — one specific, sourced factual observation (this phase's item 10/11). Evidence is a
 * *claim traced to a source*, not the factory's own belief — it is explicitly distinct from a
 * Finding (a synthesis across evidence) and from an Inference/Hypothesis (analysis layered on
 * top). `source_id` here is only shape-checked; the cross-reference check ("does this source_id
 * actually exist?") happens at ResearchRecord validation, where the full source list is known.
 */

const { EVIDENCE_TYPES, CONFIDENCE_LEVELS, ResearchValidationError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * @param {object} input
 *   evidence_id: string (required)
 *   source_id: string (required)
 *   claim: string (required, non-empty) — untrusted source content, stored verbatim as data
 *   evidence_type: one of EVIDENCE_TYPES (required)
 *   locator: string (required, non-empty) — lets a reviewer find this claim in the source
 *   extracted_at: ISO date string (required)
 *   confidence: one of CONFIDENCE_LEVELS (required)
 */
function createEvidence(input) {
  if (!isPlainObject(input)) {
    throw new ResearchValidationError('Evidence input must be a plain object');
  }
  const { evidence_id, source_id, claim, evidence_type, locator, extracted_at, confidence } = input;

  if (typeof evidence_id !== 'string' || evidence_id.trim() === '') {
    throw new ResearchValidationError('Evidence requires a non-empty string evidence_id');
  }
  if (typeof source_id !== 'string' || source_id.trim() === '') {
    throw new ResearchValidationError('Evidence requires a non-empty string source_id');
  }
  if (typeof claim !== 'string' || claim.trim() === '') {
    throw new ResearchValidationError('Evidence requires a non-empty string claim');
  }
  if (typeof evidence_type !== 'string' || !EVIDENCE_TYPES.includes(evidence_type)) {
    throw new ResearchValidationError(`Evidence.evidence_type must be one of ${EVIDENCE_TYPES.join(', ')}, got ${JSON.stringify(evidence_type)}`);
  }
  if (typeof locator !== 'string' || locator.trim() === '') {
    throw new ResearchValidationError('Evidence requires a non-empty string locator (how a reviewer finds this in the source)');
  }
  if (!isIsoDateString(extracted_at)) {
    throw new ResearchValidationError('Evidence requires a valid ISO date string extracted_at');
  }
  if (typeof confidence !== 'string' || !CONFIDENCE_LEVELS.includes(confidence)) {
    throw new ResearchValidationError(`Evidence.confidence must be one of ${CONFIDENCE_LEVELS.join(', ')}, got ${JSON.stringify(confidence)}`);
  }

  return Object.freeze({ evidence_id, source_id, claim, evidence_type, locator, extracted_at, confidence });
}

module.exports = { createEvidence };
