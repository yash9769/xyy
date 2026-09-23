'use strict';

/**
 * Regression tests for the Phase 2 Model Router. Run with: node --test factory/dashboard/lib/model
 *
 * Persistence and audit calls are injected as fakes throughout (ModelRouter accepts
 * persistModelRun/appendAudit options), same discipline as the Agent Runtime's test suite, so
 * this file never writes to the real factory/state/*.jsonl files.
 *
 * Runs entirely offline: the only provider used is the deterministic mock-provider. No network
 * access, no API keys, no process.env reads anywhere in this suite or the code it exercises.
 */

const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { defineProvider } = require('./ModelProvider');
const { createModelRequest } = require('./ModelRequest');
const { validateModelResponse } = require('./ModelResponse');
const { ProviderRegistry } = require('./providerRegistry');
const { ModelRegistry } = require('./modelRegistry');
const { selectModel } = require('./routingPolicy');
const { ModelRouter } = require('./router');
const { createMockProvider } = require('./providers/mockProvider');
const {
  RESULT_STATUS,
  BLOCK_REASON,
  ModelRequestError,
  ModelResponseError,
  UnknownProviderError,
  DuplicateProviderError,
  UnknownModelError,
  DuplicateModelError,
} = require('./types');

function fakeRecorders() {
  const modelRuns = [];
  const auditEntries = [];
  return {
    modelRuns,
    auditEntries,
    persistModelRun: (record) => modelRuns.push(record),
    appendAudit: (entry) => {
      auditEntries.push(entry);
      return entry;
    },
  };
}

function buildRegistries({ withUnknownCostModel = false } = {}) {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());

  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({
    model_id: 'mock-cheap-model',
    provider_id: 'mock-provider',
    capabilities: ['text_generation', 'structured_output'],
    priority: 10,
    costPerCallUsd: 0.001,
  });
  modelRegistry.register({
    model_id: 'mock-expensive-model',
    provider_id: 'mock-provider',
    capabilities: ['text_generation', 'structured_output', 'long_context'],
    priority: 20,
    costPerCallUsd: 0.05,
  });
  if (withUnknownCostModel) {
    modelRegistry.register({
      model_id: 'mock-unknown-cost-model',
      provider_id: 'mock-provider',
      capabilities: ['text_generation'],
      priority: 5,
      // no costPerCallUsd — deliberately unknown
    });
  }
  return { providerRegistry, modelRegistry };
}

