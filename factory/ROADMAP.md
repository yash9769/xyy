# App Factory — Roadmap (historical, Phase 0/1 planning)

> **This document is historical.** It captured the Phase 0/1 plan at the very start of the
> project, before the 30-document architecture series existed. Its phase numbers (0–7) do not
> match `factory/docs/29-ROADMAP.md`'s (0–10), and the two were never reconciled against each
> other. **`factory/docs/30-PHASE-IMPLEMENTATION-PLAN.md` is the authoritative implementation
> plan going forward** — it is the one document that was written against, and cross-checked for
> accuracy against, the actual repository as it exists today. Treat this file as a record of what
> Phase 0/1 originally intended, useful for context on why the dashboard/state-machine/CLI look
> the way they do, not as the current source of truth for what comes next.

Guiding rule: build the smallest useful version of each phase, use it, then expand. Do not build Phase N+1 tooling before Phase N is proven on at least one real opportunity.

---

## PHASE 0 — Architecture (this delivery)

- **Objective**: Design the factory correctly before writing app code.
- **Inputs**: task brief, environment inspection.
- **Outputs**: `factory/ENVIRONMENT.md`, `factory/ARCHITECTURE.md`, `factory/ROADMAP.md` (this file), `COST_MODEL.md`, `schemas/*.json`, repo skeleton, minimal CLI stub.
- **Dependencies**: none.
- **Tasks**: environment inspection; stack decision; repo scaffold; schema design; CLI shape.
- **Risks**: over-designing before any real opportunity exists. Mitigated by keeping Phase 1 deliberately thin.
- **Complexity**: low (docs + scaffolding, no app logic).
- **Acceptance criteria**: all four docs exist and are internally consistent; repo skeleton matches `ARCHITECTURE.md` §4; `appfactory --help` runs and lists all commands as stubs.

## PHASE 1 — Working local MVP (manual-heavy, tooling-light)

- **Objective**: Run one opportunity through the full lifecycle *manually*, using the CLI only for state-tracking and file scaffolding — proves the file-based contract between stages before automating any of them.
- **Inputs**: one real candidate opportunity (owner or Claude picks it via manual research).
- **Outputs**: `candidates/<id>/opportunity.json`, `approved/<id>/{PRD,user-stories,...}.md`, first generated Android app skeleton in `apps/<id>/`.
- **Dependencies**: Phase 0.
- **Tasks**:
  1. Implement `appfactory discover|analyze|approve|spec` as real (not stub) commands that scaffold files and validate against `schemas/`.
  2. Hand-run research/scoring for one opportunity with Claude synthesizing, not automated scraping yet.
  3. Generate one Android template project (`templates/android/`) manually reviewed for correctness.
  4. `appfactory build` copies the template with placeholders substituted (package name, app name).
- **Risks**: template quality — a bad base template compounds across every future app. Spend real effort here once.
- **Complexity**: medium.
- **Acceptance criteria**: one opportunity has a complete `candidates → approved → apps` paper trail in git; the generated app builds with `./gradlew assembleDebug` successfully.

## PHASE 2 — Automated research

- **Objective**: Reduce manual research time via WebSearch-driven scripts for competitor discovery and review-theme extraction.
- **Inputs**: opportunity category/keywords.
- **Outputs**: `research/<id>/*.json` records conforming to `research-record.schema.json`, `reports/<id>/review-themes.md` (TOP 5 pains/requests/strengths).
- **Dependencies**: Phase 1 proved the schema is usable.
- **Tasks**: `factory/research/` scripts that use WebSearch to find competitor listings + public review excerpts; classification heuristics (keyword-based, not ML) sorted into the categories in the brief (§9); Claude-assisted synthesis pass to write the TOP 5 summaries with evidence links.
- **Risks**: WebSearch has no direct Play Store review API — review data will be thinner than ideal; be explicit in reports about VERIFIED vs INFERRED vs ESTIMATE.
- **Complexity**: medium.
- **Acceptance criteria**: `appfactory analyze <id>` produces a research report with ≥3 competitors and cited evidence for every claim, in under a few minutes of human review time.

## PHASE 3 — Automated app generation

- **Objective**: `appfactory build <id>` deterministically generates a working, differentiated app from spec + template with minimal manual editing.
- **Inputs**: approved PRD + UX doc.
- **Outputs**: full Android project in `apps/<id>/` with package/app-name/icon/theme substituted, core screens scaffolded per the UX doc.
- **Dependencies**: Phase 1 template, Phase 2 spec quality.
- **Tasks**: parameterize `templates/android/` (package renaming via Gradle + directory rename script); Claude Code fills in feature-specific screens/logic per PRD; wire minimal analytics (privacy-respecting, e.g. no analytics by default for simple utilities) and privacy config; auto-generate `README.md`/`PRIVACY.md`/`CHANGELOG.md` per app.
- **Risks**: template drift/rot as Android tooling updates; mitigate by re-verifying the template builds on a cadence (e.g. before each new app).
- **Complexity**: medium-high.
- **Acceptance criteria**: two independently-scoped apps generated from the same template with no cross-contamination, both build successfully.

