'use strict';

/**
 * EchoAgent — the deterministic test agent required to prove the runtime contract without an
 * external model (doc 30 Phase 1 acceptance criteria). It does not call an LLM, does not perform
 * discovery, does not modify repository files, and cannot perform lifecycle approvals — it only
 * echoes its input back as structured output, optionally returning FAILED/BLOCKED when asked to
 * (`context.input.simulate`), which is how the test suite exercises every AgentResult status
 * through a real registered agent rather than only through runner-internal fault injection.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');

const echoAgent = defineAgent({
  agent_id: 'echo-agent',
  agent_type: 'EchoAgent',
  version: '1.0.0',
  description: 'Deterministic test agent that echoes its input; proves the runtime contract only.',
  run(context) {
    const simulate = context.input && context.input.simulate;

    if (simulate === 'FAILED') {
      return {
        status: RESULT_STATUS.FAILED,
        errors: [context.input.reason || 'EchoAgent was asked to simulate a failure'],
      };
    }
    if (simulate === 'BLOCKED') {
      return {
        status: RESULT_STATUS.BLOCKED,
        block_reason: context.input.reason || 'EchoAgent was asked to simulate a block',
      };
    }
    if (simulate === 'MALFORMED') {
      // Deliberately invalid shape, to exercise the runner's result-validation boundary.
      return { status: 'NOT_A_REAL_STATUS' };
    }
    if (simulate === 'THROW') {
      throw new Error(context.input.reason || 'EchoAgent was asked to throw');
    }

    return {
      status: RESULT_STATUS.SUCCESS,
      output: { echoed: context.input },
    };
  },
});

module.exports = { echoAgent };