function baseRequest(overrides = {}) {
  return {
    request_id: 'req-1',
    agent_run_id: 'run-1',
    task_type: 'text_generation',
    model_requirements: { capabilities: ['text_generation'] },
    input: { prompt: 'hello' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

test('provider registry: register and retrieve', () => {
  const registry = new ProviderRegistry();
  const provider = registry.register(createMockProvider());
  assert.equal(registry.get('mock-provider'), provider);
  assert.equal(registry.has('mock-provider'), true);
});

test('provider registry: duplicate registration rejected', () => {
  const registry = new ProviderRegistry();
  registry.register(createMockProvider());
  assert.throws(() => registry.register(createMockProvider()), DuplicateProviderError);
});

test('provider registry: unknown provider rejected', () => {
  const registry = new ProviderRegistry();
  assert.throws(() => registry.get('does-not-exist'), UnknownProviderError);
});

test('provider registry: provider metadata validated', () => {
  assert.throws(() => defineProvider({ provider_id: '', provider_name: 'x', invoke: () => {} }), TypeError);
  assert.throws(() => defineProvider({ provider_id: 'x', provider_name: 'x', invoke: 'not-a-function' }), TypeError);
});

test('provider registry: registration cannot be satisfied by a string/path (no dynamic loading)', () => {
  const registry = new ProviderRegistry();
  assert.throws(() => registry.register('./some/malicious/path.js'), TypeError);
  assert.throws(() => registry.register({ provider_id: 'x' }), TypeError); // no invoke function
});

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

test('model registry: register and retrieve', () => {
  const { modelRegistry } = buildRegistries();
  const model = modelRegistry.get('mock-cheap-model');
  assert.equal(model.model_id, 'mock-cheap-model');
  assert.equal(model.provider_id, 'mock-provider');
});

test('model registry: duplicate model rejected', () => {
  const { modelRegistry } = buildRegistries();
  assert.throws(
    () => modelRegistry.register({ model_id: 'mock-cheap-model', provider_id: 'mock-provider', capabilities: ['text_generation'] }),
    DuplicateModelError,
  );
});

test('model registry: unknown model rejected', () => {
  const { modelRegistry } = buildRegistries();
  assert.throws(() => modelRegistry.get('no-such-model'), UnknownModelError);
});

test('model registry: capabilities validated', () => {
  const { modelRegistry } = buildRegistries();
  assert.throws(
    () => modelRegistry.register({ model_id: 'bad-model', provider_id: 'mock-provider', capabilities: ['telepathy'] }),
    TypeError,
  );
  assert.throws(
    () => modelRegistry.register({ model_id: 'bad-model-2', provider_id: 'mock-provider', capabilities: [] }),
    TypeError,
  );
});

test('model registry: rejects a model referencing an unregistered provider', () => {
  const { modelRegistry } = buildRegistries();
  assert.throws(
    () => modelRegistry.register({ model_id: 'orphan-model', provider_id: 'no-such-provider', capabilities: ['text_generation'] }),
    UnknownProviderError,
  );
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

test('request: valid request accepted', () => {
  const request = createModelRequest(baseRequest());
  assert.equal(request.request_id, 'req-1');
  assert.ok(Object.isFrozen(request));
});

test('request: missing request_id rejected', () => {
  const { request_id, ...rest } = baseRequest();
  assert.throws(() => createModelRequest(rest), ModelRequestError);
});

test('request: missing task_type rejected', () => {
  const { task_type, ...rest } = baseRequest();
  assert.throws(() => createModelRequest(rest), ModelRequestError);
});

test('request: invalid capability rejected', () => {
  assert.throws(
    () => createModelRequest(baseRequest({ model_requirements: { capabilities: ['telepathy'] } })),
    ModelRequestError,
  );
});

test('request: malformed requirements rejected', () => {
  assert.throws(() => createModelRequest(baseRequest({ model_requirements: {} })), ModelRequestError);
  assert.throws(() => createModelRequest(baseRequest({ model_requirements: { capabilities: [] } })), ModelRequestError);
});

test('request: a smuggled actor field has no special meaning (not part of the contract)', () => {
  // createModelRequest has no `actor` concept at all — passing one is simply ignored/dropped,
  // never interpreted as an authorization claim.
  const request = createModelRequest(baseRequest({ actor: 'HUMAN' }));
  assert.equal(Object.prototype.hasOwnProperty.call(request, 'actor'), false);
});

// ---------------------------------------------------------------------------
// Routing policy (deterministic selection)
// ---------------------------------------------------------------------------

test('routing: correct eligible model selected (cheapest/highest-priority wins)', () => {
  const { modelRegistry } = buildRegistries();
  const { model } = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'] });
  assert.equal(model.model_id, 'mock-cheap-model');
});

test('routing: capability filtering excludes an incompatible model', () => {
  const { modelRegistry } = buildRegistries();
  const { model } = selectModel(modelRegistry, { requiredCapabilities: ['long_context'] });
  assert.equal(model.model_id, 'mock-expensive-model'); // only one with long_context
});

test('routing: no eligible model for a supported-but-unassigned capability -> blocked', () => {
  const { modelRegistry } = buildRegistries();
  const { model, blockReason } = selectModel(modelRegistry, { requiredCapabilities: ['long_context', 'structured_output'], maxCostUsd: 0.001 });
  // mock-expensive-model is the only one with long_context, but it costs more than this budget.
  assert.equal(model, null);
  assert.equal(blockReason, BLOCK_REASON.BUDGET_EXCEEDED);
});

test('routing: unavailable model is excluded', () => {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());
  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({ model_id: 'offline-model', provider_id: 'mock-provider', capabilities: ['text_generation'], available: false });
  const { model, blockReason } = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'] });
  assert.equal(model, null);
  assert.equal(blockReason, BLOCK_REASON.NO_AVAILABLE_MODEL);
});

test('routing: deterministic tie-breaking is stable across repeated calls', () => {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(createMockProvider());
  const modelRegistry = new ModelRegistry(providerRegistry);
  modelRegistry.register({ model_id: 'zeta-model', provider_id: 'mock-provider', capabilities: ['text_generation'], priority: 10, costPerCallUsd: 0.01 });
  modelRegistry.register({ model_id: 'alpha-model', provider_id: 'mock-provider', capabilities: ['text_generation'], priority: 10, costPerCallUsd: 0.01 });

  const results = Array.from({ length: 10 }, () => selectModel(modelRegistry, { requiredCapabilities: ['text_generation'] }).model.model_id);
  assert.ok(results.every((id) => id === 'alpha-model')); // same priority+cost -> alphabetical tie-break
});

test('routing: budget constraint respected', () => {
  const { modelRegistry } = buildRegistries();
  const { model } = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'], maxCostUsd: 0.01 });
  assert.equal(model.model_id, 'mock-cheap-model'); // expensive model (0.05) excluded
});

test('routing: budget insufficient for any model -> BLOCKED (budget sufficient/insufficient contrast)', () => {
  const { modelRegistry } = buildRegistries();
  const sufficient = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'], maxCostUsd: 1 });
  assert.ok(sufficient.model);
  const insufficient = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'], maxCostUsd: 0.0001 });
  assert.equal(insufficient.model, null);
  assert.equal(insufficient.blockReason, BLOCK_REASON.BUDGET_EXCEEDED);
});

test('routing: missing cost data is never treated as zero', () => {
  const { modelRegistry } = buildRegistries({ withUnknownCostModel: true });
  // mock-unknown-cost-model has priority 5 (would win on priority alone) and no cost — with a
  // budget constraint it must be excluded, not silently treated as free/cheapest.
  const { model } = selectModel(modelRegistry, { requiredCapabilities: ['text_generation'], maxCostUsd: 1000 });
  assert.equal(model.model_id, 'mock-cheap-model');
  assert.notEqual(model.model_id, 'mock-unknown-cost-model');
});

// ---------------------------------------------------------------------------
// Provider execution (via the router, to exercise real invocation + validation)
// ---------------------------------------------------------------------------

test('provider execution: successful mock invocation', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  const result = await router.route(baseRequest());

  assert.equal(result.status, RESULT_STATUS.SUCCESS);
  assert.equal(result.model_id, 'mock-cheap-model');
  assert.ok(result.usage.total_tokens > 0);
});

test('provider execution: technical failure is reported, not silently swallowed', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 0 });

  const result = await router.route(baseRequest({ generationParameters: { simulate: 'TECHNICAL_FAILURE' } }));

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.MAX_FALLBACK_ATTEMPTS_EXCEEDED);
});

