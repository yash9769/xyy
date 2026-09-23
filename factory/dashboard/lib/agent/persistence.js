'use strict';

/**
 * AgentRun persistence — one append-only JSONL file, exactly like auditLog.js, so this doesn't
 * introduce a second persistence *mechanism* for factory state, just a new provenance log next to
 * the existing one. This file is never read as authority for lifecycle state — only
 * store.js/opportunity.json is. It exists purely so an execution attempt (including a malformed
 * or blocked one) can be reconstructed later: who/what ran, when, which agent version, which
 * input, which result, and why, if it failed or was blocked.
 */

const fs = require('fs');
const path = require('path');
const store = require('../store');

const RUNS_LOG_PATH = path.join(store.REPO_ROOT, 'factory', 'state', 'agent-runs.jsonl');

function ensureDir() {
  fs.mkdirSync(path.dirname(RUNS_LOG_PATH), { recursive: true });
}

/** Appends one AgentRun record. Never stores secrets/credentials — callers are responsible for
 * keeping context.input/configuration free of them, same expectation as the audit log. */
function appendAgentRun(record) {
  ensureDir();
  const entry = { recorded_at: new Date().toISOString(), ...record };
  fs.appendFileSync(RUNS_LOG_PATH, JSON.stringify(entry) + '\n');
  return entry;
}

/** Returns AgentRun records newest-first, mirroring auditLog.readAll()'s convention. */
function readAgentRuns() {
  if (!fs.existsSync(RUNS_LOG_PATH)) return [];
  const lines = fs.readFileSync(RUNS_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}

module.exports = { appendAgentRun, readAgentRuns, RUNS_LOG_PATH };
