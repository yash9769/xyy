'use strict';

/**
 * ModelRegistry — the capability registry from doc 08 §10 / this phase's item 4. Each entry
 * describes a model without exposing provider-specific implementation details to callers: only
 * model_id, provider_id, capabilities, an optional context_limit, availability, and cost
 * metadata used by the routing policy (routingPolicy.js).
 *
 * Registration is validated against a ProviderRegistry given at construction time, so a model can
 * never reference a provider_id that isn't actually registered — this is a deterministic
 * referential check, not dynamic loading.
 */

const { CAPABILITIES, DuplicateModelError, UnknownModelError, UnknownProviderError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class ModelRegistry {
  constructor(providerRegistry) {
    if (!providerRegistry || typeof providerRegistry.has !== 'function') {
      throw new TypeError('ModelRegistry requires a ProviderRegistry');
    }
    this._providerRegistry = providerRegistry;
    this._models = new Map();
  }

  /**
   * @param {object} descriptor
   *   model_id: string (required)
   *   provider_id: string (required, must already be registered in the ProviderRegistry)
   *   capabilities: string[] (required, each one of CAPABILITIES)
   *   context_limit: number (optional)
   *   available: boolean (optional, default true)
   *   priority: number (optional, default 100 — lower is preferred; see routingPolicy.js)
   *   costPerCallUsd: number (optional — omit entirely when genuinely unknown; routingPolicy.js
   *     never treats a missing value as zero cost)
   */
  register(descriptor) {
    if (!isPlainObject(descriptor)) {
      throw new TypeError('register() requires a plain descriptor object');
    }
    const { model_id, provider_id, capabilities, context_limit, available, priority, costPerCallUsd } = descriptor;

    if (typeof model_id !== 'string' || model_id.trim() === '') {
      throw new TypeError('Model descriptor requires a non-empty string model_id');
    }
    if (this._models.has(model_id)) {
      throw new DuplicateModelError(`Model '${model_id}' is already registered`);
    }
    if (typeof provider_id !== 'string' || provider_id.trim() === '') {
      throw new TypeError('Model descriptor requires a non-empty string provider_id');
    }
    if (!this._providerRegistry.has(provider_id)) {
      throw new UnknownProviderError(`Model '${model_id}' references unregistered provider '${provider_id}'`);
    }
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      throw new TypeError(`Model '${model_id}' requires a non-empty capabilities array`);
    }
    for (const cap of capabilities) {
      if (!CAPABILITIES.includes(cap)) {
        throw new TypeError(`Model '${model_id}' declares unknown capability '${cap}'. Known: ${CAPABILITIES.join(', ')}`);
      }
    }
    if (context_limit !== undefined && (!Number.isFinite(context_limit) || context_limit <= 0)) {
      throw new TypeError(`Model '${model_id}' context_limit must be a positive number when provided`);
    }
    if (available !== undefined && typeof available !== 'boolean') {
      throw new TypeError(`Model '${model_id}' available must be a boolean when provided`);
    }
    if (priority !== undefined && !Number.isFinite(priority)) {
      throw new TypeError(`Model '${model_id}' priority must be a number when provided`);
    }
    if (costPerCallUsd !== undefined && (!Number.isFinite(costPerCallUsd) || costPerCallUsd < 0)) {
      throw new TypeError(`Model '${model_id}' costPerCallUsd must be a non-negative number when provided`);
    }

    const record = Object.freeze({
      model_id,
      provider_id,
      capabilities: Object.freeze([...capabilities]),
      context_limit: context_limit ?? null,
      available: available ?? true,
      priority: priority ?? 100,
      // Deliberately no default here — undefined means "unknown," not "free." See routingPolicy.js.
      costPerCallUsd: costPerCallUsd ?? undefined,
    });
    this._models.set(model_id, record);
    return record;
  }

  get(modelId) {
    const model = this._models.get(modelId);
    if (!model) {
      throw new UnknownModelError(`No model registered with id '${modelId}'`);
    }
    return model;
  }

  has(modelId) {
    return this._models.has(modelId);
  }

  list() {
    return Array.from(this._models.values());
  }
}

module.exports = { ModelRegistry };
