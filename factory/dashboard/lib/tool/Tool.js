'use strict';

/**
 * The minimal Tool contract (doc 09 §4, this phase's item 1). A tool is explicit, statically
 * defined code — never loaded dynamically from a path/string. It declares stable metadata
 * (including its side-effect level and which actors may invoke it at all) plus two functions:
 * `validateInput` (throws on bad input) and `execute` (returns a plain candidate result or
 * throws — a thrown ToolTechnicalError is the only retry-eligible failure).
 */

const { SIDE_EFFECT_LEVELS, TOOL_ACTORS, ToolContractError } = require('./types');

function defineTool({
  tool_id,
  tool_type,
  version,
  description,
  permissions,
  side_effect_level,
  allowedActors,
  timeoutMs,
  retryPolicy,
  validateInput,
  execute,
}) {
  if (typeof tool_id !== 'string' || tool_id.trim() === '') {
    throw new ToolContractError('defineTool requires a non-empty string tool_id');
  }
  if (typeof tool_type !== 'string' || tool_type.trim() === '') {
    throw new ToolContractError(`Tool '${tool_id}' requires a non-empty string tool_type`);
  }
  if (typeof version !== 'string' || version.trim() === '') {
    throw new ToolContractError(`Tool '${tool_id}' requires a non-empty string version`);
  }
  if (typeof description !== 'string' || description.trim() === '') {
    throw new ToolContractError(`Tool '${tool_id}' requires a non-empty string description`);
  }
  // Side-effect metadata is mandatory — an undeclared side-effect level must never be treated as
  // safe (this phase's item 3).
  if (typeof side_effect_level !== 'string' || !SIDE_EFFECT_LEVELS.includes(side_effect_level)) {
    throw new ToolContractError(
      `Tool '${tool_id}' requires a side_effect_level from ${SIDE_EFFECT_LEVELS.join(', ')}, got ${JSON.stringify(side_effect_level)}`,
    );
  }
  if (!Array.isArray(allowedActors) || allowedActors.length === 0) {
    throw new ToolContractError(`Tool '${tool_id}' requires a non-empty allowedActors array`);
  }
  for (const actor of allowedActors) {
    if (!TOOL_ACTORS.includes(actor)) {
      throw new ToolContractError(`Tool '${tool_id}' declares unknown actor '${actor}'. Known: ${TOOL_ACTORS.join(', ')}`);
    }
  }
  const perms = permissions === undefined ? [] : permissions;
  if (!Array.isArray(perms) || perms.some((p) => typeof p !== 'string')) {
    throw new ToolContractError(`Tool '${tool_id}' permissions must be an array of strings when provided`);
  }
  const timeout = timeoutMs === undefined ? 3000 : timeoutMs;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new ToolContractError(`Tool '${tool_id}' timeoutMs must be a positive number when provided`);
  }
  const retry = retryPolicy === undefined ? { maxRetries: 0 } : retryPolicy;
  if (typeof retry !== 'object' || retry === null || !Number.isInteger(retry.maxRetries) || retry.maxRetries < 0) {
    throw new ToolContractError(`Tool '${tool_id}' retryPolicy.maxRetries must be a non-negative integer`);
  }
  if (typeof validateInput !== 'function') {
    throw new ToolContractError(`Tool '${tool_id}' requires a validateInput(input) function`);
  }
  if (typeof execute !== 'function') {
    throw new ToolContractError(`Tool '${tool_id}' requires an execute(input, context) function`);
  }

  return Object.freeze({
    tool_id,
    tool_type,
    version,
    description,
    permissions: Object.freeze([...perms]),
    side_effect_level,
    allowedActors: Object.freeze([...allowedActors]),
    timeoutMs: timeout,
    retryPolicy: Object.freeze({ maxRetries: retry.maxRetries }),
    validateInput,
    execute,
  });
}

module.exports = { defineTool };
