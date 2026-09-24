'use strict';

/**
 * discovery-agent — generates candidate opportunity hypotheses from human/config-provided seed
 * problems (doc 07 §5's DiscoveryAgent: "Find potential problems and application opportunities...
 * must not approve opportunities"). It does not invent demand, market size, or evidence — a
 * hypothesis produced here is exactly that, tagged `status: 'HYPOTHESIS'`, never presented as a
 * verified finding. There is no autonomous trend-scraping in this phase (no such tool exists, and
 * none was built here) — seeds come from the caller (a human operator, or a config file read by
 * the caller), consistent with `factory/docs/00-VISION.md`'s progressive-automation framing and
 * this phase's explicit "do not invent demand numbers" instruction.
 *
 * When `input.createCandidates` is true, it also creates the actual DISCOVERED-state
 * opportunity.json for each hypothesis via research/opportunityIntake.js — the same, unmodified
 * Phase 0 convention `cli.js`'s `discover` command already uses. It never approves anything.
 *
 * `createDiscoveryAgent()` takes an injectable `createCandidateOpportunity` (defaults to the real
 * one) so automated tests can exercise this agent without touching the real filesystem/audit log
 * — same discipline as AgentRunner/ModelRouter/ToolRuntime's injectable persist/audit functions.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');
const { createCandidateOpportunity: realCreateCandidateOpportunity } = require('../../research/opportunityIntake');

function createDiscoveryAgent({ createCandidateOpportunity = realCreateCandidateOpportunity } = {}) {
  return defineAgent({
    agent_id: 'discovery-agent',
    agent_type: 'DiscoveryAgent',
    version: '1.0.0',
    description: 'Generates candidate opportunity hypotheses from provided seed problems. Never approves opportunities.',
    run(context) {
      const seeds = context.input.seedProblems;
      if (!Array.isArray(seeds) || seeds.length === 0) {
        return { status: RESULT_STATUS.FAILED, errors: ['discovery-agent requires a non-empty input.seedProblems array'] };
      }
      for (const seed of seeds) {
        if (
          typeof seed !== 'object' ||
          seed === null ||
          typeof seed.problem !== 'string' ||
          !seed.problem.trim() ||
          typeof seed.category !== 'string' ||
          !seed.category.trim() ||
          typeof seed.target_user !== 'string' ||
          !seed.target_user.trim()
        ) {
          return {
            status: RESULT_STATUS.FAILED,
            errors: ['discovery-agent: each seedProblems entry requires non-empty problem, category, and target_user strings'],
          };
        }
      }

      const hypotheses = [];
      for (let i = 0; i < seeds.length; i += 1) {
        const seed = seeds[i];
        const hypothesisId = `${context.run_id}-hypothesis-${i}`;
        let opportunityId = null;

        if (context.input.createCandidates === true) {
          try {
            const record = createCandidateOpportunity({
              problem: seed.problem,
              category: seed.category,
              target_user: seed.target_user,
              differentiation: seed.differentiation,
            });
            opportunityId = record.id;
          } catch (e) {
            return { status: RESULT_STATUS.FAILED, errors: [`discovery-agent: failed to create candidate opportunity: ${e.message}`] };
          }
        }

        hypotheses.push({
          hypothesis_id: hypothesisId,
          problem: seed.problem,
          category: seed.category,
          target_user: seed.target_user,
          opportunity_id: opportunityId,
          status: 'HYPOTHESIS',
        });
      }

      return { status: RESULT_STATUS.SUCCESS, output: { hypotheses } };
    },
  });
}

module.exports = { createDiscoveryAgent };
