'use strict';

/**
 * ProductSpecification — the Phase 5 artifact: a versioned, immutable, evidence-traceable
 * definition of what an APPROVED opportunity's product must do. It is a controlled input to a
 * later build phase, not an implementation.
 *
 * Fields are split into:
 * - CONTENT_KEYS: the only fields a model candidate may author;
 * - RUNTIME_KEYS: identity/evidence/governance fields set exclusively by the ProductAgent runtime
 *   (a candidate that supplies any of them is rejected, see validation.js).
 *
 * createProductSpecification() is the final construction step: every object is rebuilt field by
 * field (model objects are never spread), every Claim is re-checked via createClaim(), the result
 * is re-validated against schemas/product-specification.schema.json, deep-frozen, and registered
 * as validated. persistence.js only accepts objects that passed through here.
 */

const { createClaim } = require('./Claim');
const { validateAgainstSchema } = require('./schemaValidator');
const { ProductValidationError } = require('./types');

const SINGLE_CLAIM_KEYS = Object.freeze([
  'problem_statement',
  'value_proposition',
  'offline_online_requirement',
  'storage_requirement',
  'authentication_requirement',
  'authorization_requirement',
  'secrets_requirement',
  'logging_telemetry_policy',
  'data_retention_policy',
  'monetization_assumption',
]);

const CLAIM_LIST_KEYS = Object.freeze([
  'jobs_to_be_done',
  'pain_points',
  'ux_requirements',
  'accessibility_requirements',
  'localization_requirements',
  'architecture_constraints',
  'privacy_requirements',
  'security_requirements',
  'test_requirements',
  'performance_requirements',
  'reliability_requirements',
]);

const STRING_KEYS = Object.freeze(['user_context', 'product_name', 'positioning', 'platform', 'minimum_os_version']);
const STRING_LIST_KEYS = Object.freeze(['target_users', 'core_user_flow', 'non_goals', 'abuse_cases']);
const FEATURE_LIST_KEYS = Object.freeze(['mvp_features', 'post_mvp_features']);
const REQUIREMENT_LIST_KEYS = Object.freeze(['functional_requirements', 'non_functional_requirements']);
const METRIC_LIST_KEYS = Object.freeze(['success_metrics', 'guardrail_metrics']);

const CONTENT_KEYS = Object.freeze([
  ...SINGLE_CLAIM_KEYS,
  ...CLAIM_LIST_KEYS,
  ...STRING_KEYS,
  ...STRING_LIST_KEYS,
  ...FEATURE_LIST_KEYS,
  ...REQUIREMENT_LIST_KEYS,
  ...METRIC_LIST_KEYS,
  'acceptance_criteria',
  'external_services',
  'permissions',
  'data_classification',
]);

const RUNTIME_KEYS = Object.freeze([
  'specification_id',
  'opportunity_id',
  'research_id',
  'analysis_id',
  'version',
  'schema_version',
  'supporting_research_ids',
  'supporting_evidence_ids',
  'agent_metadata',
  'created_at',
  'specification_status',
  'disclaimer',
]);

const validatedSpecifications = new WeakSet();

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every claim in a (candidate or final) specification, with a stable path, in document order. */
function listClaims(spec) {
  const claims = [];
  for (const key of SINGLE_CLAIM_KEYS) {
    if (isObject(spec[key])) claims.push({ path: key, claim: spec[key] });
  }
  for (const key of CLAIM_LIST_KEYS) {
    asArray(spec[key]).forEach((claim, i) => claims.push({ path: `${key}[${i}]`, claim }));
  }
  for (const key of FEATURE_LIST_KEYS) {
    asArray(spec[key]).forEach((feature, i) => {
      if (isObject(feature) && isObject(feature.claim)) claims.push({ path: `${key}[${i}].claim`, claim: feature.claim });
    });
  }
  for (const key of REQUIREMENT_LIST_KEYS) {
    asArray(spec[key]).forEach((requirement, i) => {
      if (isObject(requirement) && isObject(requirement.claim)) claims.push({ path: `${key}[${i}].claim`, claim: requirement.claim });
    });
  }
  return claims;
}

