'use strict';

/**
 * AgentRegistry — deterministic, explicit registration only (factory/docs/30's Phase 1 scope).
 * No dynamic code loading, no filesystem plugin discovery: an agent gets into the registry
 * because code calls register() with an already-imported agent object.
 */

const { DuplicateAgentError, UnknownAgentError } = require('./types');

class AgentRegistry {
  constructor() {
    this._agents = new Map();
  }

  register(agent) {
    if (!agent || typeof agent.agent_id !== 'string' || typeof agent.run !== 'function') {
      throw new TypeError('register() requires an agent produced by defineAgent()');
    }
    if (this._agents.has(agent.agent_id)) {
      throw new DuplicateAgentError(`Agent '${agent.agent_id}' is already registered`);
    }
    this._agents.set(agent.agent_id, agent);
    return agent;
  }

  get(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new UnknownAgentError(`No agent registered with id '${agentId}'`);
    }
    return agent;
  }

  has(agentId) {
    return this._agents.has(agentId);
  }

  /** Metadata only — never returns the run() function itself, so listing a registry cannot be
   * used to invoke an agent outside the runner. */
  list() {
    return Array.from(this._agents.values()).map(({ agent_id, agent_type, version, description }) => ({
      agent_id,
      agent_type,
      version,
      description,
    }));
  }
}

module.exports = { AgentRegistry };
