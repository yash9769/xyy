'use strict';

/**
 * Agent Runtime — Phase 1 (factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md). Public entry point for
 * the runtime: everything under factory/dashboard/lib/agent/ is reached through this file or by
 * requiring a submodule directly for tests. This module does not start anything on require() —
 * `createDefaultRegistry()`/`createDefaultRunner()` are explicit constructors, not side effects.
 */

const { defineAgent } = require('./Agent');
const { createAgentContext } = require('./AgentContext');
const { validateAgentResult } = require('./AgentResult');
const { AgentRegistry } = require('./registry');
const { AgentRunner } = require('./runner');
const { requestLifecycleTransition } = require('./lifecycle');
const { appendAgentRun, readAgentRuns } = require('./persistence');
const { echoAgent } = require('./agents/echoAgent');
const types = require('./types');

function createDefaultRegistry() {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  return registry;
}

function createDefaultRunner(options) {
  return new AgentRunner(createDefaultRegistry(), options);
}

module.exports = {
  defineAgent,
  createAgentContext,
  validateAgentResult,
  AgentRegistry,
  AgentRunner,
  requestLifecycleTransition,
  appendAgentRun,
  readAgentRuns,
  echoAgent,
  createDefaultRegistry,
  createDefaultRunner,
  ...types,
};
