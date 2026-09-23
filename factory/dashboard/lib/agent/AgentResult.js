'use strict';

/**
 * AgentResult — structured, validated output boundary (factory/docs/07-AGENT-ARCHITECTURE.md §7).
 * Agent output is untrusted: this module is the one place a candidate result produced by an
 * agent's run() is checked before the AgentRunner will treat it as SUCCESS/FAILED/BLOCKED. The
 * result is evidence/output only — nothing here calls store.js/stateMachine.js, and reserved
 * keys that could look like an authorization claim (actor, lifecycle_state, approved_by) are
 * rejected outright.
 */

const { RESULT_STATUSES, RESERVED_OUTPUT_KEYS, AgentResultError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoReservedKeys(output) {
  if (!isPlainObject(output)) return;
  for (const key of RESERVED_OUTPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(output, key)) {
      throw new AgentResultError(
        `AgentResult.output must not contain reserved key '${key}' — agent output is evidence, ` +
        `not authority, and cannot claim an actor/lifecycle/approval role`,
      );
    }
  }
}

/**
 * Validates a candidate result against the given context. Throws AgentResultError on anything
 * malformed; never silently coerces a bad shape into something acceptable. Returns a frozen,
 * canonical AgentResult on success.
 */
function validateAgentResult(candidate, context) {
  if (!isPlainObject(candidate)) {
    throw new AgentResultError('AgentResult must be a plain object');
  }

  const { status, output, errors, block_reason, warnings } = candidate;

  if (typeof status !== 'string' || !RESULT_STATUSES.includes(status)) {
    throw new AgentResultError(
      `AgentResult.status must be one of ${RESULT_STATUSES.join('/')}, got ${JSON.stringify(status)}`,
    );
  }

  if (warnings !== undefined && !Array.isArray(warnings)) {
    throw new AgentResultError('AgentResult.warnings must be an array when provided');
  }

  if (status === 'SUCCESS') {
    if (output !== undefined) assertNoReservedKeys(output);
    if (output !== undefined && !isPlainObject(output)) {
      throw new AgentResultError('AgentResult.output must be a plain object for a SUCCESS result');
    }
  } else if (status === 'FAILED') {
    if (!Array.isArray(errors) || errors.length === 0) {
      throw new AgentResultError('AgentResult.errors must be a non-empty array for a FAILED result');
    }
    for (const err of errors) {
      if (typeof err !== 'string' && !isPlainObject(err)) {
        throw new AgentResultError('AgentResult.errors entries must be strings or plain objects');
      }
    }
  } else if (status === 'BLOCKED') {
    if (typeof block_reason !== 'string' || block_reason.trim() === '') {
      throw new AgentResultError('AgentResult.block_reason must be a non-empty string for a BLOCKED result');
    }
  }

  return Object.freeze({
    run_id: context.run_id,
    agent_id: context.agent_id,
    agent_version: candidate.agent_version ?? null,
    status,
    output: status === 'SUCCESS' ? { ...(output || {}) } : undefined,
    errors: status === 'FAILED' ? [...errors] : undefined,
    block_reason: status === 'BLOCKED' ? block_reason : undefined,
    warnings: warnings ? [...warnings] : [],
  });
}

module.exports = { validateAgentResult };
