'use strict';

/**
 * ResearchRecord — the structured body of research for one opportunity (this phase's item 12).
 * This is also where provenance is *enforced*, not just documented: every evidence item must
 * reference a source that actually exists in this same record, and every finding must reference
 * evidence that actually exists — a record with broken references fails validation outright
 * (this phase's item 17).
 */

const { createSource } = require('./Source');
const { createEvidence } = require('./Evidence');
const { SCHEMA_VERSION, ResearchValidationError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertUniqueIds(items, idField, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[idField])) {
      throw new ResearchValidationError(`${label} contains duplicate ${idField} '${item[idField]}'`);
    }
    seen.add(item[idField]);
  }
}

/**
 * @param {object} input
 *   research_id: string (required)
 *   opportunity_id: string | null
 *   sources: array of Source-shaped objects (required, may be empty)
 *   evidence: array of Evidence-shaped objects (required, may be empty)
 *   findings: [{ finding_id, statement, supporting_evidence_ids: string[] }]
 *   competitors / user_pains / existing_solutions / market_signals / risks / unknowns /
 *     research_questions: string[] (each optional, default [])
 *   agent_metadata: plain object (required) — who/what produced this
 *   incomplete: boolean (default false) — true when a research bound was hit before completion
 */
function createResearchRecord(input) {
  if (!isPlainObject(input)) {
    throw new ResearchValidationError('ResearchRecord input must be a plain object');
  }
  const {
    research_id,
    opportunity_id,
    sources,
    evidence,
    findings,
    competitors,
    user_pains,
    existing_solutions,
    market_signals,
    risks,
    unknowns,
    research_questions,
    agent_metadata,
    incomplete,
    created_at,
    updated_at,
  } = input;

  if (typeof research_id !== 'string' || research_id.trim() === '') {
    throw new ResearchValidationError('ResearchRecord requires a non-empty string research_id');
  }
  if (opportunity_id !== undefined && opportunity_id !== null && typeof opportunity_id !== 'string') {
    throw new ResearchValidationError('ResearchRecord.opportunity_id must be a string or null');
  }
  if (!Array.isArray(sources)) {
    throw new ResearchValidationError('ResearchRecord.sources must be an array (may be empty)');
  }
  if (!Array.isArray(evidence)) {
    throw new ResearchValidationError('ResearchRecord.evidence must be an array (may be empty)');
  }

  const builtSources = sources.map((s) => createSource(s));
  const builtEvidence = evidence.map((e) => createEvidence(e));
  assertUniqueIds(builtSources, 'source_id', 'ResearchRecord.sources');
  assertUniqueIds(builtEvidence, 'evidence_id', 'ResearchRecord.evidence');

  // Provenance enforcement: every evidence.source_id must reference a source in this record.
  const sourceIds = new Set(builtSources.map((s) => s.source_id));
  for (const e of builtEvidence) {
    if (!sourceIds.has(e.source_id)) {
      throw new ResearchValidationError(`Evidence '${e.evidence_id}' references source_id '${e.source_id}' which does not exist in sources[]`);
    }
  }

  const builtFindings = Array.isArray(findings) ? findings : [];
  if (findings !== undefined && !Array.isArray(findings)) {
    throw new ResearchValidationError('ResearchRecord.findings must be an array when provided');
  }
  const evidenceIds = new Set(builtEvidence.map((e) => e.evidence_id));
  const seenFindingIds = new Set();
  for (const finding of builtFindings) {
    if (!isPlainObject(finding) || typeof finding.finding_id !== 'string' || finding.finding_id.trim() === '') {
      throw new ResearchValidationError('Each ResearchRecord.findings entry requires a non-empty finding_id');
    }
    if (seenFindingIds.has(finding.finding_id)) {
      throw new ResearchValidationError(`ResearchRecord.findings contains duplicate finding_id '${finding.finding_id}'`);
    }
    seenFindingIds.add(finding.finding_id);
    if (typeof finding.statement !== 'string' || finding.statement.trim() === '') {
      throw new ResearchValidationError(`Finding '${finding.finding_id}' requires a non-empty statement`);
    }
    if (!Array.isArray(finding.supporting_evidence_ids) || finding.supporting_evidence_ids.length === 0) {
      throw new ResearchValidationError(`Finding '${finding.finding_id}' requires a non-empty supporting_evidence_ids array — a finding must be traceable to evidence`);
    }
    for (const id of finding.supporting_evidence_ids) {
      if (!evidenceIds.has(id)) {
        throw new ResearchValidationError(`Finding '${finding.finding_id}' references evidence_id '${id}' which does not exist in evidence[]`);
      }
    }
  }

  const stringArrayFields = { competitors, user_pains, existing_solutions, market_signals, risks, unknowns, research_questions };
  for (const [key, val] of Object.entries(stringArrayFields)) {
    if (val !== undefined && (!Array.isArray(val) || val.some((v) => typeof v !== 'string'))) {
      throw new ResearchValidationError(`ResearchRecord.${key} must be an array of strings when provided`);
    }
  }

  if (!isPlainObject(agent_metadata)) {
    throw new ResearchValidationError('ResearchRecord requires an agent_metadata object');
  }

  const now = new Date().toISOString();
  return Object.freeze({
    research_id,
    opportunity_id: opportunity_id ?? null,
    sources: Object.freeze(builtSources),
    evidence: Object.freeze(builtEvidence),
    findings: Object.freeze(builtFindings.map((f) => Object.freeze({ ...f, supporting_evidence_ids: Object.freeze([...f.supporting_evidence_ids]) }))),
    competitors: Object.freeze([...(competitors || [])]),
    user_pains: Object.freeze([...(user_pains || [])]),
    existing_solutions: Object.freeze([...(existing_solutions || [])]),
    market_signals: Object.freeze([...(market_signals || [])]),
    risks: Object.freeze([...(risks || [])]),
    unknowns: Object.freeze([...(unknowns || [])]),
    research_questions: Object.freeze([...(research_questions || [])]),
    agent_metadata: Object.freeze({ ...agent_metadata }),
    incomplete: incomplete === true,
    created_at: created_at || now,
    updated_at: updated_at || now,
    schema_version: SCHEMA_VERSION,
  });
}

module.exports = { createResearchRecord };
