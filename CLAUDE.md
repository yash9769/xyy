# CLAUDE.md — instructions for Claude Code sessions in this repo

This repository is a personal **App Factory**: a repeatable pipeline for discovering, building, and shipping small Android apps. It is not itself an app. Read `factory/ARCHITECTURE.md` and `factory/ROADMAP.md` before making structural changes.

## Ground rules

- **Do not build a giant app.** Every generated app under `apps/<id>/` should be a small, single-purpose Kotlin + Jetpack Compose utility unless an approved opportunity record explicitly justifies otherwise (see `factory/ARCHITECTURE.md` §3 for the stack decision and when to deviate).
- **Never copy competitor code, art, logos, or verbatim text.** Research competitors for problem/UX/pricing insight only (see the IP policy at the top of the original task brief, mirrored informally here). Every opportunity's `differentiation` field must be genuine, not a superficial reskin.
- **Never autonomously publish to production.** `appfactory publish --track production` is Gate 4 and requires an explicit human confirmation in the terminal, every time.
- **Never hardcode secrets.** API keys, keystores, and Play service-account JSON live outside the repo; generated apps read them from environment variables / CI secrets only. Run `gitleaks` (via Docker) before any release-candidate build.
- **Don't skip or weaken tests to make them pass.** The test/repair loop in `factory/testing/` is capped at 5–10 iterations; on cap-out, report the blocker rather than disabling the test.
- **Follow the file-based contract between pipeline stages.** Every stage reads/writes JSON conforming to `schemas/*.schema.json` and Markdown reports under `reports/<id>/`. Don't invent a new state-storage mechanism (database, hidden cache) — git-tracked files are the audit log.
- **Never cross an `AWAITING_*` state without a HUMAN-actor transition.** `factory/dashboard/lib/stateMachine.js` is the single source of truth for legal transitions; it hard-codes which actor may perform each one. Do not add a new state-mutating code path anywhere (CLI, a script, a future automation loop) that bypasses `factory/dashboard/lib/store.js` — that is the only place a transition is actually written, and it always calls the state machine's `validate()` first.
- **Do not duplicate the state machine in Python (or anywhere else).** If the CLI needs a new mutating command, add the action to `factory/dashboard/lib/cli.js` first and have `factory/orchestration/pipeline.py` shell out to it — see `factory/dashboard/README.md`.
- **Prefer deterministic code over an LLM call** for anything scriptable (scoring math, validation, templating). Use Claude (this session) for research synthesis, copywriting, code generation, and root-causing failures — not for tasks plain Python already solves.
- **Cost discipline**: before adding any external service or paid API, check `COST_MODEL.md` — the default target is $0/month recurring through Phase 4.

## Where things live

- `factory/dashboard/` — the visual control plane (`npm run dashboard`, http://localhost:4177) and the canonical state-machine/service-layer implementation (`lib/stateMachine.js`, `lib/store.js`, `lib/auditLog.js`, `lib/cli.js`). This is where opportunity/app state transitions actually happen.
- `factory/cli/appfactory.py` + `factory/orchestration/pipeline.py` — the CLI; its mutating commands are thin wrappers around `factory/dashboard/lib/cli.js`, not a separate implementation.
- `factory/state/audit-log.jsonl` — append-only record of every state transition. Never edit or delete an entry once a real (non-test) decision has been recorded.
- `factory/config/scoring-weights.yaml`, `factory/config/kill-criteria.yaml` — tunable, evidence-based thresholds; do not hardcode magic numbers elsewhere.
- `templates/android/` — the base template every new app is generated from. Changes here affect every future app; verify it still builds after edits.
- `candidates/`, `approved/`, `rejected/`, `apps/` — the opportunity/app lifecycle. See `factory/ARCHITECTURE.md` §4.

## When asked to "build an app"

1. Check whether an opportunity record already exists in `candidates/` or `approved/`. If not, run discovery/research first — don't skip straight to code.
2. Confirm the opportunity's `lifecycle_state` is `APPROVED` (or later) before generating app code — check the dashboard or `appfactory status <id>`, don't assume.
3. Generate into `apps/<id>/`, not into the repo root.
4. Run the test and security review stages before proposing a release.
