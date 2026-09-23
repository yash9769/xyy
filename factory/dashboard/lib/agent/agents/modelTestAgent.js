'use strict';

/**
 * model-test-agent — the minimal agent proving Model Router integration (this phase's item 12).
 * It demonstrates, and only demonstrates: Agent → ModelRouter → MockProvider → ModelResponse →
 * AgentResult. It is not a real autonomous agent — it has no goals, no loop, no tool access; it
 * makes exactly one model call per run and maps the ModelResponse onto an AgentResult.
 *
 * The AgentRunner (Phase 1) is unchanged: this agent owns its own ModelRouter dependency via a
 * closure, exactly as doc 07's "Agent → ModelRouter" diagram implies, without AgentContext or
 * AgentRunner needing to know anything about models.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');
const { RESULT_STATUS: MODEL_RESULT_STATUS } = require('../../model/types');

/**
 * @param {import('../../model/router').ModelRouter} router
 */
function createModelTestAgent(router) {
  if (!router || typeof router.route !== 'function') {
    throw new TypeError('createModelTestAgent requires a ModelRouter');
  }

  return defineAgent({
    agent_id: 'model-test-agent',
    agent_type: 'ModelTestAgent',
    version: '1.0.0',
    description: 'Demonstrates Agent -> ModelRouter -> MockProvider -> ModelResponse -> AgentResult. Not a real agent.',
    async run(context) {
      const modelResponse = await router.route({
        request_id: `${context.run_id}-model-request`,
        agent_run_id: context.run_id,
        task_type: context.input.task_type || 'text_generation',
        model_requirements: { capabilities: context.input.requiredCapabilities || ['text_generation'] },
        input: context.input.modelInput || {},
        generationParameters: context.input.generationParameters || {},
        budget: context.input.budget,
      });

      if (modelResponse.status === MODEL_RESULT_STATUS.SUCCESS) {
        return {
          status: RESULT_STATUS.SUCCESS,
          output: {
            model_id: modelResponse.model_id,
            provider_id: modelResponse.provider_id,
            model_output: modelResponse.output,
          },
        };
      }
      if (modelResponse.status === MODEL_RESULT_STATUS.BLOCKED) {
        return { status: RESULT_STATUS.BLOCKED, block_reason: modelResponse.block_reason };
      }
      return { status: RESULT_STATUS.FAILED, errors: modelResponse.errors || ['model-test-agent: model call failed'] };
    },
  });
}

module.exports = { createModelTestAgent };
