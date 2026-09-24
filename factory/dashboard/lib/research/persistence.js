'use strict';

/**
 * Research persistence — dedicated append-only JSONL logs, independent of lifecycle state,
 * following the same convention as agent-runs.jsonl/model-runs.jsonl/tool-executions.jsonl
 * (append via fs.appendFileSync, one JSON object per line, never edited in place).
 *
 * Deliberately one file per artifact *type* (research records, opportunity analyses) rather than
 * the four separate per-artifact-type directories this phase's instructions suggested
 * (factory/state/research/, /evidence/, /sources/, /opportunity-analysis/) — sources and evidence
 * only have meaning nested inside a ResearchRecord (see ResearchRecord.js's provenance
 * enforcement), so they are persisted embedded in it, matching this repository's existing
 * one-log-per-artifact-type convention rather than introducing a new one. This is a deliberate
 * scoping decision, recorded here and in the Phase 4 report's Documentation Reconciliation
 * section, not an oversight.
 *
 * "Research must not silently overwrite historical evidence": every persist call APPENDS a new
 * line, even for the same research_id/analysis_id — a later revision is a new entry, and prior
 * entries for the same id remain in the log, readable via readResearchRecords()/
 * readOpportunityAnalyses() (both newest-first, same convention as auditLog.readAll()).
 */

const fs = require('fs');
const path = require('path');
const store = require('../store');

const RESEARCH_DIR = path.join(store.REPO_ROOT, 'factory', 'state', 'research');
const RESEARCH_RECORDS_LOG_PATH = path.join(RESEARCH_DIR, 'research-records.jsonl');
const OPPORTUNITY_ANALYSES_LOG_PATH = path.join(RESEARCH_DIR, 'opportunity-analyses.jsonl');

function ensureDir() {
  fs.mkdirSync(RESEARCH_DIR, { recursive: true });
}

function appendJsonl(filePath, record) {
  ensureDir();
  const entry = { recorded_at: new Date().toISOString(), ...record };
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
  return entry;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}

function appendResearchRecord(record) {
  return appendJsonl(RESEARCH_RECORDS_LOG_PATH, record);
}

function readResearchRecords() {
  return readJsonl(RESEARCH_RECORDS_LOG_PATH);
}

function appendOpportunityAnalysis(record) {
  return appendJsonl(OPPORTUNITY_ANALYSES_LOG_PATH, record);
}

function readOpportunityAnalyses() {
  return readJsonl(OPPORTUNITY_ANALYSES_LOG_PATH);
}

module.exports = {
  appendResearchRecord,
  readResearchRecords,
  appendOpportunityAnalysis,
  readOpportunityAnalyses,
  RESEARCH_RECORDS_LOG_PATH,
  OPPORTUNITY_ANALYSES_LOG_PATH,
};
