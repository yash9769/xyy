Phase Implementation Plan
1. Purpose
This document converts the App Factory architecture into an implementation sequence.
It exists to prevent:

* uncontrolled scope expansion;
* agents implementing future phases prematurely;
* large rewrites;
* undocumented architecture changes;
* hallucinated capabilities;
* unfinished features being treated as production-ready.

2. Implementation Rule
Implement exactly one phase at a time.
An implementation agent must not begin a later phase unless the current phase's exit criteria have been satisfied.
3. Phase Contract
Every phase must contain:

```text
PHASE OBJECTIVE
CURRENT BASELINE
SCOPE
NON-SCOPE
DEPENDENCIES
FILES / MODULES
IMPLEMENTATION TASKS
TEST PLAN
SECURITY IMPACT
MIGRATION IMPACT
ACCEPTANCE CRITERIA
EXIT CRITERIA
ROLLBACK PLAN
```

4. Phase 0 — Documentation & Baseline
Objective
Freeze the architecture baseline before major implementation.
Work

* complete docs 00–30;
* verify repository state;
* verify existing tests;
* verify state machine;
* verify dashboard;
* verify audit log;
* document known environmental blockers.

Do Not

* implement new agents;
* replace the state machine;
* migrate storage;
* introduce autonomous workflows.

Exit Criteria

* architecture documents consistent;
* current implementation accurately documented;
* baseline tests pass;
* known limitations recorded.

Phase 1 — Agent Runtime
Objective
Create the minimum controlled agent execution framework.
Implement

* agent interface;
* AgentContext;
* AgentResult;
* agent registry;
* structured output validation;
* bounded execution;
* agent-run persistence;
* model-provider abstraction.

Do Not Implement

* autonomous app discovery;
* autonomous coding;
* Play Store publishing;
* autonomous advertising;
* full lifecycle automation.

Acceptance Criteria
An example agent can:

```text
receive structured task
        ↓
execute through runtime
        ↓
produce structured result
        ↓
validate result
        ↓
record AgentRun
```

Invalid output must be rejected.
Phase 2 — Model Router
Objective
Make model selection provider-independent.
Implement

* provider interface;
* model registry;
* capability registry;
* routing policy;
* budget checks;
* fallback policy;
* model-run telemetry.

Acceptance Criteria
The same agent can use different registered models without changing agent logic.
Model failure must not bypass authorization or quality controls.
Phase 3 — Tool Runtime
Objective
Create controlled access to external capabilities.
Implement

* tool interface;
* input validation;
* output validation;
* permissions;
* timeout;
* retry policy;
* side-effect classification;
* audit integration.

Acceptance Criteria
An agent can request a tool, but:

```text
invalid request → rejected
unauthorized request → rejected
timeout → bounded failure
successful side effect → audited
```

Phase 4 — Research Factory
Objective
Automate evidence-backed opportunity research.
Implement

* DiscoveryAgent;
* ResearchAgent;
* source collection;
* evidence records;
* research records;
* opportunity analysis;
* provenance.

Acceptance Criteria
The system produces a structured opportunity package containing:

* problem;
* target user;
* evidence;
* competitors/alternatives;
* risks;
* assumptions;
* distribution hypothesis.

Human approval remains mandatory.
Phase 5 — Product Factory
Objective
Convert an approved opportunity into an implementable specification.
Implement

* ProductAgent;
* UXAgent;
* ArchitectureAgent;
* ProductSpec;
* acceptance criteria;
* architecture decisions.

Acceptance Criteria
The resulting specification is:

* versioned;
* schema-valid;
* internally consistent;
* testable;
* reviewable by a human.

Phase 6 — Coding Factory
Objective
Implement applications in isolated workspaces.
Implement

* CodingAgent;
* task planner;
* workspace manager;
* Git integration;
* bounded coding loop;
* build integration.

Acceptance Criteria
The factory can:

```text
approved specification
        ↓
implementation plan
        ↓
code changes
        ↓
Git diff
        ↓
build/test
```

