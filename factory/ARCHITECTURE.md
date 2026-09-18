# App Factory — Architecture

## 1. Purpose

A repeatable pipeline, run mostly by one person plus Claude Code, that turns a validated market problem into a published, monitored, monetized Android app — and repeats. This document is the technical design. See `ROADMAP.md` for phased delivery and `COST_MODEL.md` for spend.

## 2. Pipeline stages

```
DISCOVERY → RESEARCH → OPPORTUNITY ANALYSIS → SCORING → [GATE 1: HUMAN APPROVAL]
  → PRODUCT SPECIFICATION → UX DESIGN → IMPLEMENTATION → AUTOMATED TESTING
  → SECURITY REVIEW → STORE ASSETS → [GATE 2/3: HUMAN APPROVAL] → RELEASE
  → [GATE 4: HUMAN APPROVAL] → PUBLISH → MONITORING → USER FEEDBACK ANALYSIS
  → ITERATION OR KILL
```

Each stage is a directory under `factory/` with its own scripts and a stable file-based contract: every stage reads JSON/Markdown from the previous stage and writes JSON/Markdown for the next. No stage calls another stage's internals directly — they're decoupled through files in `candidates/<id>/`, `approved/<id>/`, `apps/<id>/`. This keeps every stage independently testable and lets a human inspect state between any two stages by just reading files in git.

| Stage | Directory | Primary tool | Human gate after? |
|---|---|---|---|
| Discovery | `factory/discovery/` | WebSearch + heuristics | no |
| Research | `factory/research/` | WebSearch + structured scraping of public listing pages | no |
| Opportunity analysis + Scoring | `factory/scoring/` | deterministic scoring script + Claude synthesis | **Gate 1** |
| Product spec | `factory/product/` | Claude Code (doc generation) | no |
| UX design | `factory/product/` (ux-design.md) | Claude Code | no |
| Implementation (generation) | `factory/generation/`, `templates/` | Claude Code + Gradle | no |
| Testing | `factory/testing/` | Gradle/JUnit/Compose UI tests, repair loop | no |
| Security review | `factory/security/` | gitleaks, semgrep, Android Lint, Trivy (Dockerized) | **Gate 2/3** (release candidate) |
| Store assets | `factory/publishing/assets/` | Claude Code + Canva/Gamma for graphics | no |
| Release | `factory/publishing/` | Gradle AAB build + checklist validator | **Gate 4** (production publish only) |
| Publish | `factory/publishing/` | Google Play Developer API | irreversible — always manual confirm |
| Monitoring | `factory/analytics/` | Play Console API / Vendor reports, local aggregation | no |
| Iteration/Kill | `factory/orchestration/` | scoring against kill criteria + human review | yes, before implementation of changes |

## 3. Technology stack decision

### Android app stack: **Kotlin + Jetpack Compose (native)**

| Criterion | Flutter | Kotlin + Compose | React Native |
|---|---|---|---|
| Dev speed for small utility apps | high | high | medium |
| Claude Code compatibility | good (Dart less common in training data) | **best** — Kotlin/Gradle is common, well-understood by tooling | good (JS/TS) but native module glue adds friction |
| Android reliability | good | **best** (first-party) | medium (bridge overhead, more moving parts) |
| UI quality | good | **best** (Material 3 native) | good |
| Package ecosystem for Android specifics | medium | **best** (direct Android API access) | medium |
| Offline functionality | good | **best** (no bridge, direct SQLite/DataStore) | good |
| Build complexity | medium (separate toolchain) | **low** (already have JDK+Gradle, nothing to install) | medium (Metro, native modules) |
| App size | medium (~15-20MB min) | **small** (~2-5MB for simple apps) | medium (~10-15MB) |
| Native Android integration (widgets, notifications, permissions) | requires plugins | **direct** | requires plugins/bridges |
| Testing/automation maturity | good | **best** (JUnit, Robolectric, Compose test, all JVM-native, no emulator required for most tests) | medium |
| Suitability for small single-purpose utility apps | good | **best** | overkill |

