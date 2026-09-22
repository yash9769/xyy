Monitoring Architecture

1. Purpose

Monitoring allows the factory to detect important changes after an application is released.

The system should monitor both:

1. application health;
2. factory health.

2. Core Principle

«Monitoring detects signals. Investigation determines causes.»

A metric changing does not automatically establish why it changed.

3. Monitoring Domains

Application

- crashes;
- startup failures;
- ANRs;
- API failures;
- performance;
- error rates;
- important business events.

Distribution

- installs;
- conversion;
- campaign performance;
- store availability.

Product

- activation;
- retention;
- feature usage;
- conversion.

Factory

- failed workflows;
- agent failures;
- tool failures;
- build failures;
- budget consumption;
- queue backlog;
- repeated retries.

4. Health Signals

Each monitored application should have a defined set of health signals.

Example:

Crash Rate
API Error Rate
Activation Rate
Retention
Revenue

Not every application needs the same signals.

5. Thresholds

Monitoring rules should support:

- absolute thresholds;
- relative changes;
- baseline deviations;
- sustained conditions.

Example:

error rate > threshold
for defined duration
        ↓
ALERT

Avoid triggering alerts from isolated noisy events unless severity warrants it.

6. Alert Severity

Possible levels:

INFO
WARNING
HIGH
CRITICAL

Severity should be based on defined impact, not model judgment.

7. Alert Model

An alert should record:

alert_id
application_id
metric
observed_value
expected_value
threshold
severity
detected_at
evidence
status

8. Alert Lifecycle

DETECTED
 ↓
ACKNOWLEDGED
 ↓
INVESTIGATING
 ↓
RESOLVED

Possible additional state:

FALSE_POSITIVE

9. Correlation

Monitoring may correlate multiple signals.

Example:

Release 14
+
Crash rate increased
+
Startup failures increased

This is evidence for investigation.

It is not automatically proof that Release 14 caused the issue.

10. Release Monitoring

After a release, monitor relevant signals against the previous baseline.

Examples:

- crash rate;
- ANR rate;
- activation;
- retention;
- conversion.

A major regression should be surfaced quickly.

11. Automated Response

Some responses may eventually be automated.

Low-risk examples:

- create investigation task;
- pause a non-critical workflow;
- reduce polling frequency;
- notify operator.

High-risk responses should require stronger authorization.

Examples:

- spending money;
- publishing a new release;
- deleting production data;
- disabling a live application.

12. Monitoring Budget

Monitoring itself consumes resources.

The factory should avoid excessive polling.

Use:

- appropriate intervals;
- event-driven triggers where possible;
- exponential backoff;
- batching;
- bounded retries.

13. Monitoring Failures

The monitoring system itself can fail.

Therefore distinguish:

APPLICATION HEALTH UNKNOWN

from:

APPLICATION UNHEALTHY

If telemetry stops arriving, the factory must not assume the application is healthy.

14. Alert Fatigue

The system should minimize low-value alerts.

Possible controls:

- deduplication;
- grouping;
- cooldown periods;
- severity thresholds;
- repeated-failure aggregation.

15. Evidence Retention

Monitoring alerts should preserve enough evidence for later analysis.

Relevant evidence may include:

- metric snapshots;
- logs;
- release identifier;
- application version;
- timestamp;
- affected cohort;
- related events.

16. Current Implementation

The current factory has audit/activity visibility but does not yet provide complete production application monitoring.

Future monitoring must integrate with:

- analytics;
- release pipeline;
- failure recovery;
- iteration;
- dashboard.

No simulated health data should be shown as live monitoring.

17. Non-Goals

This document does not require immediate:

- 24/7 infrastructure;
- full observability stack;
- automatic rollback;
- predictive anomaly detection;
- mobile crash infrastructure.

These are later capabilities.

---

## Reconciliation with current implementation (as of 2026-09-22)

**The factory's real monitoring today is limited to two of this document's four domains (§3): Factory-level workflow visibility (via the audit log) exists; Application, Distribution, and Product monitoring do not, because no app is live to monitor.** This is exactly the split this document's own §16 anticipates ("has audit/activity visibility but does not yet provide complete production application monitoring") — worth confirming precisely rather than assuming.

### Monitoring domains (§3), checked one by one

