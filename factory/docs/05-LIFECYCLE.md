App Factory Lifecycle
App Factory — Application Lifecycle
1. Purpose
This document defines the conceptual lifecycle of an application opportunity from discovery through monitoring and iteration.
The state machine specification defines the exact implementation states and transitions.
This document defines the intended business workflow.
2. Lifecycle Overview

```
DISCOVER
   ↓
RESEARCH
   ↓
ANALYZE
   ↓
OPPORTUNITY
   ↓
[ HUMAN APPROVAL ]
   ↓
PRODUCT SPEC
   ↓
[ HUMAN APPROVAL ]
   ↓
BUILD
   ↓
TEST
   ↓
SECURITY REVIEW
   ↓
RELEASE CANDIDATE
   ↓
[ HUMAN APPROVAL ]
   ↓
PUBLISH
   ↓
DISTRIBUTE
   ↓
MONITOR
   ↓
ITERATE / PAUSE / KILL
```

3. Stage: DISCOVER
Purpose:
Identify potential application opportunities.
Inputs may include:

* user problems
* market trends
* search behavior
* competitor gaps
* community discussions
* existing product complaints
* internal ideas

Output:

```
OpportunityCandidate
```

Discovery should prioritize problems over arbitrary application concepts.
4. Stage: RESEARCH
Purpose:
Determine whether an opportunity has sufficient evidence to justify deeper analysis.
Research may include:

* target-user identification
* competitor research
* feature comparison
* pricing
* reviews
* market signals
* search demand
* user complaints
* distribution channels
* technical feasibility

Output:

```
ResearchRecord
```

Research claims must retain evidence where practical.
5. Stage: ANALYZE
Purpose:
Convert research into a structured opportunity analysis.
Analysis should consider:

```
Problem severity
Competition
Differentiation
Demand signals
Technical complexity
Monetization
Market size
Distribution difficulty
Security/privacy risks
Estimated build cost
Estimated operating cost
```

Output:

```
OpportunityAnalysis
```

The system should explicitly distinguish evidence from analysis.
6. Stage: OPPORTUNITY
Purpose:
Prepare a decision package for human review.
The package should contain:

* problem
* target user
* evidence
* competitors
* differentiation
* proposed solution
* distribution strategy
* risks
* estimated cost
* expected experiment scope
* uncertainty

The application must not enter product development until the required human approval is recorded.
7. HUMAN OPPORTUNITY APPROVAL
The human may:

```
APPROVE
REJECT
REQUEST MORE RESEARCH
```

Every decision requires:

* human actor
* timestamp
* opportunity ID
* decision
* optional reason
* audit event

An agent cannot perform this transition.
8. Stage: PRODUCT SPEC
After opportunity approval, the factory creates a product specification.
It should define:

* target users
* core problem
* value proposition
* MVP scope
* non-goals
* user flows
* screens
* data model
* architecture
* privacy requirements
* permissions
* analytics
* monetization where applicable
* acceptance criteria

9. PRODUCT SPEC APPROVAL
If the product policy requires approval, the human reviews:

* scope
* UX
* technical approach
* permissions
* privacy
* monetization
* analytics
* acceptance criteria

The factory must not silently expand scope after approval.
10. Stage: BUILD
The factory creates or modifies the application.
Typical operations:

```
create branch
 ↓
initialize template
 ↓
implement product specification
 ↓
compile
 ↓
run tests
 ↓
repair bounded failures
```

Every repair iteration should be recorded.
11. Stage: TEST
Testing should include applicable:

* unit tests
* integration tests
* UI tests
* build validation
* schema validation
* artifact validation
* regression tests

A test failure must prevent the application from being represented as successfully tested.
12. Stage: SECURITY REVIEW
Security review should include applicable:

```
secret scanning
dependency scanning
static analysis
manifest review
permission review
network configuration
exported component review
unsafe storage checks
authentication/authorization review
privacy checks
```

Security results must be stored as structured evidence.
13. Stage: RELEASE CANDIDATE
A release candidate means:

* build succeeded
* required tests passed
* required security checks passed
* release artifact exists
* metadata exists
* required documentation exists
* known blockers are recorded

It does not mean the application has been published.
14. HUMAN RELEASE APPROVAL
Before publication, the human reviews the release candidate.
Possible outcomes:

```
APPROVE
REJECT
REQUEST CHANGES
```

Only a valid human approval can authorize publication.
15. Stage: PUBLISH
Publishing may include:

* Play Store submission
* release track selection
* version management
* store listing
* screenshots
* privacy information
* content declarations

