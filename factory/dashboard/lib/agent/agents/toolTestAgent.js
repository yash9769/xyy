'use strict';

/**
 * tool-test-agent — the minimal agent proving Tool Runtime integration (this phase's item 15).
 * Demonstrates, and only demonstrates: Agent -> ToolRuntime -> echo-tool -> ToolResult ->
 * AgentResult. Not a real autonomous agent — one tool call per run, no loop, no goals.
 *
 * Mirrors model-test-agent's pattern exactly: it owns its ToolRuntime dependency via closure, so
 * AgentRunner/AgentContext/AgentResult need no changes.
 */

const { defineAgent } = require('../Agent');
const { RESULT_STATUS } = require('../types');
const { RESULT_STATUS: TOOL_RESULT_STATUS } = require('../../tool/types');

/**
 * @param {import('../../tool/runtime').ToolRuntime} toolRuntime
 */
function createToolTestAgent(toolRuntime) {
  if (!toolRuntime || typeof toolRuntime.execute !== 'function') {
    throw new TypeError('createToolTestAgent requires a ToolRuntime');
  }

  return defineAgent({
    agent_id: 'tool-test-agent',
    agent_type: 'ToolTestAgent',
    version: '1.0.0',
    description: 'Demonstrates Agent -> ToolRuntime -> echo-tool -> ToolResult -> AgentResult. Not a real agent.',
    async run(context) {
      // Note: the agent always requests actor 'AGENT' explicitly and cannot override this to
      // 'HUMAN' — ToolExecutionRequest structurally rejects that value regardless.
      const toolResult = await toolRuntime.execute({
        execution_id: `${context.run_id}-tool-request`,
        agent_run_id: context.run_id,
        tool_id: context.input.tool_id || 'echo-tool',
        actor: 'AGENT',
        input: context.input.toolInput || {},
      });

      if (toolResult.status === TOOL_RESULT_STATUS.SUCCESS) {
        return {
          status: RESULT_STATUS.SUCCESS,
          output: { tool_id: toolResult.tool_id, tool_output: toolResult.output },
        };
      }
      if (toolResult.status === TOOL_RESULT_STATUS.BLOCKED) {
        return { status: RESULT_STATUS.BLOCKED, block_reason: toolResult.block_reason };
      }
      return { status: RESULT_STATUS.FAILED, errors: toolResult.errors || ['tool-test-agent: tool execution failed'] };
    },
  });
}

module.exports = { createToolTestAgent };