No unrestricted host access.
Phase 7 — Verification & Security
Objective
Make verification automatic and evidence-driven.
Implement

* TestAgent;
* test execution;
* static analysis;
* secret scanning;
* dependency scanning;
* Android security checks;
* SecurityAgent;
* quality gates.

Acceptance Criteria
A failed required gate prevents progression.
`BLOCKED` and `NOT_RUN` cannot become `PASS`.
Phase 8 — Release Factory
Objective
Create verified release candidates.
Implement

* ReleaseAgent;
* versioning;
* artifact validation;
* release metadata;
* signing boundary;
* release-candidate records.

Acceptance Criteria
A release candidate contains complete evidence and cannot publish without the required human approval.
Phase 9 — Distribution Factory
Objective
Create controlled acquisition workflows.
Implement

* ASOAgent;
* MarketingAgent;
* distribution plans;
* campaign records;
* content assets;
* budget enforcement.

Acceptance Criteria
The factory can prepare a complete launch package without automatically spending money unless explicitly authorized.
Phase 10 — Analytics & Monitoring
Objective
Collect real post-launch evidence.
Implement

* event model;
* analytics integration;
* metric definitions;
* monitoring;
* alerting;
* dashboards.

Acceptance Criteria
The factory can distinguish:

```text
observed data
from
inference
from
hypothesis
```

No synthetic production data.
Phase 11 — Autonomous Iteration
Objective
Close the product feedback loop.
Implement

* AnalyticsAgent;
* MonitoringAgent;
* IterationAgent;
* iteration proposals;
* regression detection;
* experiment tracking.

Target Loop

```text
MONITOR
 ↓
ANALYZE
 ↓
PROPOSE
 ↓
HUMAN APPROVAL
 ↓
IMPLEMENT
 ↓
VERIFY
 ↓
RELEASE
 ↓
MEASURE
```

Acceptance Criteria
The factory can identify a measured issue and produce a traceable improvement proposal.
Phase 12 — Reliability & Hardening
Objective
Prepare the factory for continuous operation.
Implement

* stronger sandboxing;
* failure recovery;
* concurrency control;
* backups;
* resource limits;
* operational alerts;
* provider failover;
* security hardening.

Acceptance Criteria
Expected failure scenarios are:

* bounded;
* observable;
* recoverable where safe;
* auditable.

5. Phase Dependency Graph
The intended dependency order is:

```text
Foundation
    ↓
Agent Runtime
    ↓
Model Router
    ↓
Tool Runtime
    ↓
Research
    ↓
Product
    ↓
Coding
    ↓
Verification/Security
    ↓
Release
    ↓
Distribution
    ↓
Analytics/Monitoring
    ↓
Autonomous Iteration
    ↓
Reliability Hardening
```

Do not skip foundational dependencies merely because a later feature appears useful.
6. Implementation Granularity
Each phase should be broken into small implementation slices.
Preferred:

```text
Slice 1
 ↓
test
 ↓
commit

Slice 2
 ↓
test
 ↓
commit

Slice 3
 ↓
test
 ↓
commit
```

Avoid implementing an entire phase in one giant change.
7. Agent Instructions
Every coding agent working on the factory must receive:

1. relevant architecture documents;
2. current repository state;
3. current implementation constraints;
4. exact phase;
5. exact task;
6. explicit non-goals;
7. acceptance criteria.

The agent must not infer permission to implement future phases.
8. Existing-Code Protection
Before modifying an existing subsystem:

1. inspect implementation;
2. inspect tests;
3. identify dependencies;
4. identify current behavior;
5. determine whether migration is actually required.

Never replace working code simply because a cleaner architecture is theoretically possible.
9. Documentation Synchronization
When implementation changes architecture:

```text
Implementation Change
        ↓
Documentation Review
        ↓
Update Architecture
        ↓
Tests
        ↓
Commit
```

Documentation must not describe functionality that does not exist.
10. Validation Requirements
Every implementation slice should run the smallest relevant validation first.
Examples:

```text
schema change
→ schema tests

state-machine change
→ transition tests

agent runtime
→ agent runtime tests

tool change
→ tool contract tests

build change
→ build validation
```

Then run broader regression tests before phase completion.
11. Security Requirements
Every phase must answer:

* Does this introduce new permissions?
* Does this execute code?
* Does this access secrets?
* Does this access the network?
* Does this create an external side effect?
* Can untrusted content influence execution?
* Can an agent bypass an existing gate?

If yes, document and test the security boundary.
12. Cost Requirements
Every phase involving models or external infrastructure must answer:

* expected cost;
* maximum cost;
* retry behavior;
* fallback behavior;
* budget enforcement.

No unlimited autonomous loops.
13. Completion Rule
A phase is not complete because:

* the code compiles;
* the agent says it is complete;
* the dashboard displays the feature;
* a happy-path demo works.

A phase is complete only when its defined:

* implementation;
* tests;
* security checks;
* documentation;
* acceptance criteria;
* failure behavior

have been verified.
14. Rollback Rule
Every phase must have a rollback strategy.
Prefer:

* small commits;
* isolated changes;
* migration scripts where required;
* feature flags;
* reversible configuration.

Avoid irreversible changes unless explicitly approved.
15. Model Independence
No phase may hard-code business logic around a specific LLM provider unless that dependency is explicitly justified.
Changing:

```text
Claude
→ Gemini
→ OpenAI
→ hosted open-weight model
```

should not require rewriting the factory architecture.
16. Final Implementation Philosophy
The implementation process should follow:

```text
SPECIFY
   ↓
IMPLEMENT
   ↓
TEST
   ↓
VERIFY
   ↓
DOCUMENT
   ↓
COMMIT
   ↓
NEXT SLICE
```

The factory itself should eventually apply the same discipline to the applications it creates.
17. Final Definition of Success
The App Factory is successful when it can repeatedly execute:

```text
Discover
  ↓
Research
  ↓
Validate
  ↓
Approve
  ↓
Specify
  ↓
Build
  ↓
Test
  ↓
Secure
  ↓
Release
  ↓
Distribute
  ↓
Measure
  ↓
Improve
  ↺
```

while maintaining:

* human control over consequential decisions;
* evidence-backed state transitions;
* bounded autonomous execution;
* reproducible artifacts;
* security isolation;
* cost controls;
* auditability;
* model independence.

---

## Reconciliation with current implementation (as of 2026-09-22)

This document's own Phase 0 is the one section that must be checked against the repository rather than taken as written, per this batch's explicit instruction ("ensure Phase 0 correctly represents the current implementation"). The check below reuses `29-ROADMAP.md`'s findings rather than re-deriving them, and adds what's specific to this document's stricter Phase 0 "Work" list and exit criteria.

### Phase 0 "Work" checklist vs. what's actually been done

| Work item | Status |
|---|---|
| Complete docs 00–30 | **Done as of this document** — 00, 01, 03–30 exist (31 files; 02 was never assigned in the series as given to this session). This is the last of the 30 planned documents. |
| Verify repository state | **Done, repeatedly, across all ten batches** — every reconciliation section in docs 04–29 was written after directly reading the relevant source file, not from memory (e.g., `stateMachine.js`'s transition table, `store.js`'s write ordering, `auditLog.js`'s exact functions, the dashboard's exact route table and stub text were all quoted or grepped fresh during their respective batches). |
| Verify existing tests | **Done.** `WageCalculatorTest` (8/8) and `BackupManagerTest` (5/5) were re-confirmed as the only tests in the repository; their pass status was not re-run during this documentation project (no code changed that would affect them) but their existence and prior real execution were verified against `apps/household-help-wage-tracker/app/src/test/`. |
| Verify state machine | **Done.** `06-STATE-MACHINE.md` traces every one of the 19 implemented states against this document's canonical 22-state proposal; `stateMachine.js`'s actor-gating was re-verified by quoting its actual rejection error message. |
| Verify dashboard | **Done.** Nearly every document in Batches 4–10 cites a specific, re-checked piece of `factory/dashboard/public/app.js` or `index.html` (stub text for Published/Analytics/Testing, the exact nav-link list, `renderReleaseCandidates`/`renderAgentActivity` function names). |
| Verify audit log | **Done.** `25-AUDIT-LOGGING.md` reproduces `auditLog.js`'s actual `append()`/`readAll()` source and maps every field `store.js` writes against the target event model, finding two concrete gaps (no audit trail for rejected transitions; state-write-before-audit-write ordering). |
| Document known environmental blockers | **Done, and pre-existing** — `factory/ANDROID_TOOLCHAIN.md` was written during Phase 1 (before this documentation series began) and is cited throughout Batches 6, 8, and 9 as this project's one real, well-documented incident. |

