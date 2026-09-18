#!/usr/bin/env node
'use strict';

/**
 * CLI bridge — the same service layer the dashboard's REST API calls, exposed as a command line
 * tool so factory/cli/appfactory.py can shell out to it instead of re-implementing state
 * mutations in Python. This is the fix for "don't duplicate business logic between the web UI
 * and CLI": there is exactly one implementation (this directory), and both the dashboard and the
 * Python CLI are thin clients of it.
 *
 * Usage:
 *   node cli.js discover --problem "..." --category "..." --target-user "..."
 *   node cli.js transition <id> <action> --actor HUMAN [--reason weak_demand] [--note "..."]
 *   node cli.js status [id]
 *
 * Every command prints a single JSON object to stdout and exits 0 on success, or prints
 * {"error": "..."} and exits 1 on failure — appfactory.py parses this rather than screen-scraping
 * human-readable text.
 */

const fs = require('fs');
const path = require('path');
const store = require('./store');
const stateMachine = require('./stateMachine');
const auditLog = require('./auditLog');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      flags[key] = value;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unnamed-opportunity';
}

function ok(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
  process.exit(0);
}

function fail(message) {
  process.stdout.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function cmdDiscover(flags) {
  const { problem, category, 'target-user': targetUser } = flags;
  if (!problem || !category || !targetUser) {
    return fail('discover requires --problem, --category, --target-user');
  }
  const id = slugify(problem.length < 60 ? problem : category);
  const dir = path.join(store.REPO_ROOT, 'candidates', id);
  if (fs.existsSync(dir)) return fail(`Candidate '${id}' already exists`);

  const now = new Date().toISOString();
  const record = {
    id,
    category,
    problem,
    target_user: targetUser,
    existing_products: [],
    evidence: [],
    complaints: [],
    requested_features: [],
    proposed_solution: '',
    differentiation: [],
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
  fs.mkdirSync(path.join(dir, 'research'), { recursive: true });

  auditLog.append({ actor: 'AGENT', actorName: 'agent', action: 'DISCOVER', opportunityId: id, previousState: null, newState: 'DISCOVERED' });

  ok({ id, dir: path.relative(store.REPO_ROOT, dir), lifecycle_state: 'DISCOVERED' });
}

function cmdTransition(positional, flags) {
  const [id, action] = positional;
  if (!id || !action) return fail('transition requires <id> <action>');
  const actor = flags.actor || 'HUMAN';
  try {
    const result = store.transition({
      id,
      action,
      actor,
      reason: flags.reason,
      note: flags.note,
      actorName: flags['actor-name'],
    });
    ok(result);
  } catch (e) {
    fail(e.message);
  }
}

function cmdStatus(positional) {
  const [id] = positional;
  if (id) {
    const opp = store.getOpportunity(id) || store.getAppStatus(id);
    if (!opp) return fail(`No opportunity or app found with id '${id}'`);
    return ok(opp);
  }
  ok({ opportunities: store.listAllOpportunities(), apps: store.listApps(), counts: store.counts() });
}

function main() {
  const [, , command, ...rest] = process.argv;
  const { positional, flags } = parseArgs(rest);

  switch (command) {
    case 'discover':
      return cmdDiscover(flags);
    case 'transition':
      return cmdTransition(positional, flags);
    case 'status':
      return cmdStatus(positional);
    case 'actions': {
      const [id] = positional;
      const opp = store.getOpportunity(id);
      if (!opp) return fail(`No opportunity found with id '${id}'`);
      return ok({ id, lifecycle_state: opp.lifecycle_state, availableActions: stateMachine.actionsFrom(opp.lifecycle_state) });
    }
    default:
      return fail(`Unknown command '${command}'. Expected: discover, transition, status, actions`);
  }
}

main();