**Decision: Kotlin + Jetpack Compose is the default stack.** It requires zero new SDK installs beyond the Android SDK/build-tools (already need those for any stack), produces the smallest/fastest apps, and its unit-testable architecture (ViewModel + JVM tests, no emulator needed) fits the "fast MVP, low maintenance" objective directly. Flutter is reconsidered only if a specific opportunity requires shipping the same app to iOS — that is a deliberate, evidence-based exception, not a default.

Standard app-level architecture per generated app: **single-module, MVVM, Jetpack Compose UI, Kotlin coroutines, Room (only if local persistence needed) or DataStore (for simple key-value), no DI framework for v1 (manual constructor injection — Hilt only added if the app grows past ~5 screens).**

### Orchestration/factory-layer stack: **Python 3.11**

Python is already installed, has the best ecosystem for text processing, JSON/YAML wrangling, scoring math, and report generation — none of which need Node or a compiled language. The factory CLI (`appfactory`) is a Python package using only the standard library (`argparse`) plus PyYAML — no heavy framework, no server, runs as a local CLI only.

### Supporting tools (Dockerized, not host-installed)

- **Android SDK/build-tools/emulator**: Docker image for Gradle builds and CI, so the host stays clean. `adb`/emulator use is optional (JVM tests preferred).
- **Security scanners**: gitleaks, semgrep, Trivy — run via `docker run` in `factory/security/`, pinned image tags, no host install.
- **Play publishing**: Python + `google-api-python-client` against the Android Publisher API, service-account JSON supplied via env var pointing to a file path (never committed).

## 4. Repository structure

```
app-factory/                       (this repo, yash9769/xyy)
├── CLAUDE.md                      # instructions for Claude Code sessions working in this repo
├── README.md
├── COST_MODEL.md
├── factory/
│   ├── ENVIRONMENT.md
│   ├── ARCHITECTURE.md            # this file
│   ├── ROADMAP.md
│   ├── config/                    # factory-wide config (scoring weights, kill thresholds, category denylist)
│   ├── discovery/                 # opportunity discovery scripts
│   ├── research/                  # competitor + review research pipeline
│   ├── scoring/                   # deterministic scoring engine
│   ├── product/                   # PRD/spec/UX generation templates & scripts
│   ├── generation/                # app scaffolding/codegen from templates/
│   ├── testing/                   # test runner + repair-loop orchestration
│   ├── security/                  # security review pipeline (gitleaks/semgrep/lint wrappers)
│   ├── publishing/                # release build, store assets, Play API upload
│   ├── analytics/                 # post-launch monitoring & report generation
│   ├── orchestration/             # the appfactory CLI + pipeline state machine
│   └── cli/                       # `appfactory` entrypoint (Python)
├── templates/
│   ├── android/                   # Kotlin+Compose base template (Phase 3)
│   ├── flutter/                   # reserved, empty until an opportunity needs it
│   └── shared/                    # shared privacy policy templates, licenses, CI workflow templates
├── candidates/                    # opportunities under research, pre-approval (candidates/<id>/opportunity.json + research/)
├── approved/                      # opportunities that passed Gate 1 (spec + ux docs live here)
├── rejected/                      # opportunities rejected, kept for record/learning
├── apps/                          # one directory per generated app: apps/<app-id>/ (full Android project + its own docs)
├── assets/                        # generated store graphics per app
├── reports/                       # scoring reports, security reviews, release-performance reports
├── logs/                          # pipeline run logs
├── scripts/                       # one-off/dev-convenience shell scripts
└── schemas/                       # JSON Schemas for opportunity, research record, app manifest
```

Each `<id>` is a short slug (e.g. `unit-converter-offline`), stable across `candidates/ → approved/ → apps/`.

## 5. Data models

See `schemas/opportunity.schema.json` for the canonical, machine-validated opportunity record (extends the schema given in the brief with `id`, `status`, timestamps, and an `evidence[]` array of `{claim, source_url, type: VERIFIED_FACT|INFERRED|ESTIMATE|OPINION}` — every non-trivial claim in the record must cite one of these).