test('provider execution: timeout is bounded, does not hang', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, timeoutMs: 50, maxFallbackAttempts: 0 });

  const result = await router.route(baseRequest({ generationParameters: { simulate: 'TIMEOUT' } }));

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
});

test('provider execution: malformed provider response becomes a controlled FAILED result', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  const result = await router.route(baseRequest({ generationParameters: { simulate: 'MALFORMED' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_RESPONSE/);
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

test('fallback: technical failure triggers a bounded fallback to the next eligible model', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, modelRuns } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 1 });

  // Cheap model fails technically; budget covers the expensive model, so fallback succeeds.
  const result = await router.route(
    baseRequest({
      generationParameters: { simulate: 'TECHNICAL_FAILURE', failModelId: 'mock-cheap-model' },
      budget: { maxCostUsd: 1 },
    }),
  );

  assert.equal(result.status, RESULT_STATUS.SUCCESS);
  assert.equal(result.model_id, 'mock-expensive-model');
  assert.equal(modelRuns[0].fallback_used, true);
});

test('fallback: a non-technical failure does not trigger fallback', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, modelRuns } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 1 });

  const result = await router.route(baseRequest({ generationParameters: { simulate: 'NON_TECHNICAL_FAILURE' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.equal(result.model_id, 'mock-cheap-model'); // never tried the fallback model
  assert.equal(modelRuns[0].fallback_used, false);
});

test('fallback: cannot bypass a budget constraint', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 1 });

  // Cheap model fails technically; budget does NOT cover the expensive model -> BLOCKED, not a
  // silent, over-budget fallback.
  const result = await router.route(
    baseRequest({ generationParameters: { simulate: 'TECHNICAL_FAILURE' }, budget: { maxCostUsd: 0.01 } }),
  );

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.BUDGET_EXCEEDED);
});

