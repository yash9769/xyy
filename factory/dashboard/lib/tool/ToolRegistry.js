'use strict';

/**
 * ToolRegistry — deterministic, explicit registration only, same discipline as
 * factory/dashboard/lib/agent/registry.js and factory/dashboard/lib/model/providerRegistry.js.
 * A tool exists in the runtime only because code explicitly imported it and called register() —
 * no dynamic `require()`, no filesystem plugin discovery, no model-controlled registration.
 */

const { DuplicateToolError, UnknownToolError } = require('./types');

class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  register(tool) {
    if (
      !tool ||
      typeof tool.tool_id !== 'string' ||
      typeof tool.execute !== 'function' ||
      typeof tool.validateInput !== 'function' ||
      typeof tool.side_effect_level !== 'string'
    ) {
      throw new TypeError('register() requires a tool produced by defineTool()');
    }
    if (this._tools.has(tool.tool_id)) {
      throw new DuplicateToolError(`Tool '${tool.tool_id}' is already registered`);
    }
    this._tools.set(tool.tool_id, tool);
    return tool;
  }

  get(toolId) {
    const tool = this._tools.get(toolId);
    if (!tool) {
      throw new UnknownToolError(`No tool registered with id '${toolId}'`);
    }
    return tool;
  }

  has(toolId) {
    return this._tools.has(toolId);
  }

  /** Metadata only — never returns execute()/validateInput() themselves, so listing a registry
   * cannot be used to invoke a tool outside the runtime. */
  list() {
    return Array.from(this._tools.values()).map(
      ({ tool_id, tool_type, version, description, permissions, side_effect_level, allowedActors, timeoutMs }) => ({
        tool_id,
        tool_type,
        version,
        description,
        permissions,
        side_effect_level,
        allowedActors,
        timeoutMs,
      }),
    );
  }
}

module.exports = { ToolRegistry };
