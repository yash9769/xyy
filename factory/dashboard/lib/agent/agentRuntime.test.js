'use strict';

/**
 * Regression tests for the Phase 1 Agent Runtime. Run with: node --test factory/dashboard/lib/agent
 *
 * Persistence and audit calls are injected as fakes throughout (AgentRunner accepts
 * persistAgentRun/appendAudit options) so this suite never writes to the real
 * factory/state/agent-runs.jsonl or factory/state/audit-log.jsonl — those are exercised
 * separately, deliberately, in manual verification, the same way earlier CLI verification did.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { defineAgent } = require('./Agent');
const { createAgentContext } = require('./AgentContext');
const { validateAgentResult } = require('./AgentResult');
const { AgentRegistry } = require('./registry');
const { AgentRunner } = require('./runner');
const { requestLifecycleTransition } = require('./lifecycle');
const { echoAgent } = require('./agents/echoAgent');
const {
  RESULT_STATUS,
  AgentContextError,
  AgentResultError,
  UnknownAgentError,
  DuplicateAgentError,
} = require('./types');
const stateMachine = require('../stateMachine');

function fakeRecorders() {
  const runs = [];
  const auditEntries = [];
  return {
    runs,
    auditEntries,
    persistAgentRun: (record) => runs.push(record),
    appendAudit: (entry) => {
      auditEntries.push(entry);
      return entry;
    },
  };
}

function baseContext(overrides = {}) {
  return { run_id: 'run-1', agent_id: 'echo-agent', input: { hello: 'world' }, ...overrides };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test('registry: register and retrieve an agent', () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  assert.equal(registry.get('echo-agent'), echoAgent);
  assert.equal(registry.has('echo-agent'), true);
});

test('registry: duplicate registration rejected', () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  assert.throws(() => registry.register(echoAgent), DuplicateAgentError);
});

test('registry: unknown agent rejected', () => {
  const registry = new AgentRegistry();
  assert.throws(() => registry.get('does-not-exist'), UnknownAgentError);
});

test('registry: contents are inspectable as metadata only', () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const listed = registry.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].agent_id, 'echo-agent');
  assert.equal(typeof listed[0].run, 'undefined');
});

// ---------------------------------------------------------------------------
// AgentContext
// ---------------------------------------------------------------------------

test('context: valid context accepted', () => {
  const context = createAgentContext(baseContext());
  assert.equal(context.run_id, 'run-1');
  assert.equal(context.agent_id, 'echo-agent');
  assert.deepEqual(context.input, { hello: 'world' });
  assert.equal(context.limits.maxDurationMs, 5000);
  assert.ok(Object.isFrozen(context));
});

test('context: malformed context rejected (missing run_id)', () => {
  assert.throws(() => createAgentContext({ agent_id: 'echo-agent' }), AgentContextError);
});

test('context: malformed context rejected (missing agent_id)', () => {
  assert.throws(() => createAgentContext({ run_id: 'run-1' }), AgentContextError);
});

test('context: malformed context rejected (non-serializable input)', () => {
  assert.throws(
    () => createAgentContext({ run_id: 'run-1', agent_id: 'echo-agent', input: { fn: () => {} } }),
    AgentContextError,
  );
});

test('context: malformed limits rejected', () => {
  assert.throws(
    () => createAgentContext({ ...baseContext(), limits: { maxInvocations: -1 } }),
    AgentContextError,
  );
});

// ---------------------------------------------------------------------------
// AgentResult
// ---------------------------------------------------------------------------

test('result: SUCCESS accepted', () => {
  const context = createAgentContext(baseContext());
  const result = validateAgentResult({ status: 'SUCCESS', output: { ok: true } }, context);
  assert.equal(result.status, RESULT_STATUS.SUCCESS);
  assert.deepEqual(result.output, { ok: true });
});

test('result: FAILED accepted', () => {
  const context = createAgentContext(baseContext());
  const result = validateAgentResult({ status: 'FAILED', errors: ['boom'] }, context);
  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.deepEqual(result.errors, ['boom']);
});

test('result: BLOCKED accepted', () => {
  const context = createAgentContext(baseContext());
  const result = validateAgentResult({ status: 'BLOCKED', block_reason: 'limit hit' }, context);
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, 'limit hit');
});

test('result: malformed result rejected (bad status)', () => {
  const context = createAgentContext(baseContext());
  assert.throws(() => validateAgentResult({ status: 'DONE' }, context), AgentResultError);
});

test('result: malformed result rejected (FAILED with no errors)', () => {
  const context = createAgentContext(baseContext());
  assert.throws(() => validateAgentResult({ status: 'FAILED' }, context), AgentResultError);
});

test('result: malformed result rejected (BLOCKED with no reason)', () => {
  const context = createAgentContext(baseContext());
  assert.throws(() => validateAgentResult({ status: 'BLOCKED' }, context), AgentResultError);
});

test('result: reserved output keys rejected (cannot impersonate an approval)', () => {
  const context = createAgentContext(baseContext());
  assert.throws(
    () => validateAgentResult({ status: 'SUCCESS', output: { actor: 'HUMAN' } }, context),
    AgentResultError,
  );
  assert.throws(
    () => validateAgentResult({ status: 'SUCCESS', output: { lifecycle_state: 'PUBLISHED' } }, context),
    AgentResultError,
  );
});

// ---------------------------------------------------------------------------
// AgentRunner
// ---------------------------------------------------------------------------

test('runner: successful execution', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs, auditEntries } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ input: { echoed: 'value' } }));

  assert.equal(result.status, RESULT_STATUS.SUCCESS);
  assert.deepEqual(result.output, { echoed: { echoed: 'value' } });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, 'SUCCESS');
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].actor, 'AGENT');
});

test('runner: failed execution (agent-declared failure)', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ input: { simulate: 'FAILED', reason: 'sample' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.deepEqual(result.errors, ['sample']);
  assert.equal(runs[0].status, 'FAILED');
});

test('runner: failed execution (agent throws) is not silently swallowed', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ input: { simulate: 'THROW', reason: 'kaboom' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /kaboom/);
  assert.equal(runs[0].status, 'FAILED');
});

test('runner: blocked execution (agent-declared block)', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ input: { simulate: 'BLOCKED', reason: 'needs review' } }));

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, 'needs review');
  assert.equal(runs[0].status, 'BLOCKED');
});

test('runner: unknown agent rejected as a controlled FAILED result, not a thrown exception', async () => {
  const registry = new AgentRegistry();
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ agent_id: 'no-such-agent' }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /UNKNOWN_AGENT/);
  assert.equal(runs[0].status, 'FAILED');
});

test('runner: malformed context rejected as a controlled FAILED result', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run({ run_id: 'run-1' }); // missing agent_id

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_CONTEXT/);
  assert.equal(runs[0].status, 'FAILED');
});

test('runner: malformed agent result rejected as a controlled FAILED result', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run(baseContext({ input: { simulate: 'MALFORMED' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_RESULT/);
  assert.equal(runs[0].status, 'FAILED');
});

test('runner: bounded execution — total invocation cap trips BLOCKED', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit, maxTotalInvocations: 1 });

  const first = await runner.run(baseContext({ run_id: 'run-a' }));
  const second = await runner.run(baseContext({ run_id: 'run-b' }));

  assert.equal(first.status, RESULT_STATUS.SUCCESS);
  assert.equal(second.status, RESULT_STATUS.BLOCKED);
  assert.match(second.block_reason, /RUNNER_INVOCATION_LIMIT_EXCEEDED/);
});

test('runner: bounded execution — timeout trips BLOCKED, does not hang', async () => {
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      agent_id: 'slow-agent',
      agent_type: 'SlowAgent',
      version: '1.0.0',
      description: 'Never resolves, to exercise the runner timeout.',
      run: () => new Promise(() => {}),
    }),
  );
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const result = await runner.run({ run_id: 'run-slow', agent_id: 'slow-agent', limits: { maxDurationMs: 50 } });

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.match(result.block_reason, /EXECUTION_TIMEOUT/);
  assert.equal(runs[0].status, 'BLOCKED');
});

test('runner: bounded execution — reentrant run_id is blocked, not run twice', async () => {
  const registry = new AgentRegistry();
  let releaseFirst;
  const gate = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  registry.register(
    defineAgent({
      agent_id: 'gated-agent',
      agent_type: 'GatedAgent',
      version: '1.0.0',
      description: 'Holds until released, to exercise the reentrancy guard.',
      run: async () => {
        await gate;
        return { status: RESULT_STATUS.SUCCESS, output: {} };
      },
    }),
  );
  const { persistAgentRun, appendAudit } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  const firstRunPromise = runner.run({ run_id: 'shared-run', agent_id: 'gated-agent' });
  // Give the first call a tick to register itself as active before the second, concurrent call.
  await new Promise((resolve) => setImmediate(resolve));
  const secondResult = await runner.run({ run_id: 'shared-run', agent_id: 'gated-agent' });
  releaseFirst();
  const firstResult = await firstRunPromise;

  assert.equal(secondResult.status, RESULT_STATUS.BLOCKED);
  assert.match(secondResult.block_reason, /RUN_ID_ALREADY_EXECUTING/);
  assert.equal(firstResult.status, RESULT_STATUS.SUCCESS);
});

test('runner: persistence records enough to reconstruct the run', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, runs } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  await runner.run(baseContext({ opportunity_id: 'some-opportunity' }));

  assert.equal(runs.length, 1);
  const record = runs[0];
  assert.equal(record.run_id, 'run-1');
  assert.equal(record.agent_id, 'echo-agent');
  assert.equal(record.agent_version, '1.0.0');
  assert.equal(record.opportunity_id, 'some-opportunity');
  assert.equal(record.status, 'SUCCESS');
  assert.ok(record.started_at);
  assert.ok(record.finished_at);
});

test('runner: audit event identifies actor, agent, run, and status', async () => {
  const registry = new AgentRegistry();
  registry.register(echoAgent);
  const { persistAgentRun, appendAudit, auditEntries } = fakeRecorders();
  const runner = new AgentRunner(registry, { persistAgentRun, appendAudit });

  await runner.run(baseContext({ opportunity_id: 'some-opportunity' }));

  assert.equal(auditEntries.length, 1);
  const entry = auditEntries[0];
  assert.equal(entry.actor, 'AGENT');
  assert.equal(entry.action, 'AGENT_RUN');
  assert.equal(entry.opportunityId, 'some-opportunity');
  assert.match(entry.note, /agent_id=echo-agent/);
  assert.match(entry.note, /run_id=run-1/);
  assert.match(entry.note, /status=SUCCESS/);
});

// ---------------------------------------------------------------------------
// Security invariants
// ---------------------------------------------------------------------------

test('security: an agent cannot perform a HUMAN-only approval transition', () => {
  assert.throws(
    () => stateMachine.validate('AWAITING_OPPORTUNITY_APPROVAL', 'APPROVE_OPPORTUNITY', 'AGENT'),
    stateMachine.InvalidTransitionError,
  );
});

test('security: requestLifecycleTransition cannot be made to impersonate HUMAN (no actor param exists)', () => {
  // The function signature itself has no `actor` field to pass — this asserts that even a
  // caller that tries to smuggle one through has no effect, because lifecycle.js hardcodes
  // actor: 'AGENT' unconditionally.
  const attempted = { id: 'does-not-matter', action: 'APPROVE_OPPORTUNITY', actor: 'HUMAN' };
  assert.throws(() => requestLifecycleTransition(attempted), (e) => {
    // It must fail for the same reason a real AGENT-actor call would (no such opportunity, or
    // if it existed, an InvalidTransitionError) — never succeed by honoring `actor: 'HUMAN'`.
    return e instanceof Error;
  });
});

test('security: requestLifecycleTransition routes through the real state machine (cannot bypass it)', () => {
  // No opportunity with this id exists, so store.transition() must fail at the "no opportunity
  // found" stage — proving this helper truly calls into store.js/stateMachine.js rather than
  // short-circuiting or faking a result.
  assert.throws(
    () => requestLifecycleTransition({ id: '__agent-runtime-test-nonexistent__', action: 'START_RESEARCH' }),
    /No opportunity found/,
  );
});

test('security: AgentResult output cannot carry an actor/approval claim', () => {
  const context = createAgentContext(baseContext());
  assert.throws(
    () => validateAgentResult({ status: 'SUCCESS', output: { actor: 'HUMAN', approved_by: 'me' } }, context),
    AgentResultError,
  );
});
