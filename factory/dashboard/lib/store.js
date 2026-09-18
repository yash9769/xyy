'use strict';

const fs = require('fs');
const path = require('path');
const stateMachine = require('./stateMachine');
const auditLog = require('./auditLog');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DIRS = {
  DISCOVERED: path.join(REPO_ROOT, 'candidates'),
  RESEARCHING: path.join(REPO_ROOT, 'candidates'),
  RESEARCH_COMPLETE: path.join(REPO_ROOT, 'candidates'),
  AWAITING_OPPORTUNITY_APPROVAL: path.join(REPO_ROOT, 'candidates'),
  REJECTED: path.join(REPO_ROOT, 'rejected'),
};
const CANDIDATES_DIR = path.join(REPO_ROOT, 'candidates');
const APPROVED_DIR = path.join(REPO_ROOT, 'approved');
const REJECTED_DIR = path.join(REPO_ROOT, 'rejected');
const APPS_DIR = path.join(REPO_ROOT, 'apps');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

/** Which top-level directory an opportunity's files live in, given its lifecycle_state. */
function dirForState(state) {
  if (state === 'REJECTED') return REJECTED_DIR;
  if (DIRS[state]) return CANDIDATES_DIR;
  return APPROVED_DIR; // every post-approval state lives under approved/
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function listOpportunitiesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const oppFile = path.join(dir, entry.name, 'opportunity.json');
      if (!fs.existsSync(oppFile)) return null;
      try {
        return { ...readJson(oppFile), _dir: path.relative(REPO_ROOT, path.join(dir, entry.name)) };
      } catch (e) {
        return { id: entry.name, lifecycle_state: 'UNKNOWN', _error: `Could not read opportunity.json: ${e.message}` };
      }
    })
    .filter(Boolean);
}

/** All opportunities across candidates/, approved/, rejected/ — the dashboard's single list view. */
function listAllOpportunities() {
  const seen = new Map();
  for (const dir of [CANDIDATES_DIR, APPROVED_DIR, REJECTED_DIR]) {
    for (const opp of listOpportunitiesIn(dir)) {
      seen.set(opp.id, opp);
    }
  }
  return Array.from(seen.values()).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

function findOpportunityDir(id) {
  for (const dir of [CANDIDATES_DIR, APPROVED_DIR, REJECTED_DIR]) {
    const candidate = path.join(dir, id);
    if (fs.existsSync(path.join(candidate, 'opportunity.json'))) return candidate;
  }
  return null;
}

function getOpportunity(id) {
  const dir = findOpportunityDir(id);
  if (!dir) return null;
  return { ...readJson(path.join(dir, 'opportunity.json')), _dir: path.relative(REPO_ROOT, dir) };
}

/**
 * The one place a state transition happens. Validates against stateMachine, moves the
 * opportunity's directory if it crosses a top-level boundary (candidates/ <-> approved/ <->
 * rejected/), updates opportunity.json, and appends an audit log entry. Throws
 * stateMachine.InvalidTransitionError on an illegal transition — callers must not catch-and-hide
 * this, since it's exactly the protection this whole system exists to provide.
 */
function transition({ id, action, actor, reason, note, actorName }) {
  const currentDir = findOpportunityDir(id);
  if (!currentDir) {
    throw new Error(`No opportunity found with id '${id}'`);
  }
  const oppFile = path.join(currentDir, 'opportunity.json');
  const opp = readJson(oppFile);
  const fromState = opp.lifecycle_state;
  const toState = stateMachine.validate(fromState, action, actor); // throws if invalid

  opp.lifecycle_state = toState;
  opp.updated_at = new Date().toISOString();
  if (toState === 'REJECTED') {
    if (reason) opp.rejection_reason = reason;
    if (note) opp.rejection_note = note;
  }

  const targetTopDir = dirForState(toState);
  let newDir = currentDir;
  if (path.dirname(currentDir) !== targetTopDir) {
    newDir = path.join(targetTopDir, id);
    fs.mkdirSync(targetTopDir, { recursive: true });
    fs.renameSync(currentDir, newDir);
  }
  writeJson(path.join(newDir, 'opportunity.json'), opp);

  const entry = auditLog.append({
    actor,
    actorName: actorName || (actor === 'HUMAN' ? 'owner' : actor.toLowerCase()),
    action,
    opportunityId: id,
    previousState: fromState,
    newState: toState,
    ...(reason ? { reason } : {}),
    ...(note ? { note } : {}),
  });

  return { opportunity: opp, auditEntry: entry };
}

/** Static, honest snapshot of an app's build/test/security status from its own docs — no live
 * process introspection exists yet (Phase B), so this reads what was actually written, not a
 * simulated progress bar. */
function getAppStatus(appId) {
  const appDir = path.join(APPS_DIR, appId);
  if (!fs.existsSync(appDir)) return null;

  const statusFile = path.join(appDir, 'status.json');
  if (fs.existsSync(statusFile)) {
    return { ...readJson(statusFile), _dir: path.relative(REPO_ROOT, appDir) };
  }
  return { appId, note: 'No status.json recorded for this app yet.', _dir: path.relative(REPO_ROOT, appDir) };
}

function listApps() {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => getAppStatus(e.name))
    .filter(Boolean);
}

function counts() {
  const all = listAllOpportunities();
  const c = {
    total: all.length,
    awaitingApproval: 0,
    approved: 0,
    building: 0,
    testing: 0,
    releaseCandidate: 0,
    published: 0,
    pausedOrKilled: 0,
    rejected: 0,
  };
  for (const opp of all) {
    const s = opp.lifecycle_state;
    if (s && s.startsWith('AWAITING_')) c.awaitingApproval += 1;
    if (s === 'APPROVED') c.approved += 1;
    if (s === 'BUILDING') c.building += 1;
    if (s === 'TESTING' || s === 'SECURITY_REVIEW') c.testing += 1;
    if (s === 'RELEASE_CANDIDATE' || s === 'INTERNAL_TEST') c.releaseCandidate += 1;
    if (s === 'PUBLISHED' || s === 'MONITORING' || s === 'ITERATION_PROPOSED') c.published += 1;
    if (s === 'PAUSED' || s === 'KILLED') c.pausedOrKilled += 1;
    if (s === 'REJECTED') c.rejected += 1;
  }
  return c;
}

module.exports = {
  REPO_ROOT,
  listAllOpportunities,
  getOpportunity,
  transition,
  getAppStatus,
  listApps,
  counts,
};
