'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_PATH = path.join(REPO_ROOT, 'factory', 'state', 'audit-log.jsonl');

function ensureDir() {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
}

/**
 * Append-only. Every important state transition (and rejection reason) is recorded here —
 * never edited or deleted, so it stays a trustworthy record of who decided what, when.
 */
function append(entry) {
  ensureDir();
  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  return record;
}

/** Returns entries newest-first. */
function readAll() {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}

module.exports = { append, readAll, LOG_PATH };
