'use strict';

/**
 * Claim — the atomic, attributable statement of a ProductSpecification. Generalizes
 * research/OpportunityAnalysis.js's validateClaimGroup() with an explicit claim_type:
 *
 *   FACT              evidence required; every cited evidence item must be VERIFIED_FACT
 *   INFERENCE         evidence required (any confidence)
 *   HYPOTHESIS        evidence optional; stays typed HYPOTHESIS, never presented as fact
 *   PRODUCT_DECISION  evidence optional; rationale required; decided_by required and set only from
 *                     the runtime agent identity, never from model output
 *   SYSTEM_CONSTRAINT constraint_source required and must cite an allowlisted factory artifact
 *
 * An unsupported FACT/INFERENCE is a violation that rejects the whole specification. It is never
 * downgraded to another claim type.
 */

const {
  CLAIM_TYPES,
  VERIFIED_FACT,
  SYSTEM_CONSTRAINT_SOURCES,
  ProductValidationError,
} = require('./types');

function violation(stage, code, path, message) {
  return { stage, code, path, message };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isAllowedConstraintSource(source) {
  if (!isNonEmptyString(source)) return false;
  return SYSTEM_CONSTRAINT_SOURCES.some((allowed) => source === allowed || source.startsWith(`${allowed}#`));
}

/**
 * Evidence checks for any list of evidence ids (claims and metrics). `evidenceById` is a Map of
 * the one ResearchRecord this specification is built from, so ids from any other record fail.
 */
function checkEvidenceIds(evidenceIds, evidenceById, path) {
  const out = [];
  if (!Array.isArray(evidenceIds)) {
    out.push(violation('EVIDENCE', 'EVIDENCE_IDS_NOT_ARRAY', path, 'evidence_ids must be an array'));
    return out;
  }
  const seen = new Set();
  evidenceIds.forEach((id, i) => {
    const itemPath = `${path}[${i}]`;
    if (!isNonEmptyString(id)) {
      out.push(violation('EVIDENCE', 'EVIDENCE_ID_MALFORMED', itemPath, 'evidence id must be a non-empty string'));
      return;
    }
    if (seen.has(id)) {
      out.push(violation('EVIDENCE', 'EVIDENCE_ID_DUPLICATE', itemPath, `evidence id '${id}' is referenced more than once`));
      return;
    }
    seen.add(id);
    if (!evidenceById.has(id)) {
      out.push(violation('EVIDENCE', 'EVIDENCE_ID_NOT_FOUND', itemPath, `evidence id '${id}' does not exist in this specification's ResearchRecord`));
    }
  });
  return out;
}

function checkClaimEvidence(claim, evidenceById, path) {
  const out = checkEvidenceIds(claim.evidence_ids, evidenceById, `${path}.evidence_ids`);
  if (out.length > 0) return out;

  const ids = claim.evidence_ids;
  if ((claim.claim_type === 'FACT' || claim.claim_type === 'INFERENCE') && ids.length === 0) {
    out.push(violation('EVIDENCE', `${claim.claim_type}_WITHOUT_EVIDENCE`, path, `${claim.claim_type} requires at least one evidence id`));
  }
  if (claim.claim_type === 'FACT') {
    for (const id of ids) {
      const confidence = evidenceById.get(id).confidence;
      if (confidence !== VERIFIED_FACT) {
        out.push(violation('EVIDENCE', 'FACT_EVIDENCE_NOT_VERIFIED', path, `FACT cites evidence '${id}' whose confidence is '${confidence}', not ${VERIFIED_FACT}`));
      }
    }
  }
  return out;
}

/**
 * @param {object} options
 *   requireDecidedBy: true for a finalized claim (runtime identity already applied); false for a
 *     model candidate, which must not carry decided_by at all (see validation.js GOVERNANCE).
 */
function checkClaimSemantics(claim, path, { requireDecidedBy }) {
  const out = [];
  if (!isNonEmptyString(claim.statement)) {
    out.push(violation('CLAIM_SEMANTICS', 'STATEMENT_EMPTY', `${path}.statement`, 'statement must be a non-empty string'));
  }
  if (!CLAIM_TYPES.includes(claim.claim_type)) {
    out.push(violation('CLAIM_SEMANTICS', 'CLAIM_TYPE_INVALID', `${path}.claim_type`, `claim_type must be one of ${CLAIM_TYPES.join(', ')}`));
    return out;
  }

  const hasConstraintSource = claim.constraint_source !== undefined && claim.constraint_source !== null;
  if (claim.claim_type === 'SYSTEM_CONSTRAINT') {
    if (!isAllowedConstraintSource(claim.constraint_source)) {
      out.push(violation(
        'CLAIM_SEMANTICS',
        'CONSTRAINT_SOURCE_INVALID',
        `${path}.constraint_source`,
        `SYSTEM_CONSTRAINT requires constraint_source naming a real factory artifact: one of ${SYSTEM_CONSTRAINT_SOURCES.join(', ')} (optionally '#section')`,
      ));
    }
  } else if (hasConstraintSource) {
    out.push(violation('CLAIM_SEMANTICS', 'CONSTRAINT_SOURCE_NOT_ALLOWED', `${path}.constraint_source`, 'constraint_source is only valid on SYSTEM_CONSTRAINT claims'));
  }

  const hasDecidedBy = claim.decided_by !== undefined && claim.decided_by !== null;
  if (claim.claim_type === 'PRODUCT_DECISION') {
    if (!isNonEmptyString(claim.rationale)) {
      out.push(violation('CLAIM_SEMANTICS', 'PRODUCT_DECISION_WITHOUT_RATIONALE', `${path}.rationale`, 'PRODUCT_DECISION requires a non-empty rationale'));
    }
    if (requireDecidedBy && !isNonEmptyString(claim.decided_by)) {
      out.push(violation('CLAIM_SEMANTICS', 'PRODUCT_DECISION_WITHOUT_DECIDED_BY', `${path}.decided_by`, 'PRODUCT_DECISION requires decided_by (runtime agent identity)'));
    }
  } else if (hasDecidedBy && requireDecidedBy) {
    out.push(violation('CLAIM_SEMANTICS', 'DECIDED_BY_NOT_ALLOWED', `${path}.decided_by`, 'decided_by is only valid on PRODUCT_DECISION claims'));
  }
  return out;
}

function checkClaim(claim, { evidenceById, path = 'claim', requireDecidedBy = true }) {
  if (typeof claim !== 'object' || claim === null || Array.isArray(claim)) {
    return [violation('CLAIM_SEMANTICS', 'CLAIM_NOT_OBJECT', path, 'claim must be an object')];
  }
  const semantic = checkClaimSemantics(claim, path, { requireDecidedBy });
  if (semantic.some((v) => v.code === 'CLAIM_TYPE_INVALID')) return semantic;
  return [...checkClaimEvidence(claim, evidenceById, path), ...semantic];
}

/**
 * Builds a finalized, frozen Claim. Throws ProductValidationError on any violation — this is the
 * defense-in-depth construction check after the staged validation pipeline has already passed.
 */
function createClaim(input, { evidenceById, path = 'claim' } = {}) {
  if (!(evidenceById instanceof Map)) {
    throw new ProductValidationError('createClaim requires the ResearchRecord evidence map');
  }
  const violations = checkClaim(input, { evidenceById, path, requireDecidedBy: true });
  if (violations.length > 0) {
    throw new ProductValidationError(`Invalid claim at ${path}: ${violations.map((v) => v.code).join(', ')}`, violations);
  }
  return Object.freeze({
    statement: input.statement.trim(),
    claim_type: input.claim_type,
    evidence_ids: Object.freeze([...input.evidence_ids]),
    constraint_source: input.claim_type === 'SYSTEM_CONSTRAINT' ? input.constraint_source : null,
    rationale: isNonEmptyString(input.rationale) ? input.rationale.trim() : null,
    decided_by: input.claim_type === 'PRODUCT_DECISION' ? input.decided_by : null,
  });
}

module.exports = {
  createClaim,
  checkClaim,
  checkClaimEvidence,
  checkClaimSemantics,
  checkEvidenceIds,
  isAllowedConstraintSource,
};
