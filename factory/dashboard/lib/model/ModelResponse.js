'use strict';

/**
 * ModelResponse validation — model output is untrusted, exactly like agent output
 * (factory/dashboard/lib/agent/AgentResult.js). This is the one place a candidate object
 * returned by a provider's invoke() is checked before the router will treat it as
 * SUCCESS/FAILED/BLOCKED. A provider error must never silently become a successful response.
 */

const { RESULT_STATUSES, RESERVED_OUTPUT_KEYS, ModelResponseError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoReservedKeys(output) {
  if (!isPlainObject(output)) return;
  for (const key of RESERVED_OUTPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(output, key)) {
      throw new ModelResponseError(
        `ModelResponse.output must not contain reserved key '${key}' — model output is untrusted ` +
        `and cannot claim an actor/lifecycle/approval role`,
      );
    }
  }
}

/**
 * @param {object} candidate - what the provider's invoke() returned
 * @param {object} request - the ModelRequest this is a response to
 * @param {object} model - the model descriptor from ModelRegistry
 * @param {object} provider - the provider descriptor from ProviderRegistry
 */
function validateModelResponse(candidate, request, model, provider) {
  if (!isPlainObject(candidate)) {
    throw new ModelResponseError('ModelResponse must be a plain object');
  }
  const { status, output, errors, block_reason, usage, warnings } = candidate;

  if (typeof status !== 'string' || !RESULT_STATUSES.includes(status)) {
    throw new ModelResponseError(
      `ModelResponse.status must be one of ${RESULT_STATUSES.join('/')}, got ${JSON.stringify(status)}`,
    );
  }
  if (warnings !== undefined && !Array.isArray(warnings)) {
    throw new ModelResponseError('ModelResponse.warnings must be an array when provided');
  }

  let normalizedUsage = null;
  if (status === 'SUCCESS') {
    if (output !== undefined) assertNoReservedKeys(output);
    if (output !== undefined && !isPlainObject(output)) {
      throw new ModelResponseError('ModelResponse.output must be a plain object for a SUCCESS response');
    }
    if (!isPlainObject(usage)) {
      throw new ModelResponseError('ModelResponse.usage is required for a SUCCESS response');
    }
    const { input_tokens, output_tokens, total_tokens } = usage;
    if (![input_tokens, output_tokens, total_tokens].every((n) => Number.isInteger(n) && n >= 0)) {
      throw new ModelResponseError('ModelResponse.usage must contain non-negative integer input_tokens/output_tokens/total_tokens');
    }
    normalizedUsage = { input_tokens, output_tokens, total_tokens };
  } else if (status === 'FAILED') {
    if (!Array.isArray(errors) || errors.length === 0) {
      throw new ModelResponseError('ModelResponse.errors must be a non-empty array for a FAILED response');
    }
  } else if (status === 'BLOCKED') {
    if (typeof block_reason !== 'string' || block_reason.trim() === '') {
      throw new ModelResponseError('ModelResponse.block_reason must be a non-empty string for a BLOCKED response');
    }
  }

  return Object.freeze({
    request_id: request.request_id,
    provider_id: provider.provider_id,
    model_id: model.model_id,
    status,
    output: status === 'SUCCESS' ? { ...(output || {}) } : undefined,
    errors: status === 'FAILED' ? [...errors] : undefined,
    block_reason: status === 'BLOCKED' ? block_reason : undefined,
    usage: normalizedUsage,
    warnings: warnings ? [...warnings] : [],
  });
}

module.exports = { validateModelResponse };
