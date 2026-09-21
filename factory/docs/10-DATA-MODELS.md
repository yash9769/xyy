App Factory — Data Models
1. Purpose
This document defines the conceptual data model for the App Factory.
The factory is file-based initially. These models describe the information represented by those files and must remain independent of any future database implementation.
The data model must support:

* opportunities
* research
* product specifications
* applications
* builds
* tests
* security reviews
* releases
* distribution
* monitoring
* agent executions
* costs
* audit events

2. Data Model Principles

1. Every major resource has a stable identifier.
2. Records must have explicit types.
3. Records must have creation/update timestamps where appropriate.
4. Important records should retain provenance.
5. LLM-generated information must be distinguishable from verified information.
6. Records must be schema validated.
7. Historical records must not be silently rewritten.
8. References between resources must use stable IDs.
9. Secrets must never be stored in ordinary records.
10. A record must not claim a state that the lifecycle state machine does not authorize.

3. Common Metadata
Where applicable, records should contain:

```json
{
  "id": "stable-id",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "schema_version": "1.0"
}
```

Resources should additionally identify their lifecycle relationship where applicable.
4. Opportunity
An Opportunity represents a potential application business/product opportunity.
Conceptual structure:

```json
{
  "id": "opp-001",
  "name": "Example Opportunity",
  "problem": {},
  "target_users": [],
  "research_id": "research-001",
  "analysis_id": "analysis-001",
  "distribution": {},
  "risks": [],
  "estimated_cost": {},
  "status": "OPPORTUNITY_READY"
}
```

5. Research Record
Research contains evidence collected about an opportunity.
It may contain:

```text
sources
competitors
user complaints
market signals
pricing observations
distribution channels
technical observations
research notes
```

Each significant claim should retain its source/provenance where practical.
6. Evidence
Evidence should have a structured representation.
Conceptually:

```json
{
  "id": "evidence-001",
  "type": "WEB_SOURCE",
  "source": "source identifier",
  "claim": "Observed claim",
  "retrieved_at": "ISO-8601",
  "confidence": 0.0,
  "notes": ""
}
```

The system must distinguish evidence from interpretation.
7. Opportunity Analysis
Opportunity analysis may contain:

```text
problem_severity
competition
differentiation
demand_signals
market_size
technical_complexity
monetization
distribution_difficulty
security_risk
estimated_build_cost
estimated_operating_cost
uncertainties
```

Scores should have documented definitions.
An unexplained numeric score is not sufficient evidence.
8. Product Specification
A ProductSpec defines what the application should do.
It may include:

```text
product_name
target_users
problem
value_proposition
mvp_features
non_goals
user_flows
screens
data_model
privacy_requirements
permissions
analytics
monetization
acceptance_criteria
technical_constraints
```

The product specification becomes a controlled input to engineering.
9. Application
An Application represents an actual software product.
Conceptual fields:

```text
id
name
package_name
repository
template_version
product_spec_id
current_state
version
workspace
created_at
```

The application lifecycle state must be authoritative from the state machine.
10. Build Record
A Build represents an attempt to compile/package an application.
It should capture:

```text
build_id
application_id
commit
branch
build_command
environment
started_at
completed_at
status
artifact
logs
error
duration
```

A build record must not claim success unless the build was actually executed and verified.
11. Test Run
A TestRun records a test execution.
Possible fields:

```text
test_run_id
application_id
commit
test_suite
started_at
completed_at
status
passed
failed
skipped
artifacts
logs
```

12. Security Review
A SecurityReview represents security validation.
Possible findings:

```text
severity
category
title
description
evidence
location
recommendation
status
```

Security status should distinguish:

```text
PASS
FAIL
WARNING
NOT_RUN
```

13. Release Candidate
A ReleaseCandidate represents a potentially publishable application version.
It should reference:

```text
application
version
commit
build
tests
security_review
artifacts
store_metadata
known_issues
generated_at
```

A release candidate is not a publication.
14. Release
A Release represents an actual publication attempt or verified release.
Possible fields:

```text
release_id
application_id
version
artifact
target
status
submitted_at
published_at
external_release_id
error
```

External publication status must be verified rather than inferred.
15. Distribution Campaign
A DistributionCampaign represents an acquisition/distribution experiment.
It may include:

```text
campaign_id
application_id
channel
audience
creative
budget
start_time
end_time
status
approval
```

