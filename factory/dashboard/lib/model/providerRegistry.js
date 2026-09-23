'use strict';

/**
 * ProviderRegistry — deterministic, explicit registration only, same discipline as
 * factory/dashboard/lib/agent/registry.js. No dynamic `require()` of a provider module chosen by
 * user/model input, no filesystem plugin discovery.
 */

const { DuplicateProviderError, UnknownProviderError } = require('./types');

class ProviderRegistry {
  constructor() {
    this._providers = new Map();
  }

  register(provider) {
    if (!provider || typeof provider.provider_id !== 'string' || typeof provider.invoke !== 'function') {
      throw new TypeError('register() requires a provider produced by defineProvider()');
    }
    if (this._providers.has(provider.provider_id)) {
      throw new DuplicateProviderError(`Provider '${provider.provider_id}' is already registered`);
    }
    this._providers.set(provider.provider_id, provider);
    return provider;
  }

  get(providerId) {
    const provider = this._providers.get(providerId);
    if (!provider) {
      throw new UnknownProviderError(`No provider registered with id '${providerId}'`);
    }
    return provider;
  }

  has(providerId) {
    return this._providers.has(providerId);
  }

  list() {
    return Array.from(this._providers.values()).map(({ provider_id, provider_name }) => ({
      provider_id,
      provider_name,
    }));
  }
}

module.exports = { ProviderRegistry };
