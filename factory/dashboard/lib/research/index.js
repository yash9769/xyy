'use strict';

/**
 * Research Factory — Phase 4 (factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md). Public entry point,
 * mirroring the agent/model/tool `index.js` files. Reuses `ToolRegistry`/`ToolRuntime` (Phase 3)
 * and `ProviderRegistry`/`ModelRegistry`/`ModelRouter` (Phase 2) verbatim — nothing here is a
 * parallel runtime.
 */

const { createSource } = require('./Source');
const { createEvidence } = require('./Evidence');
const { createResearchRecord } = require('./ResearchRecord');
const { createOpportunityAnalysis } = require('./OpportunityAnalysis');
const { appendResearchRecord, readResearchRecords, appendOpportunityAnalysis, readOpportunityAnalyses } = require('./persistence');
const { createCandidateOpportunity, updateOpportunityContent, requestLifecycleTransition } = require('./opportunityIntake');
const types = require('./types');

const { ToolRegistry, ToolRuntime } = require('../tool');
const { createBrowserSearchTool } = require('../tool/tools/browserSearchTool');
const { createBrowserFetchTool } = require('../tool/tools/browserFetchTool');
const { ProviderRegistry, ModelRegistry, ModelRouter } = require('../model');
const { createMockProvider } = require('../model/providers/mockProvider');
const { AgentRegistry, AgentRunner } = require('../agent');
const { createDiscoveryAgent } = require('../agent/agents/discoveryAgent');
const { createResearchAgent } = require('../agent/agents/researchAgent');

/** @param {object} [options] { searchImpl, fetchImpl } — omit for the safe not-configured default. */
function createResearchToolRegistry({ searchImpl, fetchImpl } = {}) {
  const registry = new ToolRegistry();
  registry.register(createBrowserSearchTool({ searchImpl }));
  registry.register(createBrowserFetchTool(fetchImpl ? { fetchImpl } : {}));
  return registry;
}

function createResearchToolRuntime(options) {
  const { searchImpl, fetchImpl, ...runtimeOptions } = options || {};
  return new ToolRuntime(createResearchToolRegistry({ searchImpl, fetchImpl }), runtimeOptions);
}

/** A deterministic, offline ModelRouter (mock-provider only) for research synthesis — the same
 * "one mock provider, no API keys" posture as Phase 2's own createDefaultRegistries(). */
function createResearchModelRouter(options) {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());
  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({
    model_id: 'mock-research-model',
    provider_id: 'mock-provider',
    capabilities: ['text_generation', 'structured_output'],
    priority: 10,
    costPerCallUsd: 0.001,
  });
  return new ModelRouter(providerRegistry, modelRegistry, options);
}

/** Wires DiscoveryAgent + ResearchAgent into a fresh AgentRegistry/AgentRunner, using the given
 * (or default, offline) ToolRuntime/ModelRouter. */
function createResearchAgentRunner({ toolRuntime, modelRouter, runnerOptions } = {}) {
  const resolvedToolRuntime = toolRuntime || createResearchToolRuntime();
  const resolvedModelRouter = modelRouter || createResearchModelRouter();
  const registry = new AgentRegistry();
  registry.register(createDiscoveryAgent());
  registry.register(createResearchAgent({ toolRuntime: resolvedToolRuntime, modelRouter: resolvedModelRouter }));
  return new AgentRunner(registry, runnerOptions);
}

module.exports = {
  createSource,
  createEvidence,
  createResearchRecord,
  createOpportunityAnalysis,
  appendResearchRecord,
  readResearchRecords,
  appendOpportunityAnalysis,
  readOpportunityAnalyses,
  createCandidateOpportunity,
  updateOpportunityContent,
  requestLifecycleTransition,
  createResearchToolRegistry,
  createResearchToolRuntime,
  createResearchModelRouter,
  createResearchAgentRunner,
  ...types,
};
