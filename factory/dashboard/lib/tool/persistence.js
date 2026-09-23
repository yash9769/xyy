'use strict';

/**
 * ToolExecution persistence — a dedicated append-only JSONL log, separate from lifecycle state
 * and separate from agent-runs.jsonl/model-runs.jsonl (this phase's item 17: "a dedicated
 * append-only record/log"). Same convention as the rest of the factory: fs.appendFileSync, one
 * JSON object per line. Never stores secrets/API keys/credentials.
 */

const fs = require('fs');
const path = require('path');
const store = require('../store');

const TOOL_EXECUTIONS_LOG_PATH = path.join(store.REPO_ROOT, 'factory', 'state', 'tool-executions.jsonl');

function ensureDir() {
  fs.mkdirSync(path.dirname(TOOL_EXECUTIONS_LOG_PATH), { recursive: true });
}

function appendToolExecution(record) {
  ensureDir();
  const entry = { recorded_at: new Date().toISOString(), ...record };
  fs.appendFileSync(TOOL_EXECUTIONS_LOG_PATH, JSON.stringify(entry) + '\n');
  return entry;
}

function readToolExecutions() {
  if (!fs.existsSync(TOOL_EXECUTIONS_LOG_PATH)) return [];
  const lines = fs.readFileSync(TOOL_EXECUTIONS_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}

module.exports = { appendToolExecution, readToolExecutions, TOOL_EXECUTIONS_LOG_PATH };
