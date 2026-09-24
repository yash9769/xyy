'use strict';

/**
 * The Research Factory's only door into opportunity lifecycle state. This does NOT duplicate the
 * state machine, the service layer, or the approval system:
 *
 * - Advancing an existing candidate (START_RESEARCH / COMPLETE_RESEARCH / SUBMIT_FOR_APPROVAL)
 *   reuses factory/dashboard/lib/agent/lifecycle.js's `requestLifecycleTransition()` verbatim
 *   (Phase 1) — every call still goes through the real `stateMachine.js`/`store.js`, hardcoded to
 *   actor 'AGENT', exactly as Phase 1 already established. Nothing here re-implements that.
 * - `createCandidateOpportunity()` below is the one genuinely new piece: creating the *initial*
 *   DISCOVERED-state opportunity.json. There is no `store.js` function for this because
 *   `DISCOVERED` is the record's entry point, not a transition — the state machine has no
 *   incoming edge into it. The existing factory's only other place this happens today,
 *   `factory/dashboard/lib/cli.js`'s `cmdDiscover`, does the exact same direct write for the
 *   exact same reason (and cannot be `require()`d as a library — it calls `main()` unconditionally
 *   using `process.argv` at module load). This function mirrors that shape and that one audit
 *   action ('DISCOVER') exactly, so there remains exactly one *convention* for how a candidate
 *   opportunity comes into existence, even though there are now two call sites for it.
 */

const fs = require('fs');
const path = require('path');
const store = require('../store');
const auditLog = require('../auditLog');
const { requestLifecycleTransition } = require('../agent/lifecycle');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unnamed-opportunity';
}

/**
 * @param {object} input
 *   id: string (optional — derived from `problem` via the same slugify() cli.js uses, if omitted)
 *   problem, category, target_user: strings (required, matching schemas/opportunity.schema.json)
 *   differentiation: string[] (optional)
 */
function createCandidateOpportunity({ id, problem, category, target_user, differentiation }) {
  if (typeof problem !== 'string' || !problem.trim()) throw new TypeError('createCandidateOpportunity requires a non-empty problem');
  if (typeof category !== 'string' || !category.trim()) throw new TypeError('createCandidateOpportunity requires a non-empty category');
  if (typeof target_user !== 'string' || !target_user.trim()) throw new TypeError('createCandidateOpportunity requires a non-empty target_user');

  const opportunityId = id || slugify(problem.length < 60 ? problem : category);
  const dir = path.join(store.REPO_ROOT, 'candidates', opportunityId);
  if (fs.existsSync(dir)) {
    throw new Error(`Candidate '${opportunityId}' already exists`);
  }

  const now = new Date().toISOString();
  const record = {
    id: opportunityId,
    category,
    problem,
    target_user,
    existing_products: [],
    evidence: [],
    complaints: [],
    requested_features: [],
    proposed_solution: '',
    differentiation: Array.isArray(differentiation) ? differentiation : [],
    monetization: 'unknown',
    estimated_build_days: 0,
    backend_required: false,
    ip_risk: 'low',
    policy_risk: 'low',
    technical_risk: 'low',
    market_signal: 'weak',
    lifecycle_state: 'DISCOVERED',
    created_at: now,
    updated_at: now,
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opportunity.json'), JSON.stringify(record, null, 2) + '\n');

  auditLog.append({
    actor: 'AGENT',
    actorName: 'discovery-agent',
    action: 'DISCOVER',
    opportunityId,
    previousState: null,
    newState: 'DISCOVERED',
  });

  return record;
}

/**
 * Enriches an existing opportunity's content fields (evidence/proposed_solution/market_signal —
 * all fields schemas/opportunity.schema.json already defines) with what research found. This is
 * NOT a lifecycle transition — lifecycle_state is left untouched here; store.transition() remains
 * the only place that changes it. Whitelisted to content fields only, so this can never be used
 * to set lifecycle_state, rejection fields, or anything approval-related.
 */
const CONTENT_PATCH_ALLOWED_KEYS = ['evidence', 'proposed_solution', 'market_signal', 'differentiation', 'existing_products', 'complaints'];

function updateOpportunityContent(id, patch) {
  const existing = store.getOpportunity(id);
  if (!existing) {
    throw new Error(`No opportunity found with id '${id}'`);
  }
  const { _dir, lifecycle_state, rejection_reason, rejection_note, ...rest } = existing;
  const safePatch = {};
  for (const key of CONTENT_PATCH_ALLOWED_KEYS) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }

  const updated = { ...rest, lifecycle_state, ...(rejection_reason ? { rejection_reason } : {}), ...(rejection_note ? { rejection_note } : {}), ...safePatch, updated_at: new Date().toISOString() };
  const filePath = path.join(store.REPO_ROOT, _dir, 'opportunity.json');
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');

  auditLog.append({
    actor: 'AGENT',
    actorName: 'research-agent',
    action: 'RESEARCH_ENRICHMENT',
    opportunityId: id,
    previousState: null,
    newState: null,
    note: `opportunity content enriched with research evidence (${Object.keys(safePatch).join(', ') || 'no fields changed'})`,
  });

  return updated;
}

module.exports = { createCandidateOpportunity, updateOpportunityContent, requestLifecycleTransition };
