'use strict';

/**
 * ModelRequest — what an agent wants from a model, without provider-specific fields (doc 08 §6,
 * this phase's item 2). Same discipline as AgentContext.js: explicit required fields, no
 * arbitrary provider-specific leakage, JSON-serializable.
 */

const { ModelRequestError, CAPABILITIES } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSerializable(value, label) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ModelRequestError(`${label} must not contain non-finite numbers`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSerializable(item, `${label}[${i}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, val] of Object.entries(value)) assertSerializable(val, `${label}.${key}`);
    return;
  }
  throw new ModelRequestError(`${label} must be JSON-serializable (found ${typeof value})`);
}

/**
 * @param {object} input
 *   request_id: string (required)
 *   agent_run_id: string (required)
 *   task_type: string (required)
 *   model_requirements: { capabilities: string[] } (required; capabilities must be non-empty and
 *     each one of the known CAPABILITIES vocabulary)
 *   input: plain object (required) — the messages/task input; provider-agnostic
 *   generationParameters: plain object (optional) — e.g. temperature; passed through opaquely
 *   budget: { maxCostUsd: number } (optional)
 */
function createModelRequest(input) {
  if (!isPlainObject(input)) {
    throw new ModelRequestError('ModelRequest input must be a plain object');
  }
  const { request_id, agent_run_id, task_type, model_requirements, input: taskInput, generationParameters, budget } = input;

  if (typeof request_id !== 'string' || request_id.trim() === '') {
    throw new ModelRequestError('ModelRequest requires a non-empty string request_id');
  }
  if (typeof agent_run_id !== 'string' || agent_run_id.trim() === '') {
    throw new ModelRequestError('ModelRequest requires a non-empty string agent_run_id');
  }
  if (typeof task_type !== 'string' || task_type.trim() === '') {
    throw new ModelRequestError('ModelRequest requires a non-empty string task_type');
  }
  if (!isPlainObject(model_requirements) || !Array.isArray(model_requirements.capabilities)) {
    throw new ModelRequestError('ModelRequest.model_requirements.capabilities must be an array');
  }
  if (model_requirements.capabilities.length === 0) {
    throw new ModelRequestError('ModelRequest.model_requirements.capabilities must not be empty');
  }
  for (const cap of model_requirements.capabilities) {
    if (!CAPABILITIES.includes(cap)) {
      throw new ModelRequestError(`ModelRequest declares unknown required capability '${cap}'. Known: ${CAPABILITIES.join(', ')}`);
    }
  }
  if (taskInput !== undefined && !isPlainObject(taskInput)) {
    throw new ModelRequestError('ModelRequest.input must be a plain object when provided');
  }
  if (generationParameters !== undefined && !isPlainObject(generationParameters)) {
    throw new ModelRequestError('ModelRequest.generationParameters must be a plain object when provided');
  }
  if (budget !== undefined) {
    if (!isPlainObject(budget) || !Number.isFinite(budget.maxCostUsd) || budget.maxCostUsd < 0) {
      throw new ModelRequestError('ModelRequest.budget.maxCostUsd must be a non-negative number when budget is provided');
    }
  }

  const request = {
    request_id,
    agent_run_id,
    task_type,
    model_requirements: { capabilities: [...model_requirements.capabilities] },
    input: taskInput ? { ...taskInput } : {},
    generationParameters: generationParameters ? { ...generationParameters } : {},
    budget: budget ? { maxCostUsd: budget.maxCostUsd } : null,
  };

  assertSerializable(request.input, 'ModelRequest.input');
  assertSerializable(request.generationParameters, 'ModelRequest.generationParameters');

  return Object.freeze(request);
}

module.exports = { createModelRequest };