Financial information should be structured and auditable.
16. Metric Snapshot
A MetricSnapshot records measurements.
Examples:

```text
installs
activation
retention
crashes
ratings
reviews
revenue
spend
impressions
clicks
conversions
CPI
CAC
ROAS
```

Every metric should have:

* metric name
* value
* time period
* source
* population/segment where applicable
* retrieval timestamp

17. Agent Run
An AgentRun records one execution of an agent.
Possible fields:

```text
run_id
agent_type
agent_version
task
resource_id
model
provider
prompt_version
started_at
completed_at
status
tool_calls
usage
cost
output_reference
error
```

Do not store sensitive secrets in agent-run records.
18. Tool Execution
A ToolExecution records an important tool call.
Possible fields:

```text
execution_id
tool
agent_run_id
resource_id
started_at
completed_at
status
input_hash
result_summary
error
cost
```

Sensitive inputs should be redacted or represented by hashes/references.
19. Audit Event
Audit events represent lifecycle and consequential actions.
Minimum conceptual structure:

```json
{
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "actor_type": "HUMAN|AGENT|SYSTEM",
  "actor_id": "id",
  "action": "ACTION",
  "resource_type": "APPLICATION",
  "resource_id": "id",
  "state_before": "STATE",
  "state_after": "STATE",
  "metadata": {}
}
```

Audit events are append-only.
20. Provenance
Information produced by agents should retain provenance where practical.
Possible provenance:

```text
HUMAN_INPUT
WEB_SOURCE
API_SOURCE
SYSTEM_CALCULATION
AGENT_GENERATED
AGENT_DERIVED
```

21. Relationships
Core relationships:

```text
Opportunity
 ├── Research
 ├── Analysis
 └── ProductSpec
       ↓
    Application
       ├── Builds
       ├── Tests
       ├── Security Reviews
       ├── Release Candidates
       ├── Releases
       ├── Campaigns
       └── Metrics
```

AgentRuns and AuditEvents may reference any of these resources.
22. Versioning
Schemas must have versions.
Breaking schema changes require:

* new schema version
* migration strategy where required
* compatibility considerations
* tests

Never silently reinterpret an old record under a new schema.
23. Data Integrity
References must point to existing valid resources.
Examples:

* Build must reference an existing Application.
* TestRun must reference an Application and commit.
* ReleaseCandidate must reference a verified Build.
* Release must reference a ReleaseCandidate or valid release artifact.
* MetricSnapshot must identify its source.

24. Data Retention
Historical evidence, decisions, builds, releases, and audit records should be retained unless a documented retention policy permits deletion.
Killing an application must not automatically delete its historical evidence.
25. Future Database Migration
The initial implementation remains file-based.
If a database is introduced later, the conceptual data model should remain stable.
The database becomes a storage implementation, not the definition of business semantics.

---

## Reconciliation with current implementation (as of 2026-09-21)

The factory already has three real, working JSON Schemas under `schemas/`: `opportunity.schema.json`, `research-record.schema.json`, and `app-manifest.schema.json`. This section maps this document's 17 conceptual record types onto them and states plainly which ones have no implementation at all.

### Resource-by-resource status

