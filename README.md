# App Factory

A one-person, repeatable pipeline for turning validated app opportunities into published, monitored, monetized Android apps — and repeating. This repo is the factory, not a single app.

Start here:

- `factory/ENVIRONMENT.md` — what tooling is available and what's missing.
- `factory/ARCHITECTURE.md` — pipeline stages, technology stack decision, data models, CLI, security model.
- `factory/ROADMAP.md` — phased delivery plan (Phase 0–7) with objectives, tasks, risks, and acceptance criteria per phase.
- `COST_MODEL.md` — recurring cost tracking; the factory targets $0/month recurring cost through Phase 4.
- `CLAUDE.md` — instructions for Claude Code sessions working in this repo.

## Quickstart

```bash
./scripts/appfactory discover --problem "..." --category "..." --target-user "..."
./scripts/appfactory status
./scripts/appfactory approve <id>       # Gate 1
```

Every other command (`spec`, `build`, `test`, `review`, `release`, `publish`, `monitor`, `iterate`) is currently a labeled stub pointing at the roadmap phase that implements it — see `factory/ARCHITECTURE.md` §6.

## Current phase

**Phase 0 (architecture) complete.** Phase 1 (working local MVP, run manually end-to-end for one real opportunity) is next — see `factory/ROADMAP.md`.

## Repository layout

See `factory/ARCHITECTURE.md` §4 for the full structure and rationale. Short version: `factory/` is the pipeline's own code, `templates/` holds reusable app scaffolding, `candidates/` → `approved/`/`rejected/` → `apps/` is the opportunity lifecycle, and `reports/`/`assets`/`logs` hold generated artifacts per opportunity/app.