test('fallback: cannot bypass capability requirements', async () => {
  // Only mock-cheap-model and mock-expensive-model support text_generation+structured_output in
  // this fixture; requiring long_context leaves only mock-expensive-model eligible from the
  // start, so a technical failure on it has nothing left to fall back to.
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 2 });

  const result = await router.route(
    baseRequest({ model_requirements: { capabilities: ['long_context'] }, generationParameters: { simulate: 'TECHNICAL_FAILURE' } }),
  );

  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.NO_MODEL_SUPPORTS_REQUIRED_CAPABILITIES);
});

test('fallback: maximum fallback attempts enforced', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 0 });

  const result = await router.route(
    baseRequest({ generationParameters: { simulate: 'TECHNICAL_FAILURE' }, budget: { maxCostUsd: 1 } }),
  );

  // Even though the expensive model would otherwise be a valid fallback, maxFallbackAttempts: 0
  // means only the initial attempt is made.
  assert.equal(result.status, RESULT_STATUS.BLOCKED);
  assert.equal(result.block_reason, BLOCK_REASON.MAX_FALLBACK_ATTEMPTS_EXCEEDED);
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

test('persistence: ModelRun written with required metadata', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, modelRuns } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  await router.route(baseRequest());

  assert.equal(modelRuns.length, 1);
  const record = modelRuns[0];
  assert.equal(record.request_id, 'req-1');
  assert.equal(record.agent_run_id, 'run-1');
  assert.equal(record.task_type, 'text_generation');
  assert.equal(record.provider_id, 'mock-provider');
  assert.equal(record.model_id, 'mock-cheap-model');
  assert.equal(record.status, 'SUCCESS');
  assert.ok(record.started_at);
  assert.ok(record.finished_at);
});

test('persistence: failure is recorded', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, modelRuns } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  await router.route(baseRequest({ generationParameters: { simulate: 'NON_TECHNICAL_FAILURE' } }));

  assert.equal(modelRuns[0].status, 'FAILED');
  assert.ok(Array.isArray(modelRuns[0].errors));
});

test('persistence: fallback attempts are recorded', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, modelRuns } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 1 });

  await router.route(
    baseRequest({
      generationParameters: { simulate: 'TECHNICAL_FAILURE', failModelId: 'mock-cheap-model' },
      budget: { maxCostUsd: 1 },
    }),
  );

  const record = modelRuns[0];
  assert.equal(record.fallback_used, true);
  assert.equal(record.fallback_attempt_count, 1);
  assert.equal(record.attempts.length, 2);
  assert.equal(record.attempts[0].outcome, 'TECHNICAL_FAILURE');
  assert.equal(record.attempts[1].outcome, 'SUCCESS');
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