## PHASE 4 — Automated QA/security

- **Objective**: `appfactory test` and `appfactory review` run without manual babysitting, with a bounded auto-repair loop.
- **Inputs**: generated app source.
- **Outputs**: `reports/<id>/test-report.md`, `reports/<id>/security-review.md`.
- **Dependencies**: Phase 3 apps exist.
- **Tasks**: JVM unit tests + Compose UI tests as default suite; build→test→analyze→fix loop capped at 5–10 iterations, stopping with a clear blocker report on cap-out; Dockerized gitleaks/semgrep/Android Lint/Trivy wrappers in `factory/security/`; findings report format per `ARCHITECTURE.md` §8.
- **Risks**: flaky/emulator-dependent tests; mitigated by preferring JVM-only tests (Robolectric) and treating instrumented tests as optional/CI-only.
- **Complexity**: high (the repair loop is the trickiest automation in the whole factory).
- **Acceptance criteria**: a deliberately-broken test/lint finding is caught and either auto-fixed within the iteration cap or correctly reported as a blocker (never silently skipped).

## PHASE 5 — Play Store automation

- **Objective**: `appfactory release` and `appfactory publish` handle signing, AAB build, store metadata, and Play API upload, gated by human confirmation for production.
- **Inputs**: passed test + security reports, store copy, graphics.
- **Outputs**: signed AAB, uploaded release on chosen track, store listing populated.
- **Dependencies**: Phase 4 gating reports; a real Google Play Developer account (one-time $25 fee, owner-provided); a service-account JSON (owner-provided, never committed).
- **Tasks**: keystore generation/management (stored outside repo); release-notes/store-copy generation (Claude-assisted, human-reviewed for no misleading claims); `google-api-python-client` wrapper for internal/closed/production track uploads; pre-publish checklist validator (build, tests, security, privacy, metadata completeness, version code).
- **Risks**: this phase touches real money/irreversible public actions — every production publish requires explicit interactive confirmation per the Autonomy Rule; internal/closed tracks can be more automated since they're low-risk.
- **Complexity**: high (external API, account setup, human-in-the-loop by design, not just convenience).
- **Acceptance criteria**: first app reaches Internal Testing track end-to-end via the CLI; production publish only ever happens with a human typing an explicit confirmation.

## PHASE 6 — Monitoring/analytics

- **Objective**: `appfactory monitor` pulls real performance data and produces a per-release report; `appfactory iterate` proposes next steps.
- **Inputs**: Play Console data (installs, ratings, reviews, crashes via Play Developer Reporting API), any in-app privacy-respecting analytics.
- **Outputs**: `reports/<id>/monitoring-<date>.md`, iteration proposals with MoSCoW-prioritized changes.
- **Dependencies**: Phase 5 (an app must be live to monitor).
- **Tasks**: scheduled (manually triggered, not a cron daemon in Phase 6) pull of Play Console metrics; review-batch summarization (Claude-assisted); kill-criteria evaluation against thresholds in `factory/config/kill-criteria.yaml` (start with hypotheses, tune with real data per app).
- **Risks**: premature kill decisions from too little data — require a minimum data window (e.g. 30 days or N installs) before a KILL recommendation is actionable, not just WATCH.
- **Complexity**: medium.
- **Acceptance criteria**: first live app produces one real monitoring report with an evidence-backed BUILD/WATCH/KILL-style recommendation for its next iteration.

## PHASE 7 — Multi-app scaling

- **Objective**: Run the full loop concurrently for many apps without re-deriving process each time.
- **Inputs**: portfolio of apps at various lifecycle stages.
- **Outputs**: `appfactory status` portfolio view; consistent per-app documentation; scaling from 1 to N apps without new tooling per app.
- **Dependencies**: Phases 1–6 each proven on at least one real app.
- **Tasks**: portfolio-level dashboard (a Markdown or simple static report, not a new service) aggregating `apps/*/app-manifest.json`; reusable lessons fed back into `templates/android/` (e.g. common utilities extracted once multiple apps need them — resist premature extraction before the second real use).
- **Risks**: template/factory-tooling entropy as apps diverge; mitigated by only generalizing patterns proven across ≥2 real apps.
- **Complexity**: medium (mostly aggregation, not new capability).
- **Acceptance criteria**: portfolio view correctly reflects lifecycle state for ≥2 concurrently-managed apps.

---

## Minimum viable version of the factory (do this first)

Phases 0 + 1, fully manual except file scaffolding and validation. That alone proves whether the process produces a shippable app idea before investing in automation.

## Explicitly manual, never automated

- Production publish confirmation (Gate 4) — always a human action.
- Google Play Developer account creation and billing.
- Legal/data-safety declarations submitted to Google — human reviews and submits.
- Any external communication (support replies, marketing posts) — drafted by Claude if asked, sent by the human.
