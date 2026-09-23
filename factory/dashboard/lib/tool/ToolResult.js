'use strict';

/**
 * ToolResult validation — tool output is untrusted, exactly like agent output and model output
 * (AgentResult.js, ModelResponse.js). A malformed or failed tool must never silently become
 * SUCCESS, and output can never carry an authorization claim.
 */

const { RESULT_STATUSES, RESERVED_OUTPUT_KEYS, ToolResultError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoReservedKeys(output) {
  if (!isPlainObject(output)) return;
  for (const key of RESERVED_OUTPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(output, key)) {
      throw new ToolResultError(
        `ToolResult.output must not contain reserved key '${key}' — tool output is untrusted and ` +
        `cannot claim an actor/lifecycle/approval role`,
      );
    }
  }
}

/**
 * @param {object} candidate - what the tool's execute() returned
 * @param {object} request - the ToolExecutionRequest this is a result for
 * @param {object} tool - the tool descriptor from ToolRegistry
 */
function validateToolResult(candidate, request, tool) {
  if (!isPlainObject(candidate)) {
    throw new ToolResultError('ToolResult must be a plain object');
  }
  const { status, output, errors, block_reason, warnings } = candidate;

  if (typeof status !== 'string' || !RESULT_STATUSES.includes(status)) {
    throw new ToolResultError(`ToolResult.status must be one of ${RESULT_STATUSES.join('/')}, got ${JSON.stringify(status)}`);
  }
  if (warnings !== undefined && !Array.isArray(warnings)) {
    throw new ToolResultError('ToolResult.warnings must be an array when provided');
  }

  if (status === 'SUCCESS') {
    if (output !== undefined) assertNoReservedKeys(output);
    if (output !== undefined && !isPlainObject(output)) {
      throw new ToolResultError('ToolResult.output must be a plain object for a SUCCESS result');
    }
  } else if (status === 'FAILED') {
    if (!Array.isArray(errors) || errors.length === 0) {
      throw new ToolResultError('ToolResult.errors must be a non-empty array for a FAILED result');
    }
  } else if (status === 'BLOCKED') {
    if (typeof block_reason !== 'string' || block_reason.trim() === '') {
      throw new ToolResultError('ToolResult.block_reason must be a non-empty string for a BLOCKED result');
    }
  }

  return Object.freeze({
    execution_id: request.execution_id,
    tool_id: tool.tool_id,
    tool_version: tool.version,
    side_effect_level: tool.side_effect_level,
    status,
    output: status === 'SUCCESS' ? { ...(output || {}) } : undefined,
    errors: status === 'FAILED' ? [...errors] : undefined,
    block_reason: status === 'BLOCKED' ? block_reason : undefined,
    warnings: warnings ? [...warnings] : [],
  });
}

module.exports = { validateToolResult };
