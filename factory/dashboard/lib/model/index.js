'use strict';

/**
 * Model Router — Phase 2 (factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md). Public entry point,
 * mirroring factory/dashboard/lib/agent/index.js's shape. `createDefaultRouter()` wires up the
 * one mock provider and two deterministic test models; it is an explicit constructor, not a
 * side effect of require().
 */

const { defineProvider } = require('./ModelProvider');
const { createModelRequest } = require('./ModelRequest');
const { validateModelResponse } = require('./ModelResponse');
const { ProviderRegistry } = require('./providerRegistry');
const { ModelRegistry } = require('./modelRegistry');
const { selectModel } = require('./routingPolicy');
const { ModelRouter } = require('./router');
const { appendModelRun, readModelRuns } = require('./persistence');
const { createMockProvider } = require('./providers/mockProvider');
const types = require('./types');

function createDefaultRegistries() {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());

  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({
    model_id: 'mock-cheap-model',
    provider_id: 'mock-provider',
    capabilities: ['text_generation', 'structured_output'],
    context_limit: 8000,
    priority: 10,
    costPerCallUsd: 0.001,
  });
  modelRegistry.register({
    model_id: 'mock-expensive-model',
    provider_id: 'mock-provider',
    capabilities: ['text_generation', 'structured_output', 'long_context'],
    context_limit: 128000,
    priority: 20,
    costPerCallUsd: 0.05,
  });

  return { providerRegistry, modelRegistry };
}

function createDefaultRouter(options) {
  const { providerRegistry, modelRegistry } = createDefaultRegistries();
  return new ModelRouter(providerRegistry, modelRegistry, options);
}

module.exports = {
  defineProvider,
  createModelRequest,
  validateModelResponse,
  ProviderRegistry,
  ModelRegistry,
  selectModel,
  ModelRouter,
  appendModelRun,
  readModelRuns,
  createMockProvider,
  createDefaultRegistries,
  createDefaultRouter,
  ...types,
};
