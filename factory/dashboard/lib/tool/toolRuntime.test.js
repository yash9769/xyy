'use strict';

/**
 * Regression tests for the Phase 3 Tool Runtime. Run with: node --test factory/dashboard/lib/tool
 *
 * Persistence and audit calls are injected as fakes throughout (ToolRuntime accepts
 * persistToolExecution/appendAudit options), same discipline as the Agent Runtime and Model
 * Router test suites, so this file never writes to the real factory/state/*.jsonl files.
 *
 * Runs entirely offline and requires no shell/network/filesystem access beyond what Node's own
 * module loading needs — echo-tool has no side effects of any kind.
 */

const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { defineTool } = require('./Tool');
const { createToolExecutionRequest } = require('./ToolExecutionRequest');
const { validateToolResult } = require('./ToolResult');
const { ToolRegistry } = require('./ToolRegistry');
const { ToolRuntime } = require('./runtime');
const { echoTool } = require('./tools/echoTool');
const { humanOnlyMockTool } = require('./tools/humanOnlyMockTool');
const {
  RESULT_STATUS,
  BLOCK_REASON,
  ToolContractError,
  ToolRequestError,
  ToolResultError,
  UnknownToolError,
  DuplicateToolError,
} = require('./types');
const stateMachine = require('../stateMachine');

function fakeRecorders() {
  const toolExecutions = [];
  const auditEntries = [];
  return {
    toolExecutions,
    auditEntries,
    persistToolExecution: (record) => toolExecutions.push(record),
    appendAudit: (entry) => {
      auditEntries.push(entry);
      return entry;
    },
  };
}

function buildRegistry() {
  const registry = new ToolRegistry();
  registry.register(echoTool);
  registry.register(humanOnlyMockTool);
  return registry;
}

function baseRequest(overrides = {}) {
  return {
    execution_id: 'exec-1',
    agent_run_id: 'run-1',
    tool_id: 'echo-tool',
    actor: 'AGENT',
    input: { message: 'hello' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tool contract
// ---------------------------------------------------------------------------

test('tool contract: a valid tool is accepted', () => {
  assert.equal(echoTool.tool_id, 'echo-tool');
  assert.ok(Object.isFrozen(echoTool));
});

test('tool contract: missing metadata rejected', () => {
  assert.throws(() => defineTool({ tool_id: 'x', tool_type: 't', version: '1', description: '' }), ToolContractError);
  assert.throws(() => defineTool({ tool_id: '', tool_type: 't', version: '1', description: 'd' }), ToolContractError);
});

test('tool contract: invalid side-effect level rejected', () => {
  assert.throws(
    () =>
      defineTool({
        tool_id: 'bad-tool',
        tool_type: 't',
        version: '1.0.0',
        description: 'd',
        side_effect_level: 'TOTALLY_MADE_UP',
        allowedActors: ['AGENT'],
        validateInput: () => ({}),
        execute: () => ({ status: 'SUCCESS' }),
      }),
    ToolContractError,
  );
});

test('tool contract: missing side-effect level rejected (never assumed safe)', () => {
  assert.throws(
    () =>
      defineTool({
        tool_id: 'bad-tool-2',
        tool_type: 't',
        version: '1.0.0',
        description: 'd',
        allowedActors: ['AGENT'],
        validateInput: () => ({}),
        execute: () => ({ status: 'SUCCESS' }),
      }),
    ToolContractError,
  );
});

test('tool contract: invalid executor rejected', () => {
  assert.throws(
    () =>
      defineTool({
        tool_id: 'bad-tool-3',
        tool_type: 't',
        version: '1.0.0',
        description: 'd',
        side_effect_level: 'READ_ONLY',
        allowedActors: ['AGENT'],
        validateInput: () => ({}),
        execute: 'not-a-function',
      }),
    ToolContractError,
  );
  assert.throws(
    () =>
      defineTool({
        tool_id: 'bad-tool-4',
        tool_type: 't',
        version: '1.0.0',
        description: 'd',
        side_effect_level: 'READ_ONLY',
        allowedActors: ['AGENT'],
        validateInput: 'not-a-function',
        execute: () => ({ status: 'SUCCESS' }),
      }),
    ToolContractError,
  );
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test('registry: registration and retrieval', () => {
  const registry = buildRegistry();
  assert.equal(registry.get('echo-tool'), echoTool);
  assert.equal(registry.has('echo-tool'), true);
});

test('registry: duplicate rejection', () => {
  const registry = buildRegistry();
  assert.throws(() => registry.register(echoTool), DuplicateToolError);
});

test('registry: unknown tool', () => {
  const registry = buildRegistry();
  assert.throws(() => registry.get('no-such-tool'), UnknownToolError);
});

test('registry: listing exposes metadata only, not execute()', () => {
  const registry = buildRegistry();
  const listed = registry.list();
  assert.ok(listed.some((t) => t.tool_id === 'echo-tool'));
  assert.equal(typeof listed.find((t) => t.tool_id === 'echo-tool').execute, 'undefined');
});

test('registry: a dynamic path/string cannot be registered as a tool', () => {
  const registry = new ToolRegistry();
  assert.throws(() => registry.register('./some/malicious/path.js'), TypeError);
  assert.throws(() => registry.register({ tool_id: 'x' }), TypeError); // no execute/validateInput
});

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

test('request: valid request accepted', () => {
  const request = createToolExecutionRequest(baseRequest());
  assert.equal(request.tool_id, 'echo-tool');
  assert.ok(Object.isFrozen(request));
});

test('request: malformed request rejected', () => {
  assert.throws(() => createToolExecutionRequest({}), ToolRequestError);
  assert.throws(() => createToolExecutionRequest(baseRequest({ execution_id: '' })), ToolRequestError);
});

test('request: invalid actor rejected (HUMAN cannot be requested this way)', () => {
  assert.throws(() => createToolExecutionRequest(baseRequest({ actor: 'HUMAN' })), ToolRequestError);
  assert.throws(() => createToolExecutionRequest(baseRequest({ actor: 'ROBOT' })), ToolRequestError);
});

test('request: non-serializable input rejected', () => {
  assert.throws(() => createToolExecutionRequest(baseRequest({ input: { fn: () => {} } })), ToolRequestError);
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

test('permissions: AGENT allowed for a safe (non-HUMAN-only) tool', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest());
  assert.equal(result.status, RESULT_STATUS.SUCCESS);
});

test('permissions: AGENT is blocked for a HUMAN-only tool', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', input: {} }));
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.HUMAN_APPROVAL_REQUIRED);
});

test('permissions: SYSTEM is also blocked for a HUMAN-only tool (policy applies to more than just AGENT)', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', actor: 'SYSTEM', input: {} }));
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.HUMAN_APPROVAL_REQUIRED);
});

test('permissions: HUMAN identity cannot be spoofed through request fields', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  // execute() rejects actor: 'HUMAN' outright, before the tool is even resolved.
  const result = await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', actor: 'HUMAN', input: {} }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_REQUEST/);
});

