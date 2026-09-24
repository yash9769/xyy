'use strict';

/**
 * Product Factory — Phase 5. Public entry point, mirroring research/index.js. Reuses the Agent
 * Runtime (Phase 1) and Model Router (Phase 2) verbatim; no ToolRuntime is wired because the
 * ProductAgent needs no tools.
 */

const { createClaim } = require('./Claim');
const { createProductSpecification, isValidatedProductSpecification } = require('./ProductSpecification');
const { validateSpecificationCandidate } = require('./validation');
const { validateAgainstSchema, loadProductSpecificationSchema } = require('./schemaValidator');
const { buildProductModelInput } = require('./modelInput');
const { createProductSpecificationStore, defaultStore, PRODUCT_SPECIFICATIONS_LOG_PATH } = require('./persistence');
const types = require('./types');

const { ProviderRegistry, ModelRegistry, ModelRouter } = require('../model');
const { createMockProvider } = require('../model/providers/mockProvider');
const { AgentRegistry, AgentRunner } = require('../agent');
const { createProductAgent } = require('../agent/agents/productAgent');

/**
 * Offline, deterministic ModelRouter (mock-provider only, no API keys). The mock provider returns
 * plain text, not a specification, so with this default router every generation is rejected at
 * STRUCTURAL validation and nothing is persisted — the honest outcome while no real provider is
 * configured (same posture as browser.search's SEARCH_PROVIDER_NOT_CONFIGURED in Phase 4).
 */
function createProductModelRouter(options) {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());
  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({
    model_id: 'mock-product-model',
    provider_id: 'mock-provider',
    capabilities: [...types.REQUIRED_CAPABILITIES],
    priority: 10,
    costPerCallUsd: 0.001,
  });
  return new ModelRouter(providerRegistry, modelRegistry, options);
}

/** Wires the ProductAgent into a fresh AgentRegistry/AgentRunner. */
function createProductAgentRunner({ modelRouter, runnerOptions, agentOptions } = {}) {
  const registry = new AgentRegistry();
  registry.register(createProductAgent({ ...(agentOptions || {}), modelRouter: modelRouter || createProductModelRouter() }));
  return new AgentRunner(registry, runnerOptions);
}

module.exports = {
  createClaim,
  createProductSpecification,
  isValidatedProductSpecification,
  validateSpecificationCandidate,
  validateAgainstSchema,
  loadProductSpecificationSchema,
  buildProductModelInput,
  createProductSpecificationStore,
  defaultStore,
  PRODUCT_SPECIFICATIONS_LOG_PATH,
  createProductModelRouter,
  createProductAgentRunner,
  createProductAgent,
  ...types,
};
