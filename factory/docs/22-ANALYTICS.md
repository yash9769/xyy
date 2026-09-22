Analytics Architecture

1. Purpose

Analytics provides evidence about what happens after an application is released.

The App Factory should use analytics to understand:

- acquisition;
- activation;
- engagement;
- retention;
- conversion;
- revenue where applicable;
- failures;
- product behavior.

Analytics must support decisions rather than become a collection of vanity metrics.

2. Core Principle

«Measure behavior, not assumptions.»

The factory must distinguish between:

OBSERVED
CALCULATED
ESTIMATED
INFERRED
UNKNOWN

An inferred explanation must never be presented as directly observed behavior.

3. Analytics Lifecycle

Target lifecycle:

EVENTS
  ↓
COLLECTION
  ↓
VALIDATION
  ↓
AGGREGATION
  ↓
METRICS
  ↓
SEGMENTATION
  ↓
ANALYSIS
  ↓
DECISION

4. Event Model

Applications should eventually emit structured events where appropriate.

Example:

event_name
application_id
anonymous_user_id
session_id
timestamp
properties
app_version
platform

Events should avoid collecting unnecessary personal information.

5. Event Naming

Event names should be:

- deterministic;
- documented;
- stable;
- meaningful.

Example:

app_opened
onboarding_started
onboarding_completed
record_created
feature_used
purchase_started
purchase_completed

Avoid ambiguous names such as:

event1
button_clicked
misc_action

unless their semantics are formally defined.

6. Privacy

Analytics collection must follow applicable privacy requirements and the application's privacy specification.

The factory should apply:

- data minimization;
- purpose limitation;
- appropriate consent mechanisms where required;
- retention policies;
- deletion mechanisms where applicable.

Sensitive information should not be collected merely because it is technically possible.

7. Core Product Metrics

Depending on the application, useful metrics may include:

Acquisition

- store visits;
- installs;
- acquisition source.

Activation

- onboarding completion;
- first meaningful action;
- time to first value.

Engagement

- sessions;
- active users;
- feature usage;
- task completion.

Retention

- day-N retention;
- returning users;
- repeat usage.

Monetization

- purchases;
- subscriptions;
- conversion;
- revenue;
- refunds.

Not every application requires every metric.

8. North-Star Metric

Each application may define a primary product outcome.

The metric should represent meaningful user value.

Example:

Household-help tracker:
successful attendance/wage record maintained

The exact metric must be application-specific.

The factory should avoid selecting a metric merely because it is easy to measure.

9. Metric Definitions

Every important metric should have a definition.

Example:

Metric:
Activation Rate

Definition:
percentage of new users completing the defined activation event

Numerator:
users completing activation

Denominator:
eligible new users

Time window:
defined by product specification

This prevents multiple systems from calculating the same metric differently.

10. Segmentation

Metrics may be segmented by:

- application version;
- platform;
- geography where legitimately collected;
- acquisition channel;
- cohort;
- feature;
- experiment variant.

Segmentation must respect privacy and minimum-data policies.

11. Cohort Analysis

The factory should support cohort-based analysis.

Example:

Users acquired in Week 1
        ↓
Activation
        ↓
Day 7 retention
        ↓
Day 30 retention

This helps distinguish growth from temporary spikes.

12. Funnel Analysis

Where relevant:

Reach
 ↓
Install
 ↓
Activation
 ↓
Core Action
 ↓
Retention
 ↓
Conversion

The factory should identify the largest measurable drop-offs.

13. Data Quality

Analytics should be validated for:

- missing events;
- duplicate events;
- timestamp problems;
- schema changes;
- unexpected volume;
- broken properties;
- version mismatches.

Bad analytics data must not automatically trigger product conclusions.

14. Analytics Anomalies

Examples:

expected:
1,000 events/day

observed:
12 events/day

Possible causes include:

- genuine behavior change;
- analytics outage;
- instrumentation bug;
- release regression;
- backend failure.

The factory should investigate before attributing the change to users.

15. Decision Evidence

Analytics may generate:

- observations;
- hypotheses;
- experiment proposals;
- iteration recommendations.

It must not automatically convert correlation into causation.

Example:

Observed:
activation fell after release 12.

Hypotheses:
- onboarding change;
- performance regression;
- acquisition mix changed;
- analytics instrumentation broke.

The factory should investigate competing explanations.

16. Analytics Storage

The initial implementation may use files or connected data sources.

Future implementations may use:

- databases;
- analytics platforms;
- warehouses.

Storage technology should remain separate from metric definitions.

17. Current Implementation

The current factory may not yet collect live application analytics.

The architecture should therefore distinguish:

ANALYTICS CAPABILITY PLANNED

from:

ANALYTICS DATA AVAILABLE

No synthetic production metrics should be inserted to make dashboards appear complete.

18. Non-Goals

This document does not require immediate:

- production analytics SDK integration;
- data warehouse;
- real-time analytics;
- advanced attribution;
- machine-learning prediction.

Those capabilities can be added incrementally.

---

## Reconciliation with current implementation (as of 2026-09-22)

**No application analytics exist, and — checked directly — none are faked.** Hisaab has never been installed by a real user, so there is no acquisition, activation, engagement, retention, or revenue data to report. This document's §17 distinction (`ANALYTICS CAPABILITY PLANNED` vs. `ANALYTICS DATA AVAILABLE`) maps cleanly: the factory is fully in the first state, for every application it has.

### The one directly relevant, deliberate decision already made: Hisaab has no analytics SDK at all

This is worth stating precisely, because it is not simply an unimplemented feature — it was a considered product decision, checkable against real source: `apps/household-help-wage-tracker/app/build.gradle.kts`'s dependency list has no analytics library of any kind, and `SECURITY_REVIEW.md`/`PRIVACY.md` state this explicitly ("no device identifiers, no analytics events, no crash reports are collected... this is the app's core, independently-verifiable differentiator"). So for Hisaab specifically, this document's entire event/metrics/segmentation model (§4–§12) is not just unimplemented — it would contradict the product's own stated privacy differentiation if added without a deliberate, separate decision to do so. **This is a real tension worth naming for future apps**: this document assumes analytics are broadly desirable once an app ships; Hisaab's own PRD/privacy stance explicitly rejects them as a matter of product identity. Future apps built on the same template will each need this decision made per-app, not inherited as a factory-wide default — the template itself (`templates/android/README.md`) already says as much ("No analytics/ads SDK — add only per-app, with a documented reason in that app's PRIVACY.md").

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §3 Analytics lifecycle (events → collection → validation → aggregation → metrics → segmentation → analysis → decision) | **Not started at any stage** — there are no events to collect. |
| §4/§5 Event model, event naming conventions | **Does not exist** — no event schema, no event catalog, for Hisaab or the factory itself. |
| §6 Privacy (minimization, purpose limitation, consent, retention) | **Exceeded, in the sense that the simplest possible answer was chosen: collect nothing.** No consent mechanism is needed because no data is collected — verified against the actual manifest (`SECURITY_REVIEW.md`), not just claimed. |
| §7/§8 Core metrics, north-star metric | **Never defined for Hisaab.** No acquisition/activation/engagement/retention/monetization metric has been named, even conceptually — the closest analogue is `apps/household-help-wage-tracker/MONETIZATION.md` explicitly deferring all such decisions to a future, evidence-based iteration. |
| §9 Formal metric definitions (numerator/denominator/time window) | **Does not exist.** |
| §10/§11/§12 Segmentation, cohort analysis, funnel analysis | **Not applicable — no data exists to segment, cohort, or funnel.** |
| §13/§14 Data quality checks, anomaly detection | **Not applicable — there is no data stream to validate or monitor for anomalies.** |
| §15 Hypothesis-driven interpretation, not correlation-as-causation | **Practiced once, informally, in a different but related context.** During opportunity research, this project explicitly labeled inferences as such rather than presenting them as fact — e.g., `reports/phase1-opportunity-selection.md`'s evidence entries are tagged `VERIFIED_FACT`/`INFERRED`/`ESTIMATE` per claim, which is the same epistemic discipline this section wants applied to analytics interpretation, just applied to competitive research instead. |
| §16 Storage independent of metric definitions | **Not applicable — no storage decision has been needed.** |
| §17 No synthetic production metrics in dashboards | **Verified true by inspection.** `factory/dashboard/public/app.js`'s `/analytics` route renders `renderStub('Analytics', 'Post-launch monitoring will appear here once an app is published and Phase 6 (monitoring pipeline) is implemented.')` — confirmed by reading the actual source, not assumed. No number on the dashboard anywhere claims to be a real installs/activation/retention figure. |
| §18 Non-goals | Consistent — no SDK integration, warehouse, real-time pipeline, or ML prediction has been attempted or claimed. |

### Summary

This is, like `19-DISTRIBUTION.md`, a stage that hasn't been reached — but with one genuinely interesting wrinkle the others didn't have: Hisaab's product identity is built around *not* collecting analytics, which means this document's default assumption (apps will eventually emit events) needs an explicit per-app exception process, not a blanket rollout, whenever this capability is actually built. No analytics code, event schema, or metric was implemented while writing this document.
