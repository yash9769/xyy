'use strict';

/**
 * research-agent — collects and structures evidence for a candidate opportunity (doc 07 §5's
 * ResearchAgent: "Collect evidence about a candidate... must distinguish source evidence from
 * generated analysis"). This is the one agent in the factory that touches external content, so it
 * is also where the trust boundary (this phase's item 3) is enforced most concretely:
 *
 * - Search results and fetched page content are ALWAYS treated as inert data. They flow into
 *   Source.locator/Evidence.claim as plain strings; nothing in this file ever re-interprets that
 *   text as an instruction, a tool request, or an actor claim. There is no code path from
 *   "external content" to "tool execution" other than the agent's own two, fixed, bounded calls
 *   (browser.search then optionally browser.fetch) — the *content* returned by those calls never
 *   triggers a further tool call by its own contents.
 * - Every lifecycle transition goes through `requestLifecycleTransition()` (Phase 1's
 *   lifecycle.js), which hardcodes actor: 'AGENT'. This agent never calls, and structurally
 *   cannot call, APPROVE_OPPORTUNITY (that action's `allowedActors` is `['HUMAN']` in
 *   stateMachine.js — reused, not re-implemented). Research ends at SUBMIT_FOR_APPROVAL
 *   (-> AWAITING_OPPORTUNITY_APPROVAL), never further.
 *
 * Research is bounded (this phase's item 15): maxIterations, maxSearches, maxFetches,
 * maxEvidence, maxToolExecutions, and maxDurationMs all terminate the loop deterministically. If
 * no usable evidence was gathered, the run is BLOCKED (INSUFFICIENT_EVIDENCE) and the opportunity
 * is left in RESEARCHING — it is never advanced on the strength of zero evidence.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');
const { RESULT_STATUS: TOOL_RESULT_STATUS } = require('../../tool/types');
const { RESULT_STATUS: MODEL_RESULT_STATUS } = require('../../model/types');
const { createSource } = require('../../research/Source');
const { createEvidence } = require('../../research/Evidence');
const { createResearchRecord } = require('../../research/ResearchRecord');
const { createOpportunityAnalysis } = require('../../research/OpportunityAnalysis');
const { appendResearchRecord, appendOpportunityAnalysis } = require('../../research/persistence');
const {
  requestLifecycleTransition: realRequestLifecycleTransition,
  updateOpportunityContent: realUpdateOpportunityContent,
} = require('../../research/opportunityIntake');
const realStore = require('../../store');
const { BLOCK_REASON } = require('../../research/types');

const DEFAULT_LIMITS = Object.freeze({
  maxIterations: 5,
  maxSearches: 5,
  maxFetches: 5,
  maxEvidence: 15,
  maxToolExecutions: 20,
  maxDurationMs: 20000,
  maxResultsPerSearch: 5,
});

function createResearchAgent({
  toolRuntime,
  modelRouter,
  persistResearchRecord = appendResearchRecord,
  persistOpportunityAnalysis = appendOpportunityAnalysis,
  getOpportunity = realStore.getOpportunity,
  requestLifecycleTransition = realRequestLifecycleTransition,
  updateOpportunityContent = realUpdateOpportunityContent,
} = {}) {
  if (!toolRuntime || typeof toolRuntime.execute !== 'function') {
    throw new TypeError('createResearchAgent requires a ToolRuntime');
  }
  if (!modelRouter || typeof modelRouter.route !== 'function') {
    throw new TypeError('createResearchAgent requires a ModelRouter');
  }

  return defineAgent({
    agent_id: 'research-agent',
    agent_type: 'ResearchAgent',
    version: '1.0.0',
    description: 'Collects and structures evidence for a candidate opportunity via bounded browser.search/browser.fetch tool calls. Never approves opportunities.',
    async run(context) {
      const { opportunity_id, searchQueries } = context.input;
      const limits = { ...DEFAULT_LIMITS, ...(context.input.limits || {}) };

      if (typeof opportunity_id !== 'string' || !opportunity_id.trim()) {
        return { status: RESULT_STATUS.FAILED, errors: ['research-agent requires input.opportunity_id'] };
      }
      if (!Array.isArray(searchQueries) || searchQueries.length === 0 || searchQueries.some((q) => typeof q !== 'string' || !q.trim())) {
        return { status: RESULT_STATUS.FAILED, errors: ['research-agent requires a non-empty input.searchQueries array of strings'] };
      }

      const existing = getOpportunity(opportunity_id);
      if (!existing) {
        return { status: RESULT_STATUS.FAILED, errors: [`research-agent: no opportunity found with id '${opportunity_id}'`] };
      }
      if (existing.lifecycle_state === 'DISCOVERED') {
        try {
          requestLifecycleTransition({ id: opportunity_id, action: 'START_RESEARCH' });
        } catch (e) {
          return { status: RESULT_STATUS.FAILED, errors: [`research-agent: could not start research: ${e.message}`] };
        }
      } else if (existing.lifecycle_state !== 'RESEARCHING') {
        return {
          status: RESULT_STATUS.FAILED,
          errors: [`research-agent: opportunity '${opportunity_id}' is in state '${existing.lifecycle_state}', not researchable (expected DISCOVERED or RESEARCHING)`],
        };
      }

      const researchId = `${context.run_id}-research`;
      const startedAt = Date.now();
      const sources = [];
      const evidence = [];
      const evidenceIdsByQuery = new Map();
      const toolExecutionIds = [];
      let searchCount = 0;
      let fetchCount = 0;
      let toolExecutionCount = 0;
      // The iteration cap itself is a bound: if there are more queries than maxIterations allows,
      // this research pass is incomplete even if the loop below never hits `break` — set this
      // up front rather than only inside the loop's own budget checks.
      let boundHit = searchQueries.length > limits.maxIterations;

      const withinDuration = () => Date.now() - startedAt < limits.maxDurationMs;
      const withinToolBudget = () => toolExecutionCount < limits.maxToolExecutions;

      queryLoop: for (let iteration = 0; iteration < Math.min(searchQueries.length, limits.maxIterations); iteration += 1) {
        const query = searchQueries[iteration];
        if (searchCount >= limits.maxSearches || !withinDuration() || !withinToolBudget()) {
          boundHit = true;
          break;
        }

        const searchExecId = `${researchId}-search-${searchCount}`;
        const searchResult = await toolRuntime.execute({
          execution_id: searchExecId,
          agent_run_id: context.run_id,
          tool_id: 'browser.search',
          actor: 'AGENT',
          input: { query, maxResults: limits.maxResultsPerSearch },
        });
        searchCount += 1;
        toolExecutionCount += 1;
        toolExecutionIds.push(searchExecId);

        if (searchResult.status === TOOL_RESULT_STATUS.BLOCKED) {
          // The provider isn't configured (or is otherwise permanently blocked) — every further
          // search will fail identically, so stop the whole loop rather than burning the bound.
          boundHit = true;
          break;
        }
        if (searchResult.status !== TOOL_RESULT_STATUS.SUCCESS) {
          continue; // this query failed; move on to the next one within the same bounds.
        }

        for (const result of searchResult.output.results || []) {
          if (evidence.length >= limits.maxEvidence || !withinDuration() || !withinToolBudget()) {
            boundHit = true;
            break queryLoop;
          }

          const sourceId = `${researchId}-source-${sources.length}`;
          const source = createSource({
            source_id: sourceId,
            source_type: 'SEARCH_RESULT',
            url: result.url ?? null,
            title: result.title ?? null,
            publisher: result.source ?? null,
            retrieved_at: result.retrieved_at || new Date().toISOString(),
            locator: `search result for query "${query}"`,
          });
          sources.push(source);

          if (typeof result.snippet === 'string' && result.snippet.trim() && evidence.length < limits.maxEvidence) {
            const evidenceId = `${researchId}-evidence-${evidence.length}`;
            evidence.push(
              createEvidence({
                evidence_id: evidenceId,
                source_id: sourceId,
                claim: result.snippet,
                evidence_type: 'REPORTED_CLAIM',
                locator: `search snippet for query "${query}"`,
                extracted_at: new Date().toISOString(),
                confidence: 'OPINION',
              }),
            );
            if (!evidenceIdsByQuery.has(query)) evidenceIdsByQuery.set(query, []);
            evidenceIdsByQuery.get(query).push(evidenceId);
          }

          if (result.url && fetchCount < limits.maxFetches && withinDuration() && withinToolBudget()) {
            const fetchExecId = `${researchId}-fetch-${fetchCount}`;
            const fetchResult = await toolRuntime.execute({
              execution_id: fetchExecId,
              agent_run_id: context.run_id,
              tool_id: 'browser.fetch',
              actor: 'AGENT',
              input: { url: result.url },
            });
            fetchCount += 1;
            toolExecutionCount += 1;
            toolExecutionIds.push(fetchExecId);

            if (fetchResult.status === TOOL_RESULT_STATUS.SUCCESS && evidence.length < limits.maxEvidence) {
              const fetchedContent = fetchResult.output.content || '';
              const excerpt = fetchedContent.replace(/\s+/g, ' ').trim().slice(0, 240);
              if (excerpt) {
                const evidenceId = `${researchId}-evidence-${evidence.length}`;
                evidence.push(
                  createEvidence({
                    evidence_id: evidenceId,
                    source_id: sourceId,
                    claim: excerpt,
                    evidence_type: 'OBSERVATION',
                    locator: 'fetched page, opening excerpt',
                    extracted_at: new Date().toISOString(),
                    confidence: 'OPINION',
                  }),
                );
                evidenceIdsByQuery.get(query).push(evidenceId);
              }
            }
          }
        }
      }

      const agentMetadataBase = { agent_id: 'research-agent', agent_version: '1.0.0', tool_execution_ids: toolExecutionIds };

      if (evidence.length === 0) {
        const emptyRecord = createResearchRecord({
          research_id: researchId,
          opportunity_id,
          sources,
          evidence,
          findings: [],
          unknowns: ['No usable evidence was gathered — search provider may be unconfigured or all queries failed.'],
          agent_metadata: agentMetadataBase,
          incomplete: true,
        });
        persistResearchRecord(emptyRecord);
        return {
          status: RESULT_STATUS.BLOCKED,
          block_reason: `${BLOCK_REASON.INSUFFICIENT_EVIDENCE}: no usable evidence was gathered for opportunity '${opportunity_id}'`,
        };
      }

      const findings = Array.from(evidenceIdsByQuery.entries()).map(([query, ids], i) => ({
        finding_id: `${researchId}-finding-${i}`,
        statement: `Multiple sources returned claims related to the search query: "${query}"`,
        supporting_evidence_ids: ids,
      }));

      const researchRecordDraft = {
        research_id: researchId,
        opportunity_id,
        sources,
        evidence,
        findings,
        user_pains: evidence.map((e) => e.claim),
        existing_solutions: [],
        competitors: [],
        market_signals: [],
        risks: ['Market size and commercial viability were not independently verified by this research.'],
        unknowns: ['Source independence was not statistically validated — repeated claims may share a common origin.'],
        research_questions: Array.isArray(context.input.researchQuestions) ? context.input.researchQuestions : [],
        agent_metadata: agentMetadataBase,
        incomplete: boundHit,
      };

      // -- Model Router integration: synthesize an opportunity-hypothesis phrase from evidence.
      // Model output is untrusted, exactly like tool output — it is only ever used as the
      // `opportunity_hypothesis.statement` text, explicitly typed HYPOTHESIS, never as evidence.
      const modelRequestId = `${researchId}-model-request`;
      const topClaims = evidence.slice(0, 5).map((e) => e.claim);
      const modelResult = await modelRouter.route({
        request_id: modelRequestId,
        agent_run_id: context.run_id,
        task_type: 'opportunity_synthesis',
        model_requirements: { capabilities: ['text_generation'] },
        input: { topClaims },
      });

      let hypothesisStatement;
      let modelMetadata = { model_id: null, provider_id: null };
      if (modelResult.status === MODEL_RESULT_STATUS.SUCCESS) {
        const modelText = modelResult.output && typeof modelResult.output.text === 'string' ? modelResult.output.text : null;
        hypothesisStatement = modelText
          ? `Potential opportunity, informed by ${evidence.length} evidence item(s): ${modelText}`
          : `Potential opportunity based on ${evidence.length} evidence item(s) gathered for this candidate.`;
        modelMetadata = { model_id: modelResult.model_id, provider_id: modelResult.provider_id };
      } else {
        hypothesisStatement = `Potential opportunity based on ${evidence.length} evidence item(s) gathered for this candidate (model synthesis unavailable).`;
      }

      const researchRecord = createResearchRecord({
        ...researchRecordDraft,
        agent_metadata: { ...agentMetadataBase, ...modelMetadata },
      });
      persistResearchRecord(researchRecord);

      const allEvidenceIds = evidence.map((e) => e.evidence_id);
      const opportunityAnalysis = createOpportunityAnalysis(
        {
          analysis_id: `${researchId}-analysis`,
          opportunity_id,
          evidence_backed_observations: [{ statement: 'Sources reported the following claims.', evidence_ids: allEvidenceIds }],
          user_problem: { statement: evidence[0].claim, evidence_ids: allEvidenceIds },
          existing_alternatives: [],
          differentiation_hypothesis: {
            statement: 'Insufficient competitor research was performed in this pass to establish a differentiation hypothesis.',
            evidence_ids: [],
          },
          market_signal: {
            statement: `${evidence.length} claim(s) from ${sources.length} source(s) relate to this problem.`,
            evidence_ids: allEvidenceIds,
            strength: evidence.length >= 5 ? 'moderate' : 'weak',
          },
          risks: researchRecordDraft.risks,
          unknowns: researchRecordDraft.unknowns,
          opportunity_hypothesis: { statement: hypothesisStatement, evidence_ids: [] },
          agent_metadata: { ...agentMetadataBase, ...modelMetadata },
        },
        researchRecord,
      );
      persistOpportunityAnalysis(opportunityAnalysis);

      try {
        updateOpportunityContent(opportunity_id, {
          evidence: evidence.slice(0, 10).map((e) => ({
            claim: e.claim,
            source_url: sources.find((s) => s.source_id === e.source_id)?.url || undefined,
            type: e.confidence,
          })),
          proposed_solution: hypothesisStatement,
          market_signal: opportunityAnalysis.market_signal.strength,
        });
        requestLifecycleTransition({ id: opportunity_id, action: 'COMPLETE_RESEARCH' });
        requestLifecycleTransition({ id: opportunity_id, action: 'SUBMIT_FOR_APPROVAL' });
      } catch (e) {
        return {
          status: RESULT_STATUS.FAILED,
          errors: [`research-agent: research completed but lifecycle transition failed: ${e.message}`],
        };
      }

      return {
        status: RESULT_STATUS.SUCCESS,
        output: {
          research_id: researchRecord.research_id,
          analysis_id: opportunityAnalysis.analysis_id,
          opportunity_id,
          evidence_count: evidence.length,
          source_count: sources.length,
          incomplete: boundHit,
          resulting_state: 'AWAITING_OPPORTUNITY_APPROVAL',
        },
      };
    },
  });
}

module.exports = { createResearchAgent, DEFAULT_LIMITS };
