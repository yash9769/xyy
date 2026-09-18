# App Factory Dashboard

The visual control plane for the factory. Claude operates the factory; this is where the owner
inspects what's been discovered/researched/built and clicks Approve/Reject — no stage advances
past a `AWAITING_*` state without that click.

## Run it

```
npm run dashboard
```
or
```
appfactory dashboard
```
then open http://localhost:4177.

## Architecture

- `server.js` — Express app: serves `public/` (a plain HTML/CSS/JS single-page app, no build step)
  and a small REST API under `/api/*`.
- `lib/stateMachine.js` — the single source of truth for valid lifecycle states and transitions.
  Every `AWAITING_*` state's outgoing transition is hard-coded to require `actor === 'HUMAN'`.
- `lib/store.js` — reads/writes the same files the CLI always has (`candidates/`, `approved/`,
  `rejected/`, `apps/`) plus the audit log. This is the *only* place a transition is actually
  performed — both the REST API and the CLI bridge call it.
- `lib/auditLog.js` — append-only `factory/state/audit-log.jsonl`.
- `lib/cli.js` — the same service layer exposed as a command-line tool
  (`node lib/cli.js discover|transition|status|actions`), so `factory/cli/appfactory.py`'s
  mutating commands can shell out to it instead of re-implementing state transitions in Python.
  **Do not add a second implementation of the state machine in Python** — if the CLI needs a new
  mutation, add it to `cli.js` first.

## No second source of truth

The dashboard does not use a database. Every opportunity/app it shows comes from reading
`opportunity.json` / `status.json` files that already exist under `candidates/`, `approved/`,
`rejected/`, `apps/` — the same files `git log` already tracks. Closing the dashboard and using
the CLI (or vice versa) never desyncs anything, because there's exactly one state.

## What's real vs. stubbed (Phase A)

Real: opportunity list/detail, evidence display, Approve/Reject/Need-More-Research with reason
codes, the full 19-state machine with actor-gated transitions, the audit log, Hisaab's build
status (read from its own `status.json`, hand-verified against real Phase 1 outputs).

Stubbed, explicitly labeled as such in the UI (not faked): Testing, Release Candidates auto-list,
Published, Analytics, Agent Activity's Start/Pause/Stop controls — all of these need a live,
long-running automated agent loop that doesn't exist until Phase 2+ builds it.