/** Every metric (which carries evidence_ids but is not a Claim), with a stable path. */
function listMetrics(spec) {
  const metrics = [];
  for (const key of METRIC_LIST_KEYS) {
    asArray(spec[key]).forEach((metric, i) => metrics.push({ path: `${key}[${i}]`, metric }));
  }
  return metrics;
}

/**
 * supporting_evidence_ids is derived from what claims and metrics actually cite — never taken from
 * model output. First-appearance order, deduplicated.
 */
function deriveSupportingEvidenceIds(spec) {
  const seen = new Set();
  const ordered = [];
  const add = (ids) => {
    for (const id of asArray(ids)) {
      if (typeof id === 'string' && !seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  };
  for (const { claim } of listClaims(spec)) add(claim.evidence_ids);
  for (const { metric } of listMetrics(spec)) if (isObject(metric)) add(metric.evidence_ids);
  return ordered;
}

function freezeStrings(list) {
  return Object.freeze(list.map((s) => s.trim()));
}

/**
 * @param {object} draft - a fully assembled specification (runtime fields + validated, normalized
 *   content). decided_by must already be the runtime identity on every PRODUCT_DECISION.
 * @param {object} options
 *   evidenceById: Map of the ResearchRecord's evidence, keyed by evidence_id.
 */
function createProductSpecification(draft, { evidenceById }) {
  if (!isObject(draft)) throw new ProductValidationError('ProductSpecification draft must be an object');
  if (!(evidenceById instanceof Map)) throw new ProductValidationError('createProductSpecification requires the ResearchRecord evidence map');

  const claim = (value, path) => createClaim(value, { evidenceById, path });
  const claimList = (key) => Object.freeze(asArray(draft[key]).map((c, i) => claim(c, `${key}[${i}]`)));

  const featureList = (key) => Object.freeze(asArray(draft[key]).map((f, i) => Object.freeze({
    feature_id: f.feature_id,
    claim: claim(f.claim, `${key}[${i}].claim`),
    linked_requirement_ids: Object.freeze([...f.linked_requirement_ids]),
  })));

  const requirementList = (key) => Object.freeze(asArray(draft[key]).map((r, i) => Object.freeze({
    requirement_id: r.requirement_id,
    claim: claim(r.claim, `${key}[${i}].claim`),
    linked_feature_id: r.linked_feature_id ?? null,
  })));

  const metricList = (key) => Object.freeze(asArray(draft[key]).map((m) => Object.freeze({
    metric: m.metric,
    target: m.target,
    evidence_ids: Object.freeze([...m.evidence_ids]),
  })));

  const dataClassification = Object.freeze(Object.fromEntries(
    Object.keys(draft.data_classification || {}).sort().map((field) => [field, draft.data_classification[field]]),
  ));

  const spec = {
    specification_id: draft.specification_id,
    opportunity_id: draft.opportunity_id,
    research_id: draft.research_id,
    analysis_id: draft.analysis_id,
    version: draft.version,
    schema_version: draft.schema_version,

    problem_statement: claim(draft.problem_statement, 'problem_statement'),
    target_users: freezeStrings(asArray(draft.target_users)),
    user_context: draft.user_context,
    jobs_to_be_done: claimList('jobs_to_be_done'),
    pain_points: claimList('pain_points'),

    product_name: draft.product_name,
    value_proposition: claim(draft.value_proposition, 'value_proposition'),
    positioning: draft.positioning,
    core_user_flow: freezeStrings(asArray(draft.core_user_flow)),

    mvp_features: featureList('mvp_features'),
    post_mvp_features: featureList('post_mvp_features'),
    non_goals: freezeStrings(asArray(draft.non_goals)),

    functional_requirements: requirementList('functional_requirements'),
    non_functional_requirements: requirementList('non_functional_requirements'),
    ux_requirements: claimList('ux_requirements'),
    accessibility_requirements: claimList('accessibility_requirements'),
    localization_requirements: claimList('localization_requirements'),

    platform: draft.platform,
    minimum_os_version: draft.minimum_os_version ?? null,
    architecture_constraints: claimList('architecture_constraints'),
    offline_online_requirement: claim(draft.offline_online_requirement, 'offline_online_requirement'),
    storage_requirement: claim(draft.storage_requirement, 'storage_requirement'),
    external_services: Object.freeze(asArray(draft.external_services).map((s) => Object.freeze({
      name: s.name,
      purpose: s.purpose,
      justification: s.justification,
      data_shared_classification: s.data_shared_classification,
    }))),
    permissions: Object.freeze(asArray(draft.permissions).map((p) => Object.freeze({
      android_permission: p.android_permission,
      justification: p.justification,
      data_accessed_classification: p.data_accessed_classification,
    }))),

    authentication_requirement: claim(draft.authentication_requirement, 'authentication_requirement'),
    authorization_requirement: claim(draft.authorization_requirement, 'authorization_requirement'),
    data_classification: dataClassification,
    privacy_requirements: claimList('privacy_requirements'),
    security_requirements: claimList('security_requirements'),
    secrets_requirement: claim(draft.secrets_requirement, 'secrets_requirement'),
    abuse_cases: freezeStrings(asArray(draft.abuse_cases)),
    logging_telemetry_policy: claim(draft.logging_telemetry_policy, 'logging_telemetry_policy'),
    data_retention_policy: claim(draft.data_retention_policy, 'data_retention_policy'),

    acceptance_criteria: Object.freeze(asArray(draft.acceptance_criteria).map((c) => Object.freeze({
      criterion_id: c.criterion_id,
      statement: c.statement.trim(),
      requirement_ids: Object.freeze([...c.requirement_ids]),
    }))),
    test_requirements: claimList('test_requirements'),
    performance_requirements: claimList('performance_requirements'),
    reliability_requirements: claimList('reliability_requirements'),

    monetization_assumption: claim(draft.monetization_assumption, 'monetization_assumption'),
    success_metrics: metricList('success_metrics'),
    guardrail_metrics: metricList('guardrail_metrics'),

    supporting_research_ids: Object.freeze([draft.research_id]),
    supporting_evidence_ids: null, // derived below from the finalized claims

    agent_metadata: Object.freeze({
      actor: draft.agent_metadata.actor,
      agent_id: draft.agent_metadata.agent_id,
      agent_version: draft.agent_metadata.agent_version,
      run_id: draft.agent_metadata.run_id,
      model_request_id: draft.agent_metadata.model_request_id ?? null,
      model_id: draft.agent_metadata.model_id ?? null,
      provider_id: draft.agent_metadata.provider_id ?? null,
    }),
    created_at: draft.created_at,
    specification_status: draft.specification_status,
    disclaimer: draft.disclaimer,
  };
  spec.supporting_evidence_ids = Object.freeze(deriveSupportingEvidenceIds(spec));

  const schemaErrors = validateAgainstSchema(spec);
  if (schemaErrors.length > 0) {
    throw new ProductValidationError(
      `Finalized ProductSpecification failed schema validation: ${schemaErrors.map((e) => `${e.path} ${e.message}`).join('; ')}`,
      schemaErrors.map((e) => ({ stage: 'NORMALIZATION', code: 'SCHEMA_VIOLATION', path: e.path, message: e.message })),
    );
  }

  const frozen = Object.freeze(spec);
  validatedSpecifications.add(frozen);
  return frozen;
}

function isValidatedProductSpecification(value) {
  return typeof value === 'object' && value !== null && validatedSpecifications.has(value);
}

module.exports = {
  createProductSpecification,
  isValidatedProductSpecification,
  listClaims,
  listMetrics,
  deriveSupportingEvidenceIds,
  CONTENT_KEYS,
  RUNTIME_KEYS,
  SINGLE_CLAIM_KEYS,
  CLAIM_LIST_KEYS,
  FEATURE_LIST_KEYS,
  REQUIREMENT_LIST_KEYS,
  METRIC_LIST_KEYS,
};
