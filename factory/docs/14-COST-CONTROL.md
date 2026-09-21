# Cost Control and Resource Governance

## 1. Purpose

The App Factory is intended to run repeatedly.

Uncontrolled model calls, cloud compute, build infrastructure, APIs, advertising, and external services can make autonomous operation economically unsafe.

Cost must therefore be treated as a first-class factory resource.

This document defines the target cost-control architecture.

## 2. Core Principle

> The factory must never spend money merely because an agent decided to.

Agents may recommend spending.

Deterministic services enforce budgets.

Human approval is required for consequential paid activities where configured by policy.

## 3. Cost Categories

The factory should track costs across at least these categories:

| Category     | Examples                         |
| ------------ | -------------------------------- |
| Model        | LLM/API inference                |
| Compute      | Cloud GPU, CPU, containers       |
| Build        | CI/CD, Android builds            |
| Storage      | Object/file storage              |
| Network      | API/network transfer             |
| Data         | Research APIs, datasets          |
| Distribution | Ads, promotion                   |
| Services     | SaaS/API subscriptions           |
| Publishing   | Store/platform fees              |
| Monitoring   | Analytics/observability services |

## 4. Cost Attribution

Every billable operation should have enough metadata to attribute cost.

Conceptually:

```text
portfolio
  ↓
application
  ↓
workflow
  ↓
task
  ↓
agent run
  ↓
tool execution
```

A cost record should include where possible:

* application ID;
* workflow ID;
* task ID;
* agent ID;
* provider;
* model/service;
* quantity;
* estimated cost;
* actual cost;
* currency;
* timestamp;
* budget consumed.

## 5. Budget Hierarchy

Budgets should support multiple levels.

### Portfolio Budget

Maximum factory spending over a defined period.

### Application Budget

Maximum spending for one application.

### Workflow Budget

Maximum spending for a single workflow.

### Task Budget

Maximum spending for one task.

### External Spend Budget

Separate budget for activities such as advertising.

A lower-level budget must never override a higher-level budget.

## 6. Pre-Execution Cost Estimation

Before expensive operations, the factory should estimate:

```text
expected_cost
expected_duration
expected_resource_usage
```

Examples:

* research API calls;
* large model inference;
* cloud GPU execution;
* large builds;
* automated advertising campaigns.

If an operation cannot estimate its cost reliably, the system should apply a conservative policy rather than assuming negligible cost.

## 7. Hard Limits

Budgets should support hard limits.

Example:

```text
budget = ₹1,000
spent = ₹980
estimated_operation = ₹50

result:
BLOCK
```

The system must not silently exceed the budget.

## 8. Soft Limits

Soft thresholds can trigger warnings.

Example:

```text
50% → informational
75% → warning
90% → critical
100% → block
```

Thresholds should be configurable.

## 9. Model Routing and Cost

The model router should consider cost alongside capability.

A task should not automatically use the most expensive model.

Routing should consider:

* task complexity;
* required reasoning quality;
* structured-output requirements;
* context size;
* latency;
* reliability;
* current budget;
* provider availability.

A cheaper model is acceptable only when it meets the task's quality requirements.

## 10. Fallback Behavior

Provider fallback must not become uncontrolled spending.

Example:

```text
Primary model fails
        ↓
Fallback allowed?
        ↓
Budget available?
        ↓
Capability sufficient?
        ↓
Execute fallback
```

If any required condition fails, stop rather than repeatedly trying providers.

Technical failure does not grant authorization to spend more.

## 11. Retry Costs

Retries must be bounded.

Every retry policy should specify:

* maximum attempts;
* retryable failures;
* expected cost per retry;
* total retry budget.

Do not retry indefinitely because a model or external API returned an unexpected result.

## 12. Build and Compute Costs

Build pipelines should track:

* build duration;
* CPU usage where available;
* memory usage;
* cloud runner usage;
* artifact storage;
* repeated build attempts.

The factory should avoid rebuilding unchanged applications unnecessarily.

Possible optimization:

```text
source unchanged
+
dependencies unchanged
+
configuration unchanged
        ↓
reuse validated artifact
```

Caching must never bypass required validation.

## 13. Advertising Spend

Advertising is an external financial side effect.

The factory may:

* prepare campaign recommendations;
* estimate acquisition cost;
* create campaign drafts;
* analyze campaign performance.

Actual paid campaigns should require explicit authorization according to configured policy.

The system should track:

* approved budget;
* actual spend;
* impressions;
* clicks;
* installs;
* conversions;
* acquisition cost;
* campaign status.

## 14. Cost Anomalies

The factory should detect unusual spending.

Examples:

* model cost suddenly 5× normal;
* repeated failed builds;
* unexpected API-call volume;
* runaway retries;
* advertising spend exceeding expected rate.

An anomaly should trigger:

```text
pause
→ record evidence
→ notify operator
```

rather than silently continuing.

## 15. Cost Reporting

The dashboard should eventually expose:

* spending today;
* spending this period;
* spending by application;
* spending by workflow;
* model costs;
* infrastructure costs;
* distribution costs;
* remaining budgets;
* blocked operations;
* cost anomalies.

## 16. Cost Optimization

Optimization should prioritize:

1. eliminating unnecessary work;
2. caching deterministic results;
3. choosing appropriate models;
4. reducing retries;
5. batching compatible operations;
6. reusing build artifacts;
7. controlling expensive external services.

Cost optimization must not remove required quality or security gates.

## 17. Non-Goals

This document does not require immediate:

* billing-provider integration;
* cloud cost-management infrastructure;
* advertising automation;
* real-time financial accounting.

The current factory should first establish the architecture and data contracts required for future enforcement.

---

## Reconciliation with current implementation (as of 2026-09-21)

**No runtime cost tracking, budget enforcement, or spend attribution exists anywhere in the factory.** `COST_MODEL.md` (repository root) is the only cost-related document, and it is a different kind of artifact than what this document describes: a static, human-written estimate of *recurring infrastructure cost* (aiming for $0/month through Phase 4), reviewed manually "before Phase 5 kickoff" — not a live system that attributes cost to an application/workflow/task/agent-run/tool-execution hierarchy per §4, enforces hard/soft limits per §7–§8, or reports spend on a dashboard per §15.

### What `COST_MODEL.md` actually covers vs. this document

| This document | `COST_MODEL.md` |
|---|---|
| §3 ten cost categories (Model, Compute, Build, Storage, Network, Data, Distribution, Services, Publishing, Monitoring) | Covers a narrower set: compute (assumed free, "already provisioned"), CI minutes (free tier), security scanners (free/OSS), and — explicitly out of scope — "Claude Code usage itself... not counted here." **Model cost is explicitly excluded**, which is the opposite of this document's §3 treating Model as the first-listed category. |
| §4 cost attribution to portfolio → application → workflow → task → agent run → tool execution | Does not exist. `COST_MODEL.md` has no per-app, per-task, or per-run breakdown — it is one flat table for the whole factory. |
| §5 budget hierarchy (portfolio/application/workflow/task/external-spend) | Does not exist. There is no budget of any kind configured or enforced — `COST_MODEL.md` states a *target* ("$0/month recurring cost") but nothing checks actual spend against it. |
| §6/§7/§8 pre-execution cost estimation, hard limits, soft-limit thresholds | Does not exist. Nothing in this project has ever estimated a cost before doing work, and nothing could have blocked an operation for being too expensive, because no estimate or limit exists to check against. |
| §9/§10 cost-aware model routing, bounded fallback | **Not applicable — there is no model router** (see `08-MODEL-ROUTING.md`'s reconciliation). There is one model (this session), selected by the human, not routed by task/cost/quality policy. |
| §11 bounded retries | **Partially true, informally.** This project's one real bounded-effort pattern — "max 5-10 build-fix iterations," from the original Phase 1 instructions — was never actually exercised as a retry loop (the build never got far enough to iterate on failures; it failed immediately at the toolchain level). No code enforces this bound; it exists only as a documented policy in `apps/household-help-wage-tracker/TEST_PLAN.md`. |
| §12 build/compute cost tracking, artifact reuse to avoid rebuilds | Does not exist. No build ever succeeded to reuse (`factory/ANDROID_TOOLCHAIN.md`), so this has not been relevant yet, but there is also no caching/reuse mechanism built. |
| §13 advertising spend tracking | Not applicable — no app has published, so no distribution/advertising spend has occurred. `apps/household-help-wage-tracker/MONETIZATION.md` explicitly defers all monetization decisions to a future, evidence-based iteration, consistent with this document's spirit of not spending prematurely, but for product-monetization reasons, not cost-governance ones. |
| §14 cost anomaly detection | Does not exist — there is no cost stream to monitor for anomalies. |
| §15 dashboard cost reporting | **Not implemented.** The dashboard's home page (`factory/dashboard/public/app.js`) shows opportunity/app lifecycle counts only — no cost figures of any kind, estimated or actual. This is a direct, checkable gap: `04-ARCHITECTURE.md`'s own reconciliation table already flagged "no cost display" on the dashboard, and this document confirms why — there's no cost data anywhere for it to display. |
| §16 cost optimization priorities | Not evaluated — with $0 currently tracked, there is nothing yet to optimize. |
| §17 Non-goals | Consistent — this reconciliation doesn't claim billing-provider integration or real-time accounting were attempted, matching this document's own stated scope. |

### The one place a real cost decision was made, and how

`factory/config/scoring-weights.yaml` includes `infrastructure_cost` as a scored, weighted dimension (-0.5, since higher cost is penalized) in the opportunity-scoring rubric — this is the closest thing to a "cost consideration" in a decision that exists anywhere in the factory. It was never actually populated for Hisaab's opportunity record (the `score` object in `opportunity.schema.json` has never been filled in for any opportunity, per `10-DATA-MODELS.md`'s reconciliation), so even this one cost-adjacent mechanism has not been exercised in practice.

### What this means going forward

Cost governance is entirely greenfield, more so than most of the other target-architecture documents in this batch — even the "one thing that's real" pattern found in `11-SCHEMAS.md` (Hisaab's `BackupManager.kt` implementing schema-validation correctly at the app level) has no cost-tracking equivalent anywhere in this codebase. No budget, cost-attribution field, or spend limit was implemented while writing this document.