### Phase 0 "Do Not" list — checked for violations across all ten batches

- Implement new agents — **not violated.** No agent code was written in any of docs 04–29's reconciliation work.
- Replace the state machine — **not violated.** `stateMachine.js`'s 19 states remain exactly as they were before this documentation project began; `06-STATE-MACHINE.md` explicitly preserves them as authoritative over its own 22-state canonical proposal.
- Migrate storage — **not violated.** No file moved from the file-based model to any database.
- Introduce autonomous workflows — **not violated.** No orchestrator, scheduler, or automated multi-step workflow was built.

### Phase 0 exit criteria — the one criterion worth re-flagging here specifically

`29-ROADMAP.md`'s reconciliation already found that "existing tests pass" is true only for Hisaab's two application-level test files, and that **no automated test suite exists for the factory's own dashboard/state-machine code** (`stateMachine.js`, `store.js`, `auditLog.js`) — every verification of that code's correctness during this project was manual and ad hoc, not a runnable `npm test`. Since this document's own §13 ("Completion Rule") explicitly states a phase is not complete because "a happy-path demo works" or because manual verification was done once, **Phase 0's exit criteria should be read as not fully satisfied** until that automated test suite exists — this is the single most concrete, actionable next step this reconciliation surfaces, more specific than a general "add more tests" recommendation: it names exactly which three files have zero coverage today.

### Phase dependency graph (§5) vs. `factory/ROADMAP.md`'s existing phases — same collision noted in `29-ROADMAP.md`, not re-litigated

This document's Foundation → Agent Runtime → Model Router → Tool Runtime → ... sequence is a different, more granular decomposition than the pre-existing `factory/ROADMAP.md`'s Phase 0–7. Both exist in the repository now; reconciling them into one numbering is future work, flagged in `29-ROADMAP.md`'s reconciliation and not duplicated here.

### §2/§8 Implementation rule and existing-code protection — self-check for this entire 10-batch documentation project

This document's own rules (§2 "implement exactly one phase at a time"; §8 "never replace working code simply because a cleaner architecture is theoretically possible") describe exactly the discipline this documentation project was asked to follow across all ten batches — and did: at no point across docs 04–30 was any application or factory code modified, and every batch was committed and pushed separately rather than accumulated into one large, hard-to-review change. This is not a claim to verify against future work; it is a fact about the ten batches that already happened, checkable directly in git history (`git log` on this branch shows one commit per batch, each touching only the `factory/docs/` files for that batch).

### Summary

Every item in this document's Phase 0 "Work" list has genuinely been done, and every item in its "Do Not" list has genuinely been avoided, across all ten documentation batches. The one real, actionable gap this reconciliation adds beyond what `29-ROADMAP.md` already found: **before Phase 1 (Agent Runtime) begins, the factory's own `stateMachine.js`/`store.js`/`auditLog.js` should get the automated test suite this document's own Completion Rule (§13) implicitly requires** — manual verification during development was sufficient to build confidence during this project, but is not the same thing as the phase being complete by this document's own definition. No Phase 1 work was started, and no code was implemented, while writing this document.
