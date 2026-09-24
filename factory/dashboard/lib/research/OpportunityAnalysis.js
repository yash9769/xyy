'use strict';

/**
 * OpportunityAnalysis — the reasoning layer from evidence toward an opportunity hypothesis (this
 * phase's item 13). Every claim in this record that isn't a literal evidence quote must carry
 * `evidence_ids` pointing back to the ResearchRecord it was built from, checked against that
 * record's real evidence — an inference with no cited evidence is rejected, per this phase's item
 * 11 ("An inference must identify the evidence supporting it").
 *
 * `opportunity_hypothesis` and `differentiation_hypothesis` are explicitly typed as hypotheses,
 * never presented as proven fact — this module cannot be used to claim commercial success.
 */

const { MARKET_SIGNAL_STRENGTHS, SCHEMA_VERSION, ResearchValidationError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateClaimGroup(value, label, evidenceIds, { requireEvidence = true } = {}) {
  if (!isPlainObject(value)) {
    throw new ResearchValidationError(`${label} must be an object`);
  }
  if (typeof value.statement !== 'string' || value.statement.trim() === '') {
    throw new ResearchValidationError(`${label}.statement must be a non-empty string`);
  }
  if (!Array.isArray(value.evidence_ids)) {
    throw new ResearchValidationError(`${label}.evidence_ids must be an array`);
  }
  if (requireEvidence && value.evidence_ids.length === 0) {
    throw new ResearchValidationError(`${label} requires at least one evidence_id — an inference must identify the evidence supporting it`);
  }
  for (const id of value.evidence_ids) {
    if (!evidenceIds.has(id)) {
      throw new ResearchValidationError(`${label} references evidence_id '${id}' which does not exist in the given ResearchRecord`);
    }
  }
}

function validateClaimGroupArray(list, label, evidenceIds) {
  if (!Array.isArray(list)) {
    throw new ResearchValidationError(`${label} must be an array`);
  }
  list.forEach((item, i) => validateClaimGroup(item, `${label}[${i}]`, evidenceIds, { requireEvidence: false }));
}

/**
 * @param {object} input - see field-by-field validation below
 * @param {object} researchRecord - the ResearchRecord this analysis is built from; used to
 *   cross-check every evidence_id actually exists
 */
function createOpportunityAnalysis(input, researchRecord) {
  if (!isPlainObject(input)) {
    throw new ResearchValidationError('OpportunityAnalysis input must be a plain object');
  }
  if (!researchRecord || !Array.isArray(researchRecord.evidence)) {
    throw new ResearchValidationError('createOpportunityAnalysis requires the ResearchRecord it was built from');
  }
  const evidenceIds = new Set(researchRecord.evidence.map((e) => e.evidence_id));

  const {
    analysis_id,
    opportunity_id,
    evidence_backed_observations,
    user_problem,
    existing_alternatives,
    differentiation_hypothesis,
    market_signal,
    risks,
    unknowns,
    opportunity_hypothesis,
    agent_metadata,
  } = input;

  if (typeof analysis_id !== 'string' || analysis_id.trim() === '') {
    throw new ResearchValidationError('OpportunityAnalysis requires a non-empty string analysis_id');
  }
  if (opportunity_id !== undefined && opportunity_id !== null && typeof opportunity_id !== 'string') {
    throw new ResearchValidationError('OpportunityAnalysis.opportunity_id must be a string or null');
  }

  validateClaimGroupArray(evidence_backed_observations || [], 'OpportunityAnalysis.evidence_backed_observations', evidenceIds);
  validateClaimGroup(user_problem, 'OpportunityAnalysis.user_problem', evidenceIds, { requireEvidence: true });
  validateClaimGroupArray(existing_alternatives || [], 'OpportunityAnalysis.existing_alternatives', evidenceIds);
  validateClaimGroup(differentiation_hypothesis, 'OpportunityAnalysis.differentiation_hypothesis', evidenceIds, { requireEvidence: false });
  validateClaimGroup(market_signal, 'OpportunityAnalysis.market_signal', evidenceIds, { requireEvidence: true });
  if (typeof market_signal.strength !== 'string' || !MARKET_SIGNAL_STRENGTHS.includes(market_signal.strength)) {
    throw new ResearchValidationError(`OpportunityAnalysis.market_signal.strength must be one of ${MARKET_SIGNAL_STRENGTHS.join(', ')}`);
  }
  validateClaimGroup(opportunity_hypothesis, 'OpportunityAnalysis.opportunity_hypothesis', evidenceIds, { requireEvidence: false });

  if (!Array.isArray(risks) || risks.some((r) => typeof r !== 'string')) {
    throw new ResearchValidationError('OpportunityAnalysis.risks must be an array of strings');
  }
  if (!Array.isArray(unknowns) || unknowns.some((u) => typeof u !== 'string')) {
    throw new ResearchValidationError('OpportunityAnalysis.unknowns must be an array of strings');
  }
  if (!isPlainObject(agent_metadata)) {
    throw new ResearchValidationError('OpportunityAnalysis requires an agent_metadata object');
  }

  return Object.freeze({
    analysis_id,
    research_id: researchRecord.research_id,
    opportunity_id: opportunity_id ?? null,
    evidence_backed_observations: Object.freeze((evidence_backed_observations || []).map((o) => Object.freeze({ ...o, evidence_ids: Object.freeze([...o.evidence_ids]) }))),
    user_problem: Object.freeze({ ...user_problem, evidence_ids: Object.freeze([...user_problem.evidence_ids]) }),
    existing_alternatives: Object.freeze((existing_alternatives || []).map((a) => Object.freeze({ ...a, evidence_ids: Object.freeze([...a.evidence_ids]) }))),
    differentiation_hypothesis: Object.freeze({ ...differentiation_hypothesis, type: 'INFERENCE', evidence_ids: Object.freeze([...differentiation_hypothesis.evidence_ids]) }),
    market_signal: Object.freeze({ ...market_signal, evidence_ids: Object.freeze([...market_signal.evidence_ids]) }),
    risks: Object.freeze([...risks]),
    unknowns: Object.freeze([...unknowns]),
    opportunity_hypothesis: Object.freeze({ ...opportunity_hypothesis, type: 'HYPOTHESIS', evidence_ids: Object.freeze([...opportunity_hypothesis.evidence_ids]) }),
    disclaimer: 'This analysis is a research-derived hypothesis. It does not prove commercial viability or success; it requires human judgment and approval before any resources are committed.',
    agent_metadata: Object.freeze({ ...agent_metadata }),
    created_at: new Date().toISOString(),
    schema_version: SCHEMA_VERSION,
  });
}

module.exports = { createOpportunityAnalysis };