test('permissions: HUMAN can reach a HUMAN-only tool only through executeAsHumanConfirmed(), with real confirmation', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const confirmed = await runtime.executeAsHumanConfirmed(
    { execution_id: 'exec-human-1', agent_run_id: 'run-1', tool_id: 'human-only-mock-tool', input: { confirmationNote: 'ok' } },
    { confirmHuman: async () => true },
  );
  assert.equal(confirmed.status, RESULT_STATUS.SUCCESS);

  const rejected = await runtime.executeAsHumanConfirmed(
    { execution_id: 'exec-human-2', agent_run_id: 'run-1', tool_id: 'human-only-mock-tool', input: {} },
    { confirmHuman: async () => false },
  );
  assert.equal(rejected.status, RESULT_STATUS.BLOCKED);
});

test('permissions: executeAsHumanConfirmed ignores any actor field a caller tries to smuggle in', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, auditEntries } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.executeAsHumanConfirmed(
    { execution_id: 'exec-human-3', agent_run_id: 'run-1', tool_id: 'human-only-mock-tool', actor: 'SYSTEM', input: {} },
    { confirmHuman: async () => true },
  );
  // Regardless of the caller passing actor: 'SYSTEM', the audited actor is 'HUMAN' because only a
  // real confirmation determines identity on this path.
  assert.equal(auditEntries[0].actor, 'HUMAN');
});

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

test('runtime: successful execution', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: 'hi there' } }));
  assert.equal(result.status, RESULT_STATUS.SUCCESS);
  assert.deepEqual(result.output, { message: 'hi there' });
});

test('runtime: failed execution (unknown tool) is a controlled result, not a thrown exception', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ tool_id: 'no-such-tool' }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /UNKNOWN_TOOL/);
});

test('runtime: failed execution (non-technical tool failure) is not retried', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '__SIMULATE_NON_TECHNICAL_FAILURE__' } }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.equal(toolExecutions[0].attempts, 1); // no retry attempted
});

test('runtime: blocked execution (permission denied)', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', input: {} }));
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
});

