'use strict';

/**
 * Deterministic validation pipeline for a model-produced ProductSpecification candidate. No LLM is
 * involved in any stage. Stages run in this fixed order and the pipeline stops at the first stage
 * that reports a violation (all violations of that stage are reported):
 *
 *   1 STRUCTURAL        plain JSON data only, size/depth bounds, no unknown/runtime/authority fields
 *   2 SCHEMA            assembled draft vs schemas/product-specification.schema.json
 *   3 IDENTITY          opportunity/research/analysis correspond and are in a usable state
 *   4 EVIDENCE          every cited evidence id exists in THIS ResearchRecord; FACT/INFERENCE supported
 *   5 CLAIM_SEMANTICS   claim-type rules (rationale, constraint_source, ...)
 *   6 REFERENTIAL       feature/requirement/acceptance-criterion integrity, scope limits, duplicates
 *   7 SECURITY_PRIVACY  permissions/services justified and classified, no secrets, no contradictions
 *   8 GOVERNANCE        no authority fields (incl. decided_by) anywhere in the candidate
 *
 * The runtime identity (must be a genuine AGENT identity) and the presence of the input records are
 * checked before SCHEMA, because the draft SCHEMA validates embeds them.
 *   9 NORMALIZATION     decided_by set from the runtime identity; final frozen construction
 *
 * The candidate is never trusted: it is only ever read, cloned as plain JSON, and rebuilt field by
 * field. A failed stage yields { ok: false } and nothing downstream (persistence, lifecycle) runs.
 */

const {
  SCHEMA_VERSION,
  DEFAULT_LIMITS,
  AUTHORITY_KEYS,
  FORBIDDEN_OBJECT_KEYS,
  DANGEROUS_ANDROID_PERMISSIONS,
  PRIVACY_RELEVANT_CLASSIFICATIONS,
  SENSITIVE_CLASSIFICATIONS,
  SPECIFICATION_STATUS,
  DISCLAIMER,
  ProductValidationError,
} = require('./types');
const { checkClaimEvidence, checkClaimSemantics, checkEvidenceIds } = require('./Claim');
const { validateAgainstSchema } = require('./schemaValidator');
const {
  createProductSpecification,
  listClaims,
  listMetrics,
  deriveSupportingEvidenceIds,
  CONTENT_KEYS,
  RUNTIME_KEYS,
} = require('./ProductSpecification');

const OPPORTUNITY_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATA_FIELD_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_DATA_CLASSIFICATION_FIELDS = 50;

const SECRET_PATTERNS = Object.freeze([
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*\S+/i,
]);

const OFFLINE_ONLY_PATTERN = /\b(offline[- ]only|fully offline|no network|without (?:any )?network|no internet)\b/i;

function violation(stage, code, path, message) {
  return { stage, code, path, message };
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeText(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// 1. STRUCTURAL
// ---------------------------------------------------------------------------

function walkStructure(value, path, depth, limits, out) {
  if (depth > limits.maxDepth) {
    out.push(violation('STRUCTURAL', 'MAX_DEPTH_EXCEEDED', path, `nesting exceeds ${limits.maxDepth} levels`));
    return;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) out.push(violation('STRUCTURAL', 'NON_FINITE_NUMBER', path, 'numbers must be finite'));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStructure(item, `${path}[${i}]`, depth + 1, limits, out));
    return;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_OBJECT_KEYS.includes(key)) {
        out.push(violation('STRUCTURAL', 'FORBIDDEN_OBJECT_KEY', `${path}.${key}`, `key '${key}' is not allowed`));
        continue;
      }
      walkStructure(value[key], `${path}.${key}`, depth + 1, limits, out);
    }
    return;
  }
  out.push(violation('STRUCTURAL', 'NON_JSON_VALUE', path, `value of type ${typeof value} is not plain JSON data`));
}

