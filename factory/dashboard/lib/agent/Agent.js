'use strict';

/**
 * The minimal Agent contract (factory/docs/07-AGENT-ARCHITECTURE.md §6). Deliberately not a
 * class hierarchy or a plugin interface — just a plain object shape, validated once at
 * definition time. `run_id`/other-agents/tools are inaccessible to an agent; it only ever sees
 * the AgentContext it's given and returns a plain candidate result object (validated separately
 * by AgentResult.js).
 */

function defineAgent({ agent_id, agent_type, version, description, run }) {
  if (typeof agent_id !== 'string' || agent_id.trim() === '') {
    throw new TypeError('defineAgent requires a non-empty string agent_id');
  }
  if (typeof agent_type !== 'string' || agent_type.trim() === '') {
    throw new TypeError('defineAgent requires a non-empty string agent_type');
  }
  if (typeof version !== 'string' || version.trim() === '') {
    throw new TypeError('defineAgent requires a non-empty string version');
  }
  if (typeof description !== 'string' || description.trim() === '') {
    throw new TypeError('defineAgent requires a non-empty string description');
  }
  if (typeof run !== 'function') {
    throw new TypeError('defineAgent requires a run(context) function');
  }

  return Object.freeze({ agent_id, agent_type, version, description, run });
}

module.exports = { defineAgent };