test('runtime: timeout is enforced and does not hang', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '__SIMULATE_TIMEOUT__' }, limits: { timeoutMs: 50 } }));
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.match(result.block_reason, /EXECUTION_TIMEOUT/);
});

test('runtime: bounded retry — echo-tool allows 1 retry, technical failure eventually exhausts it', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '__SIMULATE_TECHNICAL_FAILURE__' } }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /MAX_RETRIES_EXCEEDED/);
  assert.equal(toolExecutions[0].attempts, 2); // 1 initial + 1 retry (echo-tool's retryPolicy.maxRetries = 1)
});

test('runtime: a tool with zero retries configured is not retried at all', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  // human-only-mock-tool has maxRetries: 0 — but permission denial happens before any execute()
  // attempt anyway (AGENT blocked), so use executeAsHumanConfirmed with a technical failure
  // simulated via a custom tool instead to isolate the retry=0 behavior precisely.
  const zeroRetryRegistry = new ToolRegistry();
  const { defineTool } = require('./Tool');
  const { ToolTechnicalError, RESULT_STATUS: RS } = require('./types');
  zeroRetryRegistry.register(
    defineTool({
      tool_id: 'zero-retry-tool',
      tool_type: 'test',
      version: '1.0.0',
      description: 'always fails technically, zero retries configured',
      side_effect_level: 'READ_ONLY',
      allowedActors: ['AGENT'],
      retryPolicy: { maxRetries: 0 },
      validateInput: (i) => i,
      execute: () => {
        throw new ToolTechnicalError('always fails');
      },
    }),
  );
  const zeroRuntime = new ToolRuntime(zeroRetryRegistry, { persistToolExecution, appendAudit });
  const result = await zeroRuntime.execute(baseRequest({ tool_id: 'zero-retry-tool', input: {} }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.equal(toolExecutions[toolExecutions.length - 1].attempts, 1);
});

test('runtime: malformed tool output becomes a controlled FAILED result', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '__SIMULATE_MALFORMED__' } }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_OUTPUT/);
});

test('runtime: invalid input is rejected before execute() is ever called', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '' } }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_INPUT/);
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

test('persistence: ToolExecution record written with correct metadata', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest());

  assert.equal(toolExecutions.length, 1);
  const record = toolExecutions[0];
  assert.equal(record.execution_id, 'exec-1');
  assert.equal(record.agent_run_id, 'run-1');
  assert.equal(record.tool_id, 'echo-tool');
  assert.equal(record.tool_version, '1.0.0');
  assert.equal(record.actor, 'AGENT');
  assert.equal(record.status, 'SUCCESS');
  assert.equal(record.side_effect_level, 'READ_ONLY');
  assert.ok(record.started_at);
  assert.ok(record.finished_at);
});

test('persistence: failure is recorded', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ input: { message: '__SIMULATE_NON_TECHNICAL_FAILURE__' } }));
  assert.equal(toolExecutions[0].status, 'FAILED');
});

test('persistence: block is recorded', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', input: {} }));
  assert.equal(toolExecutions[0].status, 'BLOCKED');
});

test('persistence: retry information is recorded', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, toolExecutions } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ input: { message: '__SIMULATE_TECHNICAL_FAILURE__' } }));
  assert.equal(toolExecutions[0].attempts, 2);
  assert.equal(toolExecutions[0].retried, true);
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

test('audit: TOOL_EXECUTION event created with correct actor and tool metadata', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, auditEntries } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest());

  assert.equal(auditEntries.length, 1);
  const entry = auditEntries[0];
  assert.equal(entry.actor, 'AGENT');
  assert.equal(entry.action, 'TOOL_EXECUTION');
  assert.match(entry.note, /tool_id=echo-tool/);
  assert.match(entry.note, /status=SUCCESS/);
});

test('audit: blocked execution is audited', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, auditEntries } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ tool_id: 'human-only-mock-tool', input: {} }));
  assert.match(auditEntries[0].note, /status=BLOCKED/);
  assert.equal(auditEntries[0].actor, 'AGENT');
});

test('audit: failed execution is audited', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, auditEntries } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ input: { message: '__SIMULATE_NON_TECHNICAL_FAILURE__' } }));
  assert.match(auditEntries[0].note, /status=FAILED/);
});

test('audit: retry is audited (attempts count included)', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit, auditEntries } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  await runtime.execute(baseRequest({ input: { message: '__SIMULATE_TECHNICAL_FAILURE__' } }));
  assert.match(auditEntries[0].note, /attempts=2/);
});

// ---------------------------------------------------------------------------
// Model/agent-provided tool_id does not automatically execute
// ---------------------------------------------------------------------------

