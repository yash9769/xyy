'use strict';

/**
 * echo-tool — the one harmless mock tool proving the Tool Runtime contract (this phase's item
 * 14). No network, no filesystem mutation, no shell, no credentials, no external side effect: it
 * validates that `message` is a non-empty string and echoes it back.
 */

const { defineTool } = require('../Tool');
const { RESULT_STATUS, ToolTechnicalError } = require('../types');

const echoTool = defineTool({
  tool_id: 'echo-tool',
  tool_type: 'utility',
  version: '1.0.0',
  description: 'Echoes a message back. No side effects of any kind — proves the runtime contract only.',
  permissions: [],
  side_effect_level: 'READ_ONLY',
  allowedActors: ['AGENT', 'SYSTEM', 'HUMAN'],
  timeoutMs: 2000,
  retryPolicy: { maxRetries: 1 },
  validateInput(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new TypeError('echo-tool input must be a plain object');
    }
    if (typeof input.message !== 'string' || input.message.trim() === '') {
      throw new TypeError('echo-tool requires a non-empty string "message"');
    }
    if (input.message.length > 1000) {
      throw new TypeError('echo-tool "message" exceeds the 1000-character execution limit');
    }
    return { message: input.message };
  },
  execute(input) {
    if (input.message === '__SIMULATE_TECHNICAL_FAILURE__') {
      throw new ToolTechnicalError('echo-tool: simulated technical failure');
    }
    if (input.message === '__SIMULATE_TIMEOUT__') {
      return new Promise(() => {}); // never resolves; the runtime's own timeout catches this.
    }
    if (input.message === '__SIMULATE_NON_TECHNICAL_FAILURE__') {
      return { status: RESULT_STATUS.FAILED, errors: ['echo-tool: simulated non-technical failure'] };
    }
    if (input.message === '__SIMULATE_MALFORMED__') {
      return { status: 'NOT_A_REAL_STATUS' };
    }
    if (input.message === '__SIMULATE_RESERVED_KEY__') {
      return { status: RESULT_STATUS.SUCCESS, output: { actor: 'HUMAN' } };
    }
    return { status: RESULT_STATUS.SUCCESS, output: { message: input.message } };
  },
});

module.exports = { echoTool };
