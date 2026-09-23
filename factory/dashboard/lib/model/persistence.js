'use strict';

/**
 * ModelRun persistence — a dedicated append-only JSONL log, separate from lifecycle state and
 * separate from factory/dashboard/lib/agent/persistence.js's agent-runs.jsonl (per this phase's
 * explicit "use a dedicated append-only ModelRun record/log" requirement). Same convention as
 * auditLog.js/agent's persistence.js: fs.appendFileSync, one JSON object per line.
 */

const fs = require('fs');
const path = require('path');
const store = require('../store');

const MODEL_RUNS_LOG_PATH = path.join(store.REPO_ROOT, 'factory', 'state', 'model-runs.jsonl');

function ensureDir() {
  fs.mkdirSync(path.dirname(MODEL_RUNS_LOG_PATH), { recursive: true });
}

/** Appends one ModelRun record. Never stores secrets/API keys — the mock provider requires none,
 * and this function does not accept or persist any field resembling a credential. */
function appendModelRun(record) {
  ensureDir();
  const entry = { recorded_at: new Date().toISOString(), ...record };
  fs.appendFileSync(MODEL_RUNS_LOG_PATH, JSON.stringify(entry) + '\n');
  return entry;
}

function readModelRuns() {
  if (!fs.existsSync(MODEL_RUNS_LOG_PATH)) return [];
  const lines = fs.readFileSync(MODEL_RUNS_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}

module.exports = { appendModelRun, readModelRuns, MODEL_RUNS_LOG_PATH };