test('model/agent output cannot force execution merely by naming a tool_id', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  // Simulates a model/agent "hallucinating" a plausible-looking but unregistered tool.
  const result = await runtime.execute(baseRequest({ tool_id: 'shell.execute' }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /UNKNOWN_TOOL/);
});

test('model/agent-supplied malformed input still goes through full validation, not a shortcut', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: 12345 } })); // wrong type
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_INPUT/);
});

// ---------------------------------------------------------------------------
// Security / isolation
// ---------------------------------------------------------------------------

test('security: tool output cannot claim HUMAN or approve lifecycle state', () => {
  const request = createToolExecutionRequest(baseRequest());
  assert.throws(
    () => validateToolResult({ status: 'SUCCESS', output: { actor: 'HUMAN' } }, request, echoTool),
    ToolResultError,
  );
  assert.throws(
    () => validateToolResult({ status: 'SUCCESS', output: { lifecycle_state: 'PUBLISHED' } }, request, echoTool),
    ToolResultError,
  );
});

test('security: end-to-end reserved-key attempt is rejected as a controlled failure', async () => {
  const registry = buildRegistry();
  const { persistToolExecution, appendAudit } = fakeRecorders();
  const runtime = new ToolRuntime(registry, { persistToolExecution, appendAudit });

  const result = await runtime.execute(baseRequest({ input: { message: '__SIMULATE_RESERVED_KEY__' } }));
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_OUTPUT/);
});

test('security: the Tool Runtime module contains no shell/process/network/env/dynamic-loading capability', () => {
  const files = ['./runtime.js', './Tool.js', './ToolRegistry.js', './ToolExecutionRequest.js', './ToolResult.js', './persistence.js', './index.js'];
  for (const f of files) {
    const source = fs.readFileSync(require.resolve(f), 'utf8');
    assert.doesNotMatch(source, /child_process/);
    assert.doesNotMatch(source, /\bexec\(|\bexecSync\(|\bspawn\(/);
    assert.doesNotMatch(source, /process\.env/);
    assert.doesNotMatch(source, /\bhttp\.|https\.|fetch\(/);
  }
});

test('security: echo-tool itself requires none of the disallowed capabilities', () => {
  const source = fs.readFileSync(require.resolve('./tools/echoTool.js'), 'utf8');
  assert.doesNotMatch(source, /child_process|require\(['"]fs['"]\)|require\(['"]http['"]\)|process\.env/);
});

test('security: the Tool Runtime does not bypass stateMachine.js or store.js', () => {
  const runtimeSource = fs.readFileSync(require.resolve('./runtime.js'), 'utf8');
  assert.doesNotMatch(runtimeSource, /require\(['"].*stateMachine['"]\)/);
  assert.doesNotMatch(runtimeSource, /store\.transition/);
  // The one real lifecycle invariant this phase must not weaken:
  assert.throws(
    () => stateMachine.validate('AWAITING_OPPORTUNITY_APPROVAL', 'APPROVE_OPPORTUNITY', 'AGENT'),
    stateMachine.InvalidTransitionError,
  );
});

// ---------------------------------------------------------------------------
// Integration: Agent -> ToolRuntime -> echo-tool -> ToolResult -> AgentResult
// ---------------------------------------------------------------------------

test('integration: Agent -> ToolRuntime -> echo-tool -> ToolResult -> AgentResult', async () => {
  const { AgentRegistry, AgentRunner } = require('../agent');
  const { createToolTestAgent } = require('../agent/agents/toolTestAgent');

  const toolRegistry = buildRegistry();
  const { persistToolExecution, appendAudit: appendToolAudit } = fakeRecorders();
  const toolRuntime = new ToolRuntime(toolRegistry, { persistToolExecution, appendAudit: appendToolAudit });

  const agentRegistry = new AgentRegistry();
  agentRegistry.register(createToolTestAgent(toolRuntime));
  const { persistAgentRun, appendAudit: appendAgentAudit } = (() => {
    const runs = [];
    return { persistAgentRun: (r) => runs.push(r), appendAudit: appendToolAudit, runs };
  })();
  const agentRunner = new AgentRunner(agentRegistry, { persistAgentRun, appendAudit: appendToolAudit });

  const agentResult = await agentRunner.run({
    run_id: 'integration-run-1',
    agent_id: 'tool-test-agent',
    input: { toolInput: { message: 'integration test' } },
  });

  assert.equal(agentResult.status, 'SUCCESS');
  assert.equal(agentResult.output.tool_id, 'echo-tool');
  assert.deepEqual(agentResult.output.tool_output, { message: 'integration test' });
});