- **Application** (crashes, ANRs, API failures, error rates): **Does not exist.** No app has ever run outside this development environment, so there is nothing to crash or error in production. |
- **Distribution** (installs, conversion, campaign performance): **Does not exist** — consistent with `19-DISTRIBUTION.md`'s reconciliation; no campaign has run. |
- **Product** (activation, retention, feature usage): **Does not exist** — consistent with `22-ANALYTICS.md`'s reconciliation; no events are collected, by Hisaab's own deliberate design. |
- **Factory** (failed workflows, agent failures, tool failures, build failures, budget consumption, queue backlog, repeated retries): **Partially real.** `factory/state/audit-log.jsonl` records every lifecycle *transition* (state machine level), which is a form of factory-workflow visibility — but it does not record agent failures, tool failures, or budget consumption, because no agent-run/tool-execution/budget record type exists yet (per `07-AGENT-ARCHITECTURE.md`, `09-TOOL-ARCHITECTURE.md`, `14-COST-CONTROL.md`'s reconciliations). The one real "build failure" this project had — the Android toolchain block — is recorded as a prose incident report (`factory/ANDROID_TOOLCHAIN.md`), not as a structured, monitorable failure event the dashboard could alert on.

### What the dashboard actually shows today, checked directly

`factory/dashboard/public/app.js`'s `renderActivity()` function reads `/api/activity` (backed by `auditLog.readAll()`) and renders every transition as a timestamped, actor-labeled feed entry — this is real, working "factory health" visibility in this document's §3 sense, just narrower than the full audit trail this document's §7/§15 envisions (no `alert_id`, `severity`, or `status` fields exist on any entry; every entry is a completed state transition, not a distinct "alert" object with its own lifecycle).

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §4 Defined health signals per application | **Does not exist for Hisaab or any app** — no crash rate, error rate, or retention signal has ever been defined, let alone measured. |
| §5/§6/§7/§8 Thresholds, severity levels, alert model, alert lifecycle | **Does not exist as a data type or mechanism anywhere.** No `Alert` record, no `DETECTED→ACKNOWLEDGED→INVESTIGATING→RESOLVED` state machine — and importantly, **this must not be confused with the real, existing opportunity/app lifecycle state machine** (`factory/dashboard/lib/stateMachine.js`), which this document's own instructions correctly forbid duplicating. No alert-specific state system was created; none should be, until this capability is actually built, and it should extend rather than parallel the existing one. |
| §9 Correlation without assumed causation | **Practiced once, informally, in the same way noted in `22-ANALYTICS.md`'s reconciliation** — evidence entries in this project's research are labeled by confidence rather than asserted as fact, the same discipline this section wants applied to production signal correlation. Not yet exercised on any actual monitoring signal, since none exist. |
| §10 Release-vs-baseline regression monitoring | **Not applicable — there has been exactly one "release" (a release candidate that never became a real build), and no baseline exists to compare against.** |
| §11 Automated response tiers (low-risk vs. high-risk) | **Not implemented**, but the underlying principle — high-risk actions need stronger authorization — is already true today for the one mechanism that does exist: `PAUSED`/`KILLED` transitions in `factory/dashboard/lib/stateMachine.js` are `HUMAN`-only, matching this section's "disabling a live application" example being high-risk, even though no app has reached `MONITORING` to actually be paused or killed yet. |
| §12 Monitoring resource budget (polling intervals, backoff, batching) | **Not applicable — there is no active polling of anything to budget.** |
| §13 "Health unknown" vs. "unhealthy" distinction | **Not implemented, but arguably already the correct default state for every app in the factory** — Hisaab's status is not silently assumed healthy; `apps/household-help-wage-tracker/status.json` explicitly records `build_status: NOT_BUILT` and lists CRITICAL/MEDIUM blockers rather than defaulting to an implied-healthy silence. This is the right posture, just for build/test/security status rather than live production health, since there's no production yet to have unknown health. |
| §14 Alert fatigue controls (dedup, grouping, cooldown) | **Not applicable — zero alerts have ever been generated, so there is no fatigue to manage.** |
| §15 Evidence retention for alerts | **Not applicable as a formal record**, though the general principle (preserve enough evidence to diagnose later) was followed for the one real incident this project had: `factory/ANDROID_TOOLCHAIN.md` quotes exact error text (the `dl.google.com:443 — connect_rejected` proxy message, the exact AGP plugin-resolution failure) rather than paraphrasing, which is exactly what this section asks evidence retention to preserve. |
| §16 Audit/activity visibility exists; full production monitoring does not; no simulated health data | **This document's own summary of the current state is accurate, and independently confirmed here**: `factory/dashboard/public/app.js`'s `/analytics` route (checked in `22-ANALYTICS.md`'s reconciliation) and the absence of any `/monitoring`-specific route with live data both confirm no simulated health data exists anywhere in the dashboard. |
| §17 Non-goals | Consistent — no 24/7 infra, observability stack, auto-rollback, or predictive anomaly detection has been built or claimed. |

### Summary

Factory-level workflow visibility (the audit log, the dashboard's Activity Log page) is real and is the one piece of this document already substantially true — but it tracks lifecycle *transitions*, not the alert/health-signal model this document specifies, and the two must not be merged into one system without deliberate design work, since they serve different purposes (a transition is a fact that happened; an alert is a judgment that something needs attention). Application/Distribution/Product monitoring are entirely unimplemented because nothing has been published. No alert model, health signal, or monitoring integration was implemented while writing this document.