function checkStructure(candidate, limits) {
  const out = [];
  if (!isPlainObject(candidate)) {
    return [violation('STRUCTURAL', 'CANDIDATE_NOT_OBJECT', 'candidate', 'model candidate must be a plain object')];
  }
  for (const key of Object.keys(candidate)) {
    if (AUTHORITY_KEYS.includes(key)) {
      out.push(violation('STRUCTURAL', 'AUTHORITY_FIELD_FORBIDDEN', key, `'${key}' cannot be authored by the model`));
    } else if (RUNTIME_KEYS.includes(key)) {
      out.push(violation('STRUCTURAL', 'RUNTIME_FIELD_NOT_MODEL_AUTHORED', key, `'${key}' is set by the ProductAgent runtime, not the model`));
    } else if (!CONTENT_KEYS.includes(key)) {
      out.push(violation('STRUCTURAL', 'UNKNOWN_FIELD', key, `'${key}' is not a ProductSpecification field`));
    }
  }
  walkStructure(candidate, 'candidate', 0, limits, out);
  if (out.length > 0) return out;

  const bytes = Buffer.byteLength(JSON.stringify(candidate), 'utf8');
  if (bytes > limits.maxCandidateBytes) {
    out.push(violation('STRUCTURAL', 'CANDIDATE_TOO_LARGE', 'candidate', `candidate is ${bytes} bytes; limit is ${limits.maxCandidateBytes}`));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. IDENTITY
// ---------------------------------------------------------------------------

function checkIdentity({ opportunity, researchRecord, opportunityAnalysis, version }) {
  const out = [];
  const add = (code, path, message) => out.push(violation('IDENTITY', code, path, message));

  if (!isPlainObject(opportunity) || typeof opportunity.id !== 'string') {
    add('OPPORTUNITY_MISSING', 'opportunity', 'an opportunity record is required');
    return out;
  }
  if (!OPPORTUNITY_ID_PATTERN.test(opportunity.id)) add('OPPORTUNITY_ID_INVALID', 'opportunity.id', 'opportunity id is not a valid slug');
  if (opportunity.lifecycle_state !== 'APPROVED') {
    add('OPPORTUNITY_NOT_APPROVED', 'opportunity.lifecycle_state', `opportunity is '${opportunity.lifecycle_state}', not APPROVED`);
  }
  if (!researchRecord || typeof researchRecord.research_id !== 'string' || !Array.isArray(researchRecord.evidence)) {
    add('RESEARCH_MISSING', 'researchRecord', 'a ResearchRecord is required');
  } else {
    if (researchRecord.opportunity_id !== opportunity.id) add('RESEARCH_OPPORTUNITY_MISMATCH', 'researchRecord.opportunity_id', 'ResearchRecord belongs to a different opportunity');
    if (researchRecord.incomplete === true) add('RESEARCH_INCOMPLETE', 'researchRecord.incomplete', 'ResearchRecord is marked incomplete');
    if (researchRecord.evidence.length === 0) add('RESEARCH_WITHOUT_EVIDENCE', 'researchRecord.evidence', 'ResearchRecord has no evidence');
  }
  if (!opportunityAnalysis || typeof opportunityAnalysis.analysis_id !== 'string') {
    add('ANALYSIS_MISSING', 'opportunityAnalysis', 'an OpportunityAnalysis is required');
  } else {
    if (opportunityAnalysis.opportunity_id !== opportunity.id) add('ANALYSIS_OPPORTUNITY_MISMATCH', 'opportunityAnalysis.opportunity_id', 'OpportunityAnalysis belongs to a different opportunity');
    if (researchRecord && opportunityAnalysis.research_id !== researchRecord.research_id) {
      add('ANALYSIS_RESEARCH_MISMATCH', 'opportunityAnalysis.research_id', 'OpportunityAnalysis was built from a different ResearchRecord');
    }
  }
  if (!Number.isInteger(version) || version < 1) add('VERSION_INVALID', 'version', 'version must be a positive integer');
  return out;
}

// ---------------------------------------------------------------------------
// 4. EVIDENCE / 5. CLAIM_SEMANTICS
// ---------------------------------------------------------------------------

function checkEvidence(content, evidenceById) {
  const out = [];
  for (const { path, claim } of listClaims(content)) out.push(...checkClaimEvidence(claim, evidenceById, path));
  for (const { path, metric } of listMetrics(content)) out.push(...checkEvidenceIds(metric.evidence_ids, evidenceById, `${path}.evidence_ids`));
  return out;
}

function checkSemantics(content) {
  const out = [];
  for (const { path, claim } of listClaims(content)) out.push(...checkClaimSemantics(claim, path, { requireDecidedBy: false }));
  return out;
}

// ---------------------------------------------------------------------------
// 6. REFERENTIAL
// ---------------------------------------------------------------------------

function checkReferential(content, limits) {
  const out = [];
  const add = (code, path, message) => out.push(violation('REFERENTIAL', code, path, message));

  const counts = [
    ['mvp_features', limits.maxMvpFeatures],
    ['post_mvp_features', limits.maxPostMvpFeatures],
    ['functional_requirements', limits.maxFunctionalRequirements],
    ['non_functional_requirements', limits.maxNonFunctionalRequirements],
    ['acceptance_criteria', limits.maxAcceptanceCriteria],
  ];
  for (const [key, max] of counts) {
    if (content[key].length > max) add('SCOPE_LIMIT_EXCEEDED', key, `${key} has ${content[key].length} entries; limit is ${max}`);
  }

  const allIds = new Map();
  const registerId = (id, path) => {
    if (allIds.has(id)) add('DUPLICATE_ID', path, `id '${id}' is already used at ${allIds.get(id)}`);
    else allIds.set(id, path);
  };

  const featureById = new Map();
  for (const key of ['mvp_features', 'post_mvp_features']) {
    content[key].forEach((f, i) => {
      registerId(f.feature_id, `${key}[${i}]`);
      if (!featureById.has(f.feature_id)) featureById.set(f.feature_id, { feature: f, scope: key === 'mvp_features' ? 'MVP' : 'POST_MVP', path: `${key}[${i}]` });
    });
  }
  const requirementById = new Map();
  for (const key of ['functional_requirements', 'non_functional_requirements']) {
    content[key].forEach((r, i) => {
      registerId(r.requirement_id, `${key}[${i}]`);
      if (!requirementById.has(r.requirement_id)) requirementById.set(r.requirement_id, { requirement: r, kind: key === 'functional_requirements' ? 'FUNCTIONAL' : 'NON_FUNCTIONAL', path: `${key}[${i}]` });
    });
  }
  content.acceptance_criteria.forEach((c, i) => registerId(c.criterion_id, `acceptance_criteria[${i}]`));

  for (const { requirement: r, kind, path } of requirementById.values()) {
    if (r.linked_feature_id === null) {
      if (kind === 'FUNCTIONAL') add('FUNCTIONAL_REQUIREMENT_UNLINKED', `${path}.linked_feature_id`, 'a functional requirement must be justified by a feature');
      continue;
    }
    const linked = featureById.get(r.linked_feature_id);
    if (!linked) {
      add('REQUIREMENT_FEATURE_NOT_FOUND', `${path}.linked_feature_id`, `feature '${r.linked_feature_id}' does not exist`);
    } else if (!linked.feature.linked_requirement_ids.includes(r.requirement_id)) {
      add('REQUIREMENT_LINK_NOT_RECIPROCATED', `${path}.linked_feature_id`, `feature '${r.linked_feature_id}' does not list requirement '${r.requirement_id}'`);
    }
  }

  for (const { feature: f, scope, path } of featureById.values()) {
    const seen = new Set();
    f.linked_requirement_ids.forEach((reqId, i) => {
      const itemPath = `${path}.linked_requirement_ids[${i}]`;
      if (seen.has(reqId)) {
        add('DUPLICATE_REFERENCE', itemPath, `requirement '${reqId}' is listed more than once`);
        return;
      }
      seen.add(reqId);
      const linked = requirementById.get(reqId);
      if (!linked) add('FEATURE_REQUIREMENT_NOT_FOUND', itemPath, `requirement '${reqId}' does not exist`);
      else if (linked.requirement.linked_feature_id !== f.feature_id) add('FEATURE_LINK_NOT_RECIPROCATED', itemPath, `requirement '${reqId}' is linked to '${linked.requirement.linked_feature_id}', not '${f.feature_id}'`);
    });
    if (scope === 'MVP' && f.linked_requirement_ids.length === 0) {
      add('MVP_FEATURE_WITHOUT_REQUIREMENT', path, `MVP feature '${f.feature_id}' has no requirements`);
    }
  }

  const coveredRequirements = new Set();
  content.acceptance_criteria.forEach((c, i) => {
    const seen = new Set();
    c.requirement_ids.forEach((reqId, j) => {
      const itemPath = `acceptance_criteria[${i}].requirement_ids[${j}]`;
      if (seen.has(reqId)) add('DUPLICATE_REFERENCE', itemPath, `requirement '${reqId}' is listed more than once`);
      seen.add(reqId);
      if (!requirementById.has(reqId)) add('CRITERION_REQUIREMENT_NOT_FOUND', itemPath, `requirement '${reqId}' does not exist`);
      else coveredRequirements.add(reqId);
    });
  });

  for (const { feature: f, scope, path } of featureById.values()) {
    if (scope !== 'MVP') continue;
    for (const reqId of f.linked_requirement_ids) {
      const linked = requirementById.get(reqId);
      if (linked && linked.kind === 'FUNCTIONAL' && !coveredRequirements.has(reqId)) {
        add('REQUIREMENT_WITHOUT_ACCEPTANCE_CRITERIA', linked.path, `MVP requirement '${reqId}' has no acceptance criterion`);
      }
    }
    if (f.linked_requirement_ids.length > 0 && !f.linked_requirement_ids.some((reqId) => coveredRequirements.has(reqId))) {
      add('MVP_FEATURE_WITHOUT_ACCEPTANCE_CRITERIA', path, `MVP feature '${f.feature_id}' has no acceptance criterion`);
    }
  }

  const requirementStatements = new Map();
  for (const { requirement: r, path } of requirementById.values()) {
    const key = normalizeText(r.claim.statement);
    if (requirementStatements.has(key)) add('DUPLICATE_REQUIREMENT', path, `duplicates ${requirementStatements.get(key)}`);
    else requirementStatements.set(key, path);
  }
  const featureStatements = new Map();
  for (const { feature: f, path } of featureById.values()) {
    const key = normalizeText(f.claim.statement);
    if (featureStatements.has(key)) add('DUPLICATE_FEATURE', path, `duplicates ${featureStatements.get(key)}`);
    else featureStatements.set(key, path);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 7. SECURITY_PRIVACY
// ---------------------------------------------------------------------------

function collectStrings(value, path, out) {
  if (typeof value === 'string') {
    out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      out.push({ path: `${path}{key}`, text: key });
      collectStrings(value[key], `${path}.${key}`, out);
    }
  }
  return out;
}

function checkSecurityPrivacy(content) {
  const out = [];
  const add = (code, path, message) => out.push(violation('SECURITY_PRIVACY', code, path, message));

  for (const { path, text } of collectStrings(content, 'candidate', [])) {
    if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
      add('SECRET_MATERIAL_DETECTED', path, 'value looks like a secret or credential; specifications must never contain secrets');
    }
  }

  const fields = Object.keys(content.data_classification);
  if (fields.length > MAX_DATA_CLASSIFICATION_FIELDS) add('DATA_CLASSIFICATION_TOO_LARGE', 'data_classification', `more than ${MAX_DATA_CLASSIFICATION_FIELDS} fields`);
  for (const field of fields) {
    if (!DATA_FIELD_PATTERN.test(field)) add('DATA_FIELD_NAME_INVALID', `data_classification.${field}`, 'field names must match [A-Za-z0-9_.-]{1,64}');
  }

  const classifications = [...Object.values(content.data_classification)];
  const seenPermissions = new Set();
  content.permissions.forEach((p, i) => {
    const path = `permissions[${i}]`;
    if (seenPermissions.has(p.android_permission)) add('DUPLICATE_PERMISSION', path, `${p.android_permission} is requested more than once`);
    seenPermissions.add(p.android_permission);
    if (!p.justification.trim()) add('PERMISSION_NOT_JUSTIFIED', `${path}.justification`, 'every permission must be justified');
    classifications.push(p.data_accessed_classification);
    if (DANGEROUS_ANDROID_PERMISSIONS.includes(p.android_permission) && !PRIVACY_RELEVANT_CLASSIFICATIONS.includes(p.data_accessed_classification)) {
      add('DANGEROUS_PERMISSION_UNCLASSIFIED', `${path}.data_accessed_classification`, `${p.android_permission} accesses user data and must be classified as personal/sensitive`);
    }
  });

  content.external_services.forEach((s, i) => {
    const path = `external_services[${i}]`;
    if (!s.justification.trim()) add('EXTERNAL_SERVICE_NOT_JUSTIFIED', `${path}.justification`, 'every external service must be justified');
    if (s.data_shared_classification === 'CREDENTIALS') add('CREDENTIALS_SHARED_EXTERNALLY', `${path}.data_shared_classification`, 'credentials must never be shared with an external service');
    classifications.push(s.data_shared_classification);
  });

  if (classifications.some((c) => PRIVACY_RELEVANT_CLASSIFICATIONS.includes(c)) && content.privacy_requirements.length === 0) {
    add('PRIVACY_REQUIREMENTS_MISSING', 'privacy_requirements', 'personal or sensitive data is handled but no privacy requirement is specified');
  }
  if (classifications.some((c) => SENSITIVE_CLASSIFICATIONS.includes(c)) && content.security_requirements.length === 0) {
    add('SECURITY_REQUIREMENTS_MISSING', 'security_requirements', 'sensitive data is handled but no security requirement is specified');
  }

  if (OFFLINE_ONLY_PATTERN.test(content.offline_online_requirement.statement)) {
    if (content.external_services.length > 0) {
      add('CONTRADICTORY_REQUIREMENTS', 'external_services', 'offline-only requirement contradicts declared external services');
    }
    if (seenPermissions.has('android.permission.INTERNET')) {
      add('CONTRADICTORY_REQUIREMENTS', 'permissions', 'offline-only requirement contradicts the INTERNET permission');
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 8. GOVERNANCE
// ---------------------------------------------------------------------------

function findAuthorityKeys(value, path, out) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findAuthorityKeys(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (AUTHORITY_KEYS.includes(key)) {
        out.push(violation('GOVERNANCE', key === 'decided_by' ? 'MODEL_AUTHORED_DECIDED_BY' : 'AUTHORITY_FIELD_FORBIDDEN', `${path}.${key}`,
          key === 'decided_by'
            ? 'decided_by is derived from the runtime ProductAgent identity and cannot be supplied by the model'
            : `'${key}' cannot be authored by the model`));
      }
      findAuthorityKeys(value[key], `${path}.${key}`, out);
    }
  }
  return out;
}

function checkRuntimeIdentity(runtimeIdentity) {
  const out = [];
  const add = (code, message) => out.push(violation('GOVERNANCE', code, 'runtimeIdentity', message));
  if (!isPlainObject(runtimeIdentity)) {
    add('RUNTIME_IDENTITY_MISSING', 'a runtime agent identity is required');
    return out;
  }
  // Phase 5 has exactly one author: the ProductAgent running as AGENT. There is no path through
  // which this pipeline can record a HUMAN decision — those exist only as lifecycle transitions.
  if (runtimeIdentity.actor !== 'AGENT') add('RUNTIME_ACTOR_NOT_AGENT', `runtime actor must be AGENT, got ${JSON.stringify(runtimeIdentity.actor)}`);
  for (const key of ['agent_id', 'agent_version', 'run_id']) {
    if (typeof runtimeIdentity[key] !== 'string' || runtimeIdentity[key].trim() === '') add('RUNTIME_IDENTITY_INCOMPLETE', `runtimeIdentity.${key} is required`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function decidedByFor(runtimeIdentity) {
  return `${runtimeIdentity.actor}:${runtimeIdentity.agent_id}@${runtimeIdentity.agent_version}`;
}

function applyDecidedBy(content, decidedBy) {
  for (const { claim } of listClaims(content)) {
    if (claim.claim_type === 'PRODUCT_DECISION') claim.decided_by = decidedBy;
  }
}

function buildDraft(content, { opportunity, researchRecord, opportunityAnalysis, version, runtimeIdentity, modelMetadata, now }) {
  const draft = {
    specification_id: `${opportunity.id}-spec-v${version}`,
    opportunity_id: opportunity.id,
    research_id: researchRecord.research_id,
    analysis_id: opportunityAnalysis.analysis_id,
    version,
    schema_version: SCHEMA_VERSION,
    supporting_research_ids: [researchRecord.research_id],
    supporting_evidence_ids: deriveSupportingEvidenceIds(content),
    agent_metadata: {
      actor: runtimeIdentity.actor,
      agent_id: runtimeIdentity.agent_id,
      agent_version: runtimeIdentity.agent_version,
      run_id: runtimeIdentity.run_id,
      model_request_id: modelMetadata.model_request_id ?? null,
      model_id: modelMetadata.model_id ?? null,
      provider_id: modelMetadata.provider_id ?? null,
    },
    created_at: now,
    specification_status: SPECIFICATION_STATUS.DRAFT,
    disclaimer: DISCLAIMER,
  };
  for (const key of CONTENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(content, key)) draft[key] = content[key];
  }
  return draft;
}

/**
 * @param {object} params
 *   candidate            untrusted model output (the `specification` object)
 *   opportunity          opportunity record (store.getOpportunity shape)
 *   researchRecord       validated ResearchRecord for this opportunity
 *   opportunityAnalysis  validated OpportunityAnalysis built from that ResearchRecord
 *   version              positive integer version this specification will receive
 *   runtimeIdentity      { actor: 'AGENT', agent_id, agent_version, run_id } from the AgentContext
 *   modelMetadata        { model_request_id, model_id, provider_id } from the ModelRouter result
 *   limits               optional overrides of DEFAULT_LIMITS
 *   now                  ISO timestamp (defaults to the current time)
 * @returns {{ok: true, specification: object, violations: []} | {ok: false, stage: string, violations: object[]}}
 */
function validateSpecificationCandidate(params) {
  const {
    candidate,
    opportunity,
    researchRecord,
    opportunityAnalysis,
    version,
    runtimeIdentity,
    modelMetadata = {},
    limits: limitOverrides,
    now = new Date().toISOString(),
  } = params || {};
  const limits = { ...DEFAULT_LIMITS, ...(limitOverrides || {}) };
  const fail = (stage, violations) => ({ ok: false, stage, violations });

  const structural = checkStructure(candidate, limits);
  if (structural.length > 0) return fail('STRUCTURAL', structural);
  const content = JSON.parse(JSON.stringify(candidate));

  // The draft checked by SCHEMA embeds runtime identity and artifact ids, so the records must exist
  // and the runtime identity must be a genuine AGENT identity before the draft can be assembled.
  const identity = checkIdentity({ opportunity, researchRecord, opportunityAnalysis, version });
  const identityUsable = identity.every((v) => !['OPPORTUNITY_MISSING', 'RESEARCH_MISSING', 'ANALYSIS_MISSING'].includes(v.code));
  if (!identityUsable) return fail('IDENTITY', identity);
  const runtime = checkRuntimeIdentity(runtimeIdentity);
  if (runtime.length > 0) return fail('GOVERNANCE', runtime);

  const draftForSchema = buildDraft(content, { opportunity, researchRecord, opportunityAnalysis, version, runtimeIdentity, modelMetadata, now });
  const schemaErrors = validateAgainstSchema(draftForSchema);
  if (schemaErrors.length > 0) {
    return fail('SCHEMA', schemaErrors.map((e) => violation('SCHEMA', 'SCHEMA_VIOLATION', e.path, e.message)));
  }

  if (identity.length > 0) return fail('IDENTITY', identity);

  const evidenceById = new Map(researchRecord.evidence.map((e) => [e.evidence_id, e]));

  const evidence = checkEvidence(content, evidenceById);
  if (evidence.length > 0) return fail('EVIDENCE', evidence);

  const semantics = checkSemantics(content);
  if (semantics.length > 0) return fail('CLAIM_SEMANTICS', semantics);

  const referential = checkReferential(content, limits);
  if (referential.length > 0) return fail('REFERENTIAL', referential);

  const security = checkSecurityPrivacy(content);
  if (security.length > 0) return fail('SECURITY_PRIVACY', security);

  const governance = findAuthorityKeys(content, 'candidate', []);
  if (governance.length > 0) return fail('GOVERNANCE', governance);

  applyDecidedBy(content, decidedByFor(runtimeIdentity));
  try {
    const specification = createProductSpecification(
      buildDraft(content, { opportunity, researchRecord, opportunityAnalysis, version, runtimeIdentity, modelMetadata, now }),
      { evidenceById },
    );
    return { ok: true, specification, violations: [] };
  } catch (e) {
    if (e instanceof ProductValidationError) {
      const violations = e.violations.length > 0
        ? e.violations.map((v) => ({ ...v, stage: 'NORMALIZATION' }))
        : [violation('NORMALIZATION', 'NORMALIZATION_FAILED', 'specification', e.message)];
      return fail('NORMALIZATION', violations);
    }
    throw e;
  }
}

module.exports = { validateSpecificationCandidate, decidedByFor, SECRET_PATTERNS };
