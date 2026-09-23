'use strict';

/**
 * The minimal Model Provider contract (doc 08 §3/§6). A provider is explicit, statically
 * registered code — never loaded dynamically from a path/string an agent or model chose. It
 * exposes stable metadata (provider_id/provider_name) and one method, `invoke(modelId, request)`,
 * that returns a plain candidate ModelResponse object or throws for a technical failure.
 */

function defineProvider({ provider_id, provider_name, invoke }) {
  if (typeof provider_id !== 'string' || provider_id.trim() === '') {
    throw new TypeError('defineProvider requires a non-empty string provider_id');
  }
  if (typeof provider_name !== 'string' || provider_name.trim() === '') {
    throw new TypeError('defineProvider requires a non-empty string provider_name');
  }
  if (typeof invoke !== 'function') {
    throw new TypeError('defineProvider requires an invoke(modelId, request) function');
  }
  return Object.freeze({ provider_id, provider_name, invoke });
}

module.exports = { defineProvider };
