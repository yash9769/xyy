'use strict';

/**
 * Tool Runtime — Phase 3 (factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md). Public entry point,
 * mirroring factory/dashboard/lib/agent/index.js and factory/dashboard/lib/model/index.js.
 * `createDefaultRegistry()`/`createDefaultRuntime()` are explicit constructors, not side effects
 * of require().
 */

const { defineTool } = require('./Tool');
const { createToolExecutionRequest } = require('./ToolExecutionRequest');
const { validateToolResult } = require('./ToolResult');
const { ToolRegistry } = require('./ToolRegistry');
const { ToolRuntime } = require('./runtime');
const { appendToolExecution, readToolExecutions } = require('./persistence');
const { echoTool } = require('./tools/echoTool');
const { humanOnlyMockTool } = require('./tools/humanOnlyMockTool');
const types = require('./types');

function createDefaultRegistry() {
  const registry = new ToolRegistry();
  registry.register(echoTool);
  registry.register(humanOnlyMockTool);
  return registry;
}

function createDefaultRuntime(options) {
  return new ToolRuntime(createDefaultRegistry(), options);
}

module.exports = {
  defineTool,
  createToolExecutionRequest,
  validateToolResult,
  ToolRegistry,
  ToolRuntime,
  appendToolExecution,
  readToolExecutions,
  echoTool,
  humanOnlyMockTool,
  createDefaultRegistry,
  createDefaultRuntime,
  ...types,
};