Publishing actions must be auditable.
16. Stage: DISTRIBUTE
Publishing does not equal distribution.
The distribution stage may include:
Organic

* ASO
* SEO
* landing page
* communities
* social content
* referral mechanisms

Paid

* Meta Ads
* Google Ads
* other appropriate advertising channels

Paid campaigns must have explicit budgets and approval requirements.
17. Stage: MONITOR
Monitor applicable:

```
installs
activation
retention
crashes
ratings
reviews
acquisition
conversion
revenue
CAC
CPI
ROAS
```

The system should distinguish raw measurements from AI interpretation.
18. Stage: ITERATE
The factory may identify:

* product problems
* UX problems
* performance problems
* retention problems
* acquisition problems
* monetization problems
* technical failures

The iteration agent should produce evidence-backed proposals.
Example:

```
Observed:
D7 retention declined.

Evidence:
Analytics dataset X.

Possible causes:
A
B
C

Recommended experiment:
Change onboarding flow.

Expected metric:
Activation rate.

Required approval:
HUMAN
```

The agent must not present an unverified causal explanation as fact.
19. Stage: PAUSE
An application may be paused when:

* continued spending is not justified
* infrastructure should be stopped
* distribution should be suspended
* more evidence is required

Pause must be reversible.
20. Stage: KILL
Killing an application is a consequential lifecycle decision.
It should:

* preserve historical records
* preserve audit events
* preserve research and metrics
* stop appropriate recurring workflows
* prevent accidental further spending
* preserve the ability to analyze why the application failed

Permanent termination requires the designated human approval.
21. Lifecycle Invariants
The following must remain true:

```
No approval → no consequential transition.

No successful build → no release candidate.

No required security validation → no release candidate.

No release approval → no publishing.

No publishing → no production distribution.

No evidence → no claim of success.

No bounded execution → no autonomous loop.
```

22. Portfolio-Level Lifecycle
The factory operates multiple applications simultaneously.
Each application must have independent:

* lifecycle state
* workspace
* audit history
* budgets
* metrics
* release history
* monitoring
* distribution configuration

One application's failure must not corrupt another application's lifecycle.

---

## Reconciliation with current implementation (as of 2026-09-21)

This document describes the intended *business workflow*. The concrete state names and transitions actually enforced in code live in `factory/dashboard/lib/stateMachine.js` and are specified in `factory/docs/06-STATE-MACHINE.md`. Where this document's conceptual stages don't line up one-to-one with an implemented state, that's noted here rather than silently assumed.

