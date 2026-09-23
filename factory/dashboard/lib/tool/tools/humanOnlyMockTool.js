'use strict';

/**
 * human-only-mock-tool — NOT a real capability. It exists solely to prove the permission boundary
 * this phase's item 8 requires: an AGENT (or SYSTEM) must be BLOCKED from a HUMAN-only tool, and
 * a HUMAN can only reach it through ToolRuntime.executeAsHumanConfirmed()'s real confirmation
 * path — never by an execute() caller simply passing `actor: 'HUMAN'` (which is structurally
 * impossible; see ToolExecutionRequest.js). Declared PUBLISHING as its side-effect level, as a
 * stand-in for the kind of consequential action doc 09 §12 lists (e.g. `playstore.publish`) —
 * but it performs no real action at all: execute() returns a fixed, harmless SUCCESS payload.
 */

const { defineTool } = require('../Tool');
const { RESULT_STATUS } = require('../types');

const humanOnlyMockTool = defineTool({
  tool_id: 'human-only-mock-tool',
  tool_type: 'test-fixture',
  version: '1.0.0',
  description: 'Test fixture only, proving the HUMAN-only tool permission boundary. Not a real capability.',
  permissions: ['human_approval_required'],
  side_effect_level: 'PUBLISHING',
  allowedActors: ['HUMAN'],
  timeoutMs: 2000,
  retryPolicy: { maxRetries: 0 },
  validateInput(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new TypeError('human-only-mock-tool input must be a plain object');
    }
    return { confirmationNote: typeof input.confirmationNote === 'string' ? input.confirmationNote : '' };
  },
  execute(input) {
    return { status: RESULT_STATUS.SUCCESS, output: { confirmed: true, note: input.confirmationNote } };
  },
});

module.exports = { humanOnlyMockTool };