Companion schemas:
- `schemas/research-record.schema.json` — one per competitor app studied.
- `schemas/app-manifest.schema.json` — per generated app: package id, version, stack, status in lifecycle (`IDEA → RESEARCH → APPROVED → BUILDING → QA → READY → INTERNAL → CLOSED_TEST → PRODUCTION → ITERATING → PAUSED → KILLED`), metrics snapshot references.

## 6. CLI design

`appfactory <command> [id]`, implemented in `factory/cli/appfactory.py`, dispatching to `factory/orchestration/`:

```
appfactory discover                 # run discovery heuristics, write candidates/<id>/opportunity.json (status=candidate)
appfactory analyze <id>             # run research + scoring, write reports/<id>/opportunity-report.md
appfactory approve <id>             # GATE 1 — human confirms; moves candidates/<id> → approved/<id>
appfactory spec <id>                # generate PRD/user-stories/architecture/etc. in approved/<id>/
appfactory build <id>               # generate app from template into apps/<id>/
appfactory test <id>                # run build→test→fix loop (max N iterations), write reports/<id>/test-report.md
appfactory review <id>              # security + policy + store-readiness review, write reports/<id>/security-review.md
appfactory release <id>             # GATE 2/3 — build signed AAB, run pre-publish checklist
appfactory publish <id> --track internal|closed|production   # GATE 4 for production — Play API upload
appfactory monitor <id>             # pull Play Console metrics + reviews, write reports/<id>/monitoring-<date>.md
appfactory iterate <id>             # propose next version or recommend kill, per kill criteria in factory/config/
appfactory status [id]              # print lifecycle state of one or all apps (portfolio view)
```

Every command is idempotent and re-runnable; state lives in files, not in a database, so `git diff` is the audit log.

## 7. AI vs deterministic code

- Deterministic (plain Python, no LLM call): scoring math, schema validation, file I/O, checklist gating, Gradle invocation, test running, report templating, kill-threshold checks.
- Claude-assisted (this session, invoked interactively — not a separate API call/cost): research synthesis and clustering of reviews, PRD/UX copywriting, code generation for the app template, store listing copy, root-causing test/security failures.
- No automated LLM API calls are wired into the CLI itself in Phase 1–2 — Claude Code (this tool) *is* the AI layer, invoked by the human running `appfactory` commands and asking Claude to fill in the Claude-assisted steps. This avoids a second, metered LLM API dependency and keeps cost at zero beyond the existing Claude Code usage.

## 8. Security model

- Secrets: Play service-account JSON and any future API keys live outside the repo (path via env var, e.g. `PLAY_SERVICE_ACCOUNT_JSON`), referenced in `.gitignore`'d `.env` files never committed. `gitleaks` runs in every `appfactory review` invocation and as a pre-commit hook once Phase 4 lands.
- Per-app review (`factory/security/`) checks, via Dockerized tools: exported Android components/intents/deep links (Android Lint + manual manifest check), cleartext traffic (`usesCleartextTraffic` must be false), WebView JS bridges, dependency CVEs (Trivy), hardcoded secrets (gitleaks), logging of sensitive data (grep-based static check), debug vs release build config divergence.
- Output is always `factory/security/security-review.md` per app with FINDING/SEVERITY/EVIDENCE/IMPACT/REMEDIATION/STATUS columns — never silently passed.
- Publishing to `production` track is blocked in code (`appfactory publish`) unless `reports/<id>/security-review.md` and `reports/<id>/test-report.md` both show a `PASS` status and a human runs the command interactively (no CI auto-publish to production, ever).

## 9. Cost model

See `COST_MODEL.md`. Summary: **$0 recurring infra cost** for Phases 0–4 (everything runs in this container or free-tier GitHub Actions). The only unavoidable cost is the one-time $25 Google Play Developer registration fee, and later a Play-listing-mandated privacy policy hosting (can be a free GitHub Pages page).
