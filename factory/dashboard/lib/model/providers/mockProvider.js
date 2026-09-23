'use strict';

/**
 * mock-provider — the one provider implemented in Phase 2 (this phase's item 9). Deterministic,
 * requires no API key, performs no network request, and reads no credentials from process.env.
 * Test/caller-controlled behavior is driven entirely by `request.generationParameters.simulate`
 * (or the model_id itself for the timeout case), never by anything resembling a real request to
 * an external service.
 */

const { defineProvider } = require('../ModelProvider');
const { RESULT_STATUS, ProviderTechnicalError } = require('../types');

function createMockProvider({ provider_id = 'mock-provider', provider_name = 'Mock Provider' } = {}) {
  return defineProvider({
    provider_id,
    provider_name,
    async invoke(modelId, request) {
      const params = request.generationParameters || {};
      const simulate = params.simulate;
      // `failModelId`, when set, scopes TECHNICAL_FAILURE/TIMEOUT to one specific model — this is
      // what lets a test make the *cheap* model fail while a fallback to the *expensive* model
      // still succeeds, rather than every model in the same request failing identically.
      const appliesToThisModel = !params.failModelId || params.failModelId === modelId;

      if (simulate === 'TECHNICAL_FAILURE' && appliesToThisModel) {
        throw new ProviderTechnicalError(`mock-provider: simulated technical failure for ${modelId}`);
      }
      if (simulate === 'TIMEOUT' && appliesToThisModel) {
        return new Promise(() => {}); // never resolves; the router's own timeout catches this.
      }
      if (simulate === 'NON_TECHNICAL_FAILURE') {
        return { status: RESULT_STATUS.FAILED, errors: ['mock-provider: simulated policy/content failure (not technical)'] };
      }
      if (simulate === 'MALFORMED') {
        return { status: 'NOT_A_REAL_STATUS' };
      }
      if (simulate === 'RESERVED_KEY') {
        return {
          status: RESULT_STATUS.SUCCESS,
          output: { actor: 'HUMAN' },
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      }

      return {
        status: RESULT_STATUS.SUCCESS,
        output: { text: `mock response from ${modelId} for task_type=${request.task_type}` },
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      };
    },
  });
}

module.exports = { createMockProvider };
