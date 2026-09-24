'use strict';

/**
 * product-agent — Phase 5 Product Factory (doc 07 §5's ProductAgent). Converts an APPROVED
 * opportunity plus its latest ResearchRecord/OpportunityAnalysis into a versioned
 * ProductSpecification and submits it for human approval. It ends at AWAITING_SPEC_APPROVAL.
 *
 *   preconditions -> bounded model input -> ModelRouter('product_specification_generation')
 *   -> untrusted candidate -> deterministic validation (product/validation.js)
 *   -> append-only persistence -> START_SPEC -> SUBMIT_SPEC_FOR_APPROVAL
 *
 * Boundaries, enforced structurally rather than by convention:
 * - No ToolRuntime is accepted, so this agent cannot invoke any tool.
 * - Research data is read-only: only read functions are injected; nothing here can write research.
 * - Lifecycle changes go only through agent/lifecycle.js's requestLifecycleTransition(), which
 *   hardcodes actor 'AGENT'; the only actions this file ever requests are START_SPEC and
 *   SUBMIT_SPEC_FOR_APPROVAL. APPROVE_SPEC is HUMAN-only in stateMachine.js.
 * - Model output is a candidate only: it cannot set identity, evidence summaries, decided_by,
 *   actor, lifecycle or approval fields (see product/validation.js).
 * - Transitions happen only after validation and persistence succeed; any earlier failure leaves
 *   the opportunity APPROVED and nothing persisted.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');
const { RESULT_STATUS: MODEL_RESULT_STATUS } = require('../../model/types');
const { requestLifecycleTransition: realRequestLifecycleTransition } = require('../lifecycle');
const realStore = require('../../store');
const auditLog = require('../../auditLog');
const { createResearchRecord } = require('../../research/ResearchRecord');
const { createOpportunityAnalysis } = require('../../research/OpportunityAnalysis');
const {
  readResearchRecords: realReadResearchRecords,
  readOpportunityAnalyses: realReadOpportunityAnalyses,
} = require('../../research/persistence');
const { defaultStore } = require('../../product/persistence');
const { validateSpecificationCandidate } = require('../../product/validation');
const { buildProductModelInput } = require('../../product/modelInput');
const {
  TASK_TYPE,
  REQUIRED_CAPABILITIES,
  AUDIT_ACTIONS,
  BLOCK_REASON,
} = require('../../product/types');

const AGENT_ID = 'product-agent';
const AGENT_VERSION = '1.0.0';
const DEFAULT_MAX_SPEC_COST_USD = 0.01;
const MAX_REPORTED_VIOLATIONS = 10;
// AgentRunner enforces maxDurationMs with Promise.race, so a timed-out run keeps executing in the
// background. Everything after the model call is synchronous, so refusing to continue once the
// budget (minus this margin) is spent guarantees a run the runner reported as timed out can never
// persist a specification or transition the opportunity afterwards.
const DEADLINE_MARGIN_MS = 100;

function formatViolations(violations) {
  const shown = violations.slice(0, MAX_REPORTED_VIOLATIONS).map((v) => `${v.stage}/${v.code} at ${v.path}`);
  if (violations.length > MAX_REPORTED_VIOLATIONS) shown.push(`(+${violations.length - MAX_REPORTED_VIOLATIONS} more)`);
  return shown.join('; ');
}

function createProductAgent({
  modelRouter,
  getOpportunity = realStore.getOpportunity,
  readResearchRecords = realReadResearchRecords,
  readOpportunityAnalyses = realReadOpportunityAnalyses,
  specificationStore = defaultStore,
  requestLifecycleTransition = realRequestLifecycleTransition,
  appendAudit = auditLog.append,
  maxSpecCostUsd = DEFAULT_MAX_SPEC_COST_USD,
} = {}) {
  if (!modelRouter || typeof modelRouter.route !== 'function') {
    throw new TypeError('createProductAgent requires a ModelRouter');
  }
  if (!specificationStore || typeof specificationStore.append !== 'function' || typeof specificationStore.nextVersion !== 'function') {
    throw new TypeError('createProductAgent requires a ProductSpecification store');
  }

  return defineAgent({
    agent_id: AGENT_ID,
    agent_type: 'ProductAgent',
    version: AGENT_VERSION,
    description: 'Generates a versioned, evidence-traceable ProductSpecification for an APPROVED opportunity and submits it for human approval. Never approves specifications.',
    async run(context) {
      const startedAt = Date.now();
      const opportunityId = context.input.opportunity_id;
      const failed = (message) => ({ status: RESULT_STATUS.FAILED, errors: [`product-agent: ${message}`] });
      const audit = (action, note) => appendAudit({
        actor: 'AGENT',
        actorName: AGENT_ID,
        action,
        opportunityId,
        previousState: null,
        newState: null,
        note: `run_id=${context.run_id} ${note}`,
      });

      // -- Preconditions (cheap, before any model cost) --
      if (typeof opportunityId !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opportunityId)) {
        return failed('input.opportunity_id must be a valid opportunity slug');
      }
      const opportunity = getOpportunity(opportunityId);
      if (!opportunity) return failed(`no opportunity found with id '${opportunityId}'`);
      if (opportunity.lifecycle_state !== 'APPROVED') {
        return failed(`opportunity '${opportunityId}' is in state '${opportunity.lifecycle_state}', not APPROVED`);
      }

      const rawResearch = readResearchRecords().find((r) => r.opportunity_id === opportunityId);
      if (!rawResearch) return failed(`no ResearchRecord exists for opportunity '${opportunityId}'`);
      let researchRecord;
      try {
        researchRecord = createResearchRecord(rawResearch);
      } catch (e) {
        return failed(`latest ResearchRecord for '${opportunityId}' is invalid: ${e.message}`);
      }
      if (researchRecord.incomplete) return failed(`latest ResearchRecord '${researchRecord.research_id}' is incomplete`);
      if (researchRecord.evidence.length === 0) return failed(`latest ResearchRecord '${researchRecord.research_id}' has no evidence`);

      const rawAnalysis = readOpportunityAnalyses().find((a) => a.opportunity_id === opportunityId);
      if (!rawAnalysis) return failed(`no OpportunityAnalysis exists for opportunity '${opportunityId}'`);
      if (rawAnalysis.research_id !== researchRecord.research_id) {
        return failed(`latest OpportunityAnalysis '${rawAnalysis.analysis_id}' was built from research '${rawAnalysis.research_id}', not the latest ResearchRecord '${researchRecord.research_id}'`);
      }
      let opportunityAnalysis;
      try {
        opportunityAnalysis = createOpportunityAnalysis(rawAnalysis, researchRecord);
      } catch (e) {
        return failed(`latest OpportunityAnalysis for '${opportunityId}' is invalid: ${e.message}`);
      }

      let modelInput;
      try {
        modelInput = buildProductModelInput({ opportunity, researchRecord, opportunityAnalysis });
      } catch (e) {
        return failed(`could not build bounded model input: ${e.message}`);
      }

      // -- Model Router: the result is an untrusted candidate --
      const modelRequestId = `${context.run_id}-product-spec-request`;
      const modelResult = await modelRouter.route({
        request_id: modelRequestId,
        agent_run_id: context.run_id,
        task_type: TASK_TYPE,
        model_requirements: { capabilities: [...REQUIRED_CAPABILITIES] },
        input: modelInput,
        budget: { maxCostUsd: maxSpecCostUsd },
      });

      // No await below this point: validation, persistence and transitions run synchronously.
      if (Date.now() - startedAt >= context.limits.maxDurationMs - DEADLINE_MARGIN_MS) {
        audit(AUDIT_ACTIONS.REJECTED, `stage=DEADLINE model_request_id=${modelRequestId} outcome=REJECTED agent time budget exhausted`);
        return failed('agent time budget exhausted after model generation; specification not validated or persisted');
      }

      if (modelResult.status !== MODEL_RESULT_STATUS.SUCCESS) {
        const reason = modelResult.block_reason || (modelResult.errors || []).join('; ') || 'unknown';
        audit(AUDIT_ACTIONS.REJECTED, `stage=MODEL model_request_id=${modelRequestId} outcome=${modelResult.status} reason=${reason}`);
        return modelResult.status === MODEL_RESULT_STATUS.BLOCKED
          ? { status: RESULT_STATUS.BLOCKED, block_reason: `${BLOCK_REASON.SPEC_GENERATION_UNAVAILABLE}: ${reason}` }
          : failed(`model generation failed: ${reason}`);
      }

      const modelMetadata = { model_request_id: modelRequestId, model_id: modelResult.model_id, provider_id: modelResult.provider_id };
      audit(AUDIT_ACTIONS.GENERATED, `model_request_id=${modelRequestId} model_id=${modelResult.model_id} outcome=CANDIDATE_RECEIVED`);

      const output = modelResult.output || {};
      const unexpected = Object.keys(output).filter((k) => k !== 'specification');
      let validation;
      if (unexpected.length > 0) {
        validation = {
          ok: false,
          stage: 'STRUCTURAL',
          violations: unexpected.map((k) => ({ stage: 'STRUCTURAL', code: 'MODEL_OUTPUT_UNEXPECTED_FIELD', path: `output.${k}`, message: `unexpected model output field '${k}'` })),
        };
      } else {
        let version;
        try {
          version = specificationStore.nextVersion(opportunityId);
        } catch (e) {
          return failed(`could not read existing specifications: ${e.message}`);
        }
        validation = validateSpecificationCandidate({
          candidate: output.specification,
          opportunity,
          researchRecord,
          opportunityAnalysis,
          version,
          runtimeIdentity: { actor: 'AGENT', agent_id: AGENT_ID, agent_version: AGENT_VERSION, run_id: context.run_id },
          modelMetadata,
        });
      }

      if (!validation.ok) {
        audit(AUDIT_ACTIONS.REJECTED, `stage=${validation.stage} violations=${validation.violations.length} outcome=REJECTED ${formatViolations(validation.violations)}`);
        return failed(`specification rejected at ${validation.stage}: ${formatViolations(validation.violations)}`);
      }
      const { specification } = validation;
      audit(AUDIT_ACTIONS.VALIDATED, `specification_id=${specification.specification_id} version=${specification.version} outcome=VALIDATED`);

      // -- Persistence (only a validated specification; only while still APPROVED) --
      const current = getOpportunity(opportunityId);
      if (!current || current.lifecycle_state !== 'APPROVED') {
        return failed(`opportunity '${opportunityId}' left APPROVED during generation; specification not persisted`);
      }
      try {
        specificationStore.append(specification);
      } catch (e) {
        return failed(`specification '${specification.specification_id}' could not be persisted: ${e.message}`);
      }
      audit(AUDIT_ACTIONS.PERSISTED, `specification_id=${specification.specification_id} version=${specification.version} outcome=PERSISTED`);

      // -- Lifecycle: only START_SPEC and SUBMIT_SPEC_FOR_APPROVAL, as AGENT --
      try {
        requestLifecycleTransition({ id: opportunityId, action: 'START_SPEC', actorName: AGENT_ID, note: `specification_id=${specification.specification_id}` });
        requestLifecycleTransition({ id: opportunityId, action: 'SUBMIT_SPEC_FOR_APPROVAL', actorName: AGENT_ID, note: `specification_id=${specification.specification_id}` });
      } catch (e) {
        const after = getOpportunity(opportunityId);
        return failed(
          `specification '${specification.specification_id}' was persisted but the lifecycle transition failed ` +
          `(opportunity now '${after ? after.lifecycle_state : 'unknown'}'): ${e.message}`,
        );
      }

      return {
        status: RESULT_STATUS.SUCCESS,
        output: {
          specification_id: specification.specification_id,
          opportunity_id: opportunityId,
          research_id: specification.research_id,
          analysis_id: specification.analysis_id,
          version: specification.version,
          mvp_feature_count: specification.mvp_features.length,
          requirement_count: specification.functional_requirements.length + specification.non_functional_requirements.length,
          supporting_evidence_count: specification.supporting_evidence_ids.length,
          resulting_state: 'AWAITING_SPEC_APPROVAL',
        },
      };
    },
  });
}

module.exports = { createProductAgent, AGENT_ID, AGENT_VERSION, DEFAULT_MAX_SPEC_COST_USD };