| This document's resource | Existing equivalent | Status |
|---|---|---|
| Opportunity (§4) | `schemas/opportunity.schema.json` (fields: `id, category, problem, target_user, existing_products, evidence, complaints, requested_features, proposed_solution, differentiation, monetization, estimated_build_days, backend_required, ip_risk, policy_risk, technical_risk, market_signal, lifecycle_state, rejection_reason, rejection_note, score, created_at, updated_at`) | **Implemented, with a real record**: `approved/household-help-wage-tracker/opportunity.json`. Field names differ from this document's example (`target_users` here vs. `target_user` there; no separate `research_id`/`analysis_id` — evidence and complaints are embedded directly in the opportunity record rather than referenced by ID), and there is no `name` field (the `id` slug doubles as the display identifier). Not reconciled to match this document's exact shape — flagged, not changed. |
| Research Record (§5) | `schemas/research-record.schema.json` (fields: `app_name, developer, opportunity_id, category, rating, review_count, download_range, pricing, subscription_structure, has_ads, key_features, visible_ux_patterns, recurring_complaints, recurring_praise, user_requested_features, target_demographic, localization, update_frequency, apparent_positioning, confidence, source_url, captured_at`) | **Schema exists, but has never been used.** Hisaab's actual competitor research (`reports/phase1-opportunity-selection.md`) was written as narrative Markdown with inline citations, not as structured `research-record.schema.json`-conformant JSON records — despite the schema having existed since Phase 0. This is a concrete, avoidable gap: the infrastructure to do this "right" already existed and wasn't used in practice. |
| Evidence (§6) | Embedded inline in `opportunity.schema.json`'s `evidence` array: `{claim, source_url, type: VERIFIED_FACT\|INFERRED\|ESTIMATE\|OPINION}` | **Implemented, and used** — Hisaab's opportunity record has six real evidence entries with this shape. No `confidence` numeric field (0.0–1.0) as this document proposes — the existing schema uses a coarser four-value `type` enum instead. No separate `id` per evidence item (they're anonymous array entries, not independently addressable records). |
| Opportunity Analysis (§7) | `opportunity.schema.json`'s `score` object (`total, dimensions, recommended_action, reasoning`) | **Schema exists, never populated.** No opportunity record in this repository has ever had its `score` field filled in — `factory/scoring/` (per `factory/ARCHITECTURE.md` §2) has no code in it. Hisaab's risk/complexity assessment lives instead as free-text fields directly on the opportunity record (`ip_risk, policy_risk, technical_risk, market_signal, estimated_build_days`) — a flatter, less structured version of this document's `OpportunityAnalysis`. |
| Product Specification (§8) | No schema exists. Hisaab's product spec is seven separate Markdown files: `apps/household-help-wage-tracker/{PRD,USER_FLOWS,FEATURES,ARCHITECTURE,TEST_PLAN,PRIVACY,MONETIZATION}.md` | **Not implemented as structured data at all.** This is prose, not a `ProductSpec` JSON record — there is no `product_name`/`mvp_features`/`acceptance_criteria` field anyone could query or validate. Human-readable and complete, but not machine-checkable against this document's shape. |
| Application (§9) | `schemas/app-manifest.schema.json` (fields: `id, opportunity_id, package_id, app_name, stack, version_name, version_code, lifecycle_status, launch_date, repository_path, metrics_snapshot_ref, known_bugs, development_cost_hours, infrastructure_cost_monthly_usd, revenue_monthly_usd, health_status, created_at, updated_at`) | **Schema exists, never populated.** Hisaab has no `app-manifest.json` file anywhere in `apps/household-help-wage-tracker/` — its status is instead tracked in a differently-shaped, hand-written `status.json` (see the next row). This is a direct, nameable inconsistency: a schema was designed in Phase 0 specifically for this purpose and Phase 1/the dashboard work built a parallel, incompatible structure instead without reconciling them. |
| — (no equivalent in this document) | `apps/household-help-wage-tracker/status.json` (fields: `appId, appName, lifecycle_state, stages{...}, build_status, test_status, security_status, blockers[], release_candidate_report, last_updated, note`) | This is the file the dashboard's "Building" page actually reads (`factory/dashboard/lib/store.js`'s `getAppStatus()`). It predates this document and duplicates some of what `app-manifest.schema.json` and this document's `Application`/`Build`/`TestRun`/`SecurityReview` resources are meant to cover, in one flatter, hand-maintained file instead of separate typed records. Not reconciled here — flagged as a real duplicate-shape problem per `03-PRINCIPLES.md` P-024 ("Avoid Duplicate Sources of Truth"), to be resolved in a future, explicitly-scoped pass, not silently merged now. |
| Build Record (§10) | Does not exist as a record type. | **Not implemented.** Hisaab was never successfully built (`factory/ANDROID_TOOLCHAIN.md`); the one build attempt's outcome is recorded as prose in `reports/household-help-wage-tracker-release-candidate.md`, not as a structured `Build` record with `build_id/commit/status/artifact/duration`. |
| Test Run (§11) | Does not exist as a record type. | **Not implemented.** The one real test execution that happened (`WageCalculatorTest` 8/8, `BackupManagerTest` 5/5, run via a standalone Kotlin compiler outside Gradle) is recorded as prose in `TEST_PLAN.md` and the release-candidate report, not as a structured `TestRun` record. |
| Security Review (§12) | Does not exist as a schema; `apps/household-help-wage-tracker/SECURITY_REVIEW.md` is a Markdown table with columns matching this document's field list closely (`Finding, Severity, Evidence, Impact, Remediation, Status` per `factory/ARCHITECTURE.md` §8) | **Conceptually present, not schema-backed.** The table's shape is a close match to this document's `SecurityReview` findings structure, but it is Markdown prose, not a JSON record a service could query (e.g., to block a release candidate programmatically on an unresolved `FAIL`). |
| Release Candidate (§13) | Does not exist as a schema; `reports/household-help-wage-tracker-release-candidate.md` covers the same information narratively | **Conceptually present, not schema-backed.** Notably, per `06-STATE-MACHINE.md`'s reconciliation, the state machine already lets an opportunity *reach* the `RELEASE_CANDIDATE` lifecycle state without this document's required references (`build` must exist and have succeeded, etc.) ever being checked — because no `ReleaseCandidate` record or validation exists to check them against. |
| Release (§14) | Does not exist. | **Not implemented.** No app has been published. |
| Distribution Campaign (§15) | Does not exist. | **Not implemented.** No distribution work has been attempted. |
| Metric Snapshot (§16) | Does not exist. | **Not implemented.** No app is live to measure. |
| Agent Run (§17) | Does not exist. | **Not implemented** — see `07-AGENT-ARCHITECTURE.md` reconciliation; there is no `run_id`-addressable record for any work this session has done. |
| Tool Execution (§18) | Does not exist. | **Not implemented** — see `09-TOOL-ARCHITECTURE.md` reconciliation. |
| Audit Event (§19) | `factory/dashboard/lib/auditLog.js` → `factory/state/audit-log.jsonl` | **Implemented, narrower schema.** Actual fields: `timestamp, actor, actorName, action, opportunityId, previousState, newState, reason?, note?`. Missing vs. this document: `event_id` (no UUID — order is file-position/timestamp only), `resource_type` (implicitly always "OPPORTUNITY" — apps don't get independent audit entries yet), `metadata` (no free-form object; only the fixed fields above). Functionally serves the same purpose for today's needs. |
| Provenance (§20) | Informally present only in the `evidence[].type` enum (`VERIFIED_FACT/INFERRED/ESTIMATE/OPINION`) | **Partially implemented**, narrower than this document's six-value provenance taxonomy (`HUMAN_INPUT, WEB_SOURCE, API_SOURCE, SYSTEM_CALCULATION, AGENT_GENERATED, AGENT_DERIVED`). The existing enum is about epistemic confidence (is this verified or assumed?), not about *who/what produced it* — a different, complementary axis this document conflates with confidence. Not reconciled — a real design question for later, not resolved here. |
| Schema versioning (§22) / `schema_version` field (§3) | Does not exist. | **Not implemented anywhere in factory-level schemas.** None of `opportunity.schema.json`, `research-record.schema.json`, or `app-manifest.schema.json` carries a `schema_version` field, and no opportunity/app record in this repository has one either. (Unrelated: the Hisaab *app's own* local backup format, `BackupManager.kt`, does have its own `SCHEMA_VERSION` constant — that's an app-level concern, not a factory-level one, and should not be confused with this gap.) |
| Data integrity / cross-references (§23) | No validator enforces any reference. | **Not implemented** — see `11-SCHEMAS.md`'s reconciliation for the broader point that no schema validation of any kind runs automatically today. |
| Data retention (§24) | No formal retention policy; nothing has been deleted so far. | **Consistent with this document by default (nothing has been deleted)**, but there is no explicit written retention policy, and no `KILLED` app exists yet to test whether "preserve historical records" would actually be honored in practice. |
| Future database migration (§25) | N/A | **Consistent** — the factory remains file-based per `factory/ARCHITECTURE.md` §5 and `04-ARCHITECTURE.md` §13, and no database has been introduced. |

### Summary

Three of this document's seventeen-plus resource types have a real, working JSON Schema (`Opportunity`, `ResearchRecord`, `Application`/`app-manifest`), and only one of those three (`Opportunity`) has ever actually been populated with a real record. Everything downstream of opportunity approval — spec, build, test, security review, release candidate, release, distribution, metrics, agent runs, tool executions — is either pure prose (readable, useful, but not machine-checkable) or doesn't exist yet, because that work hasn't been automated. The audit log is the one part of this document's model that is both specified here and genuinely implemented close to its intended shape. No schema was changed and no record was migrated as part of writing this document.