| Conceptual stage (this doc) | Nearest implemented state(s) | Notes |
|---|---|---|
| DISCOVER | `DISCOVERED` | Matches. Created today by `appfactory discover` / the dashboard's data layer — there is no automated discovery agent yet (§4 "inputs may include...market trends, search behavior" etc. are not collected automatically). |
| RESEARCH | `RESEARCHING` | Matches conceptually, but research today is a human-run WebSearch-and-transcribe process (see `reports/phase1-opportunity-selection.md` for how Hisaab's research was actually done), not an automated `ResearchRecord`-producing pipeline. |
| ANALYZE | *(no separate implemented state)* | The implementation has no `ANALYZING`/`OPPORTUNITY_READY` equivalent — `RESEARCH_COMPLETE` goes straight to `AWAITING_OPPORTUNITY_APPROVAL` via `SUBMIT_FOR_APPROVAL`. There is no distinct, structured `OpportunityAnalysis` artifact separate from the opportunity record itself; `schemas/opportunity.schema.json`'s `score` field is the closest equivalent and is not currently populated by any automated analysis step. |
| OPPORTUNITY (decision package) | `AWAITING_OPPORTUNITY_APPROVAL` | The dashboard's opportunity detail view (evidence, competitors, differentiation, risk fields) is this decision package in practice — implemented and working, per `apps/household-help-wage-tracker`'s own opportunity record and the dashboard screenshots taken during this project. |
| HUMAN OPPORTUNITY APPROVAL | `APPROVE_OPPORTUNITY` / `REJECT_OPPORTUNITY` / `NEED_MORE_RESEARCH` actions, actor-gated to `HUMAN` | Implemented and enforced in code (verified by test: an `AGENT`-actor attempt is rejected). |
| PRODUCT SPEC | `SPEC_GENERATING` | Implemented state exists, but in practice Hisaab's PRD/UX docs were written directly by the interactive session immediately after opportunity approval, without the dashboard-mediated `AWAITING_SPEC_APPROVAL` gate actually being exercised through a click — see `factory/state/audit-log.jsonl`'s `MIGRATE_TO_STATE_MACHINE` entry, which records this honestly. |
| PRODUCT SPEC APPROVAL | `AWAITING_SPEC_APPROVAL` → `APPROVE_SPEC`/`REJECT_SPEC` | State/actions exist in the state machine and are actor-gated, but as above, this gate was not actually clicked for Hisaab — its spec approval happened as an interactive chat approval before this system existed. |
| BUILD | `BUILDING` | Implemented as a state; the actual "build" work for Hisaab was manual (a human/agent writing Kotlin source), not an automated create-branch → generate → compile pipeline. No automated build-fix loop exists (§10's "repair bounded failures" is aspirational — see `factory/PHASE1_LEARNINGS.md`). |
| TEST | `TESTING` | State exists. Real testing that occurred: `WageCalculatorTest`/`BackupManagerTest` compiled and run standalone outside Gradle (13/13 pass) because the full Android toolchain is blocked in this environment (`factory/ANDROID_TOOLCHAIN.md`). No Compose UI tests, Room tests, or lint were run. |
| SECURITY REVIEW | `SECURITY_REVIEW` | State exists. Real review performed: `gitleaks` scan (real, clean) plus manual manifest/permission inspection — see `apps/household-help-wage-tracker/SECURITY_REVIEW.md`. No SAST/dependency-CVE scan was run (recorded as an open gap in that document). |
| RELEASE CANDIDATE | `RELEASE_CANDIDATE` | State exists and was reached — but per this document's own §13 definition ("build succeeded... release artifact exists"), Hisaab's release candidate **does not actually meet this bar**: no build ever succeeded, no AAB exists. `reports/household-help-wage-tracker-release-candidate.md` records this as a CRITICAL blocker rather than treating `RELEASE_CANDIDATE` as if it means "ready." |
| HUMAN RELEASE APPROVAL | `AWAITING_RELEASE_APPROVAL` → `APPROVE_RELEASE`/`REJECT_RELEASE` | Implemented in the state machine, but deliberately **not entered** for Hisaab — the agent did not call `SUBMIT_RELEASE_FOR_APPROVAL` because the release candidate is known not to meet the bar. This matches this document's own invariant in §21 ("No successful build → no release candidate") in spirit, even though the *state name* `RELEASE_CANDIDATE` was still used before the build-success precondition was actually met — a precondition gap worth closing in a later phase, not fixed silently here. |
| PUBLISH | `PUBLISHING`(doc) — implemented as `AWAITING_PRODUCTION_APPROVAL` → `APPROVE_PRODUCTION` → `PUBLISHED` directly, with an intermediate `INTERNAL_TEST` state this document doesn't name | Not reached for any app. The implementation's two-step `INTERNAL_TEST` → `AWAITING_PRODUCTION_APPROVAL` gate is more granular than this document's single `PUBLISH` stage (it reflects Play Console's internal/closed/production track distinction from the original Phase 0 `ARCHITECTURE.md` design). |
| DISTRIBUTE | *(no implemented state)* | Not implemented at all — no ASO/landing-page/ad automation exists, and the state machine has no `DISTRIBUTING` state. |
| MONITOR | `MONITORING` | State exists in the state machine; no monitoring pipeline exists to actually populate it (no app has published). |
| ITERATE | `ITERATION_PROPOSED` → `APPROVE_ITERATION` (loops back to `APPROVED`) | Implemented in the state machine only; this document's richer "Observed / Evidence / Possible causes / Recommended experiment" proposal structure is not implemented as a schema or generated artifact anywhere yet. |
| PAUSE | `PAUSED` | State + `PAUSE`/`RESUME` actions implemented, actor-gated to `HUMAN`. Not exercised on any real app yet. |
| KILL | `KILLED` | State + `KILL` action implemented, actor-gated to `HUMAN`, terminal (no outgoing transitions in `stateMachine.js`, matching this document's "no automatic process may revive a killed application"). Not exercised on any real app yet. |

### Summary
The human-approval-gated skeleton of this lifecycle is real and enforced in code for the opportunity-approval and spec-approval stages. Everything from BUILD onward was, for Hisaab, done manually by the interactive session rather than by an automated pipeline moving through these states with real preconditions checked — the state machine currently records *that a state was reached*, not that this document's precondition list for reaching it was independently verified by a service. Tightening that (e.g., `RELEASE_CANDIDATE` should be unreachable without a verified successful build) is future work, not done in this pass.