test('audit: MODEL_RUN event created with provider/model metadata, actor always AGENT', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, auditEntries } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  await router.route(baseRequest());

  assert.equal(auditEntries.length, 1);
  const entry = auditEntries[0];
  assert.equal(entry.actor, 'AGENT');
  assert.equal(entry.action, 'MODEL_RUN');
  assert.match(entry.note, /provider_id=mock-provider/);
  assert.match(entry.note, /model_id=mock-cheap-model/);
  assert.match(entry.note, /status=SUCCESS/);
});

test('audit: failed invocation is audited', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, auditEntries } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  await router.route(baseRequest({ generationParameters: { simulate: 'NON_TECHNICAL_FAILURE' } }));

  assert.equal(auditEntries.length, 1);
  assert.match(auditEntries[0].note, /status=FAILED/);
  assert.equal(auditEntries[0].actor, 'AGENT');
});

test('audit: fallback is audited', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, auditEntries } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit, maxFallbackAttempts: 1 });

  await router.route(baseRequest({ generationParameters: { simulate: 'TECHNICAL_FAILURE' }, budget: { maxCostUsd: 1 } }));

  assert.match(auditEntries[0].note, /fallback_used=true/);
});

test('audit: no HUMAN event is ever fabricated by the Model Router', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, auditEntries } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  await router.route(baseRequest());
  await router.route(baseRequest({ request_id: 'req-2', generationParameters: { simulate: 'NON_TECHNICAL_FAILURE' } }));

  assert.ok(auditEntries.every((e) => e.actor === 'AGENT'));
});

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

test('security: model output cannot claim HUMAN or approve lifecycle state', () => {
  const request = createModelRequest(baseRequest());
  const provider = { provider_id: 'mock-provider' };
  const model = { model_id: 'mock-cheap-model' };
  assert.throws(
    () => validateModelResponse({ status: 'SUCCESS', output: { actor: 'HUMAN' }, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, request, model, provider),
    ModelResponseError,
  );
  assert.throws(
    () => validateModelResponse({ status: 'SUCCESS', output: { lifecycle_state: 'PUBLISHED' }, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, request, model, provider),
    ModelResponseError,
  );
});

test('security: end-to-end reserved-key attempt via the mock provider is rejected as a controlled failure', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  const result = await router.route(baseRequest({ generationParameters: { simulate: 'RESERVED_KEY' } }));

  assert.equal(result.status, RESULT_STATUS.FAILED);
  assert.match(result.errors[0], /INVALID_RESPONSE/);
});

test('security: provider input cannot choose an arbitrary actor for the audit trail', async () => {
  const { providerRegistry, modelRegistry } = buildRegistries();
  const { persistModelRun, appendAudit, auditEntries } = fakeRecorders();
  const router = new ModelRouter(providerRegistry, modelRegistry, { persistModelRun, appendAudit });

  // Even if a caller tries to smuggle an actor through the raw request input, ModelRequest has no
  // such field, and the router's own audit call always hardcodes actor: 'AGENT'.
  await router.route(baseRequest({ actor: 'HUMAN' }));

  assert.equal(auditEntries[0].actor, 'AGENT');
});

test('security: router.js/index.js have no dependency on stateMachine.js or store.js (cannot bypass the state machine)', () => {
  const routerSource = fs.readFileSync(require.resolve('./router.js'), 'utf8');
  const indexSource = fs.readFileSync(require.resolve('./index.js'), 'utf8');
  for (const source of [routerSource, indexSource]) {
    assert.doesNotMatch(source, /require\(['"].*stateMachine['"]\)/);
    assert.doesNotMatch(source, /require\(['"].*\/store['"]\)/);
  }
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('determinism: identical request/registry/budget always selects the same model', () => {
  const { modelRegistry } = buildRegistries();
  const options = { requiredCapabilities: ['text_generation', 'structured_output'], maxCostUsd: 1 };
  const selections = Array.from({ length: 20 }, () => selectModel(modelRegistry, options).model.model_id);
  assert.ok(selections.every((id) => id === selections[0]));
  assert.equal(selections[0], 'mock-cheap-model');
});
