App Factory Roadmap
1. Purpose
This roadmap defines the progression from the current working factory to a substantially autonomous application-production system.
The roadmap is intentionally incremental.
The factory must not attempt to implement the entire architecture simultaneously.
2. Current Baseline
The current repository already contains a functional foundation including:

* lifecycle/state-machine logic;
* human approval gates;
* service layer;
* CLI;
* dashboard;
* append-only audit log;
* file-based persistence;
* schemas;
* Hisaab vertical slice;
* basic validation;
* security checks;
* documentation foundation.

The existing implementation is the baseline.
3. Phase Strategy
The factory should evolve through these major phases:

```text
Phase 0 — Foundation
Phase 1 — Agent Runtime
Phase 2 — Model Router
Phase 3 — Tool Runtime
Phase 4 — Research Factory
Phase 5 — Product Factory
Phase 6 — Coding Factory
Phase 7 — Verification & Security
Phase 8 — Release Factory
Phase 9 — Distribution Factory
Phase 10 — Analytics & Monitoring
Phase 11 — Autonomous Iteration
Phase 12 — Reliability & Hardening
```

This numbering matches `30-PHASE-IMPLEMENTATION-PLAN.md`, which is the numbering the implementation has actually followed (Phases 1–5 as built). Phases 2 (Model Router) and 3 (Tool Runtime) are defined in that document; the sections below keep their original order.

4. Phase 0 — Foundation
Objective
Establish the factory's authoritative architecture.
Existing capabilities

* lifecycle;
* state machine;
* service layer;
* dashboard;
* audit;
* schemas;
* Hisaab vertical slice.

Exit Criteria

* state transitions validated;
* human gates enforced;
* audit records produced;
* existing tests pass;
* no duplicate lifecycle implementations.

5. Phase 1 — Agent Runtime
Objective
Introduce a controlled execution framework for agents.
Build:

* Agent interface;
* AgentResult;
* execution context;
* bounded execution;
* agent registry;
* structured outputs;
* agent run records.

Do not yet automate the complete app lifecycle.
Exit Criteria
At least one agent can execute through the formal runtime and produce validated structured output.
6. Phase 4 — Research Factory (after Phase 2 Model Router and Phase 3 Tool Runtime)
Objective
Automate opportunity discovery and research.
Build:

* discovery agent;
* research agent;
* evidence collection;
* source provenance;
* research records;
* opportunity analysis.

Human approval remains mandatory.
Exit Criteria
The factory can produce a research-backed opportunity package without automatically approving it.
7. Phase 5 — Product Factory
Objective
Convert approved opportunities into implementable product specifications.
Build:

* ProductAgent;
* UXAgent;
* architecture generation;
* ProductSpec schema;
* acceptance criteria;
* product risk analysis.

Exit Criteria
An approved opportunity produces a versioned product specification ready for implementation.
8. Phase 6 — Coding Factory
Objective
Automate controlled application implementation.
Build:

* coding agent;
* repository workspace;
* task decomposition;
* bounded coding loops;
* build integration;
* Git integration;
* code review workflow.

Exit Criteria
The factory can implement a bounded application change, build it, test it, and produce evidence without unrestricted host access.
9. Phase 7 — Verification & Security
Objective
Make verification a first-class automated pipeline.
Build:

* test runner;
* static analysis;
* dependency scanning;
* secret scanning;
* Android security checks;
* security agent;
* quality gates;
* bounded fix loops.

Exit Criteria
A release candidate cannot progress without required verification evidence.
10. Phase 8 — Release Factory
Objective
Automate release preparation while preserving human control over publication.
Build:

* release candidate generation;
* artifact validation;
* signing integration;
* store metadata;
* release preparation;
* publication service.

Exit Criteria
A human can review a complete release candidate and explicitly authorize publication.
11. Phase 9 — Distribution Factory
Objective
Automate controlled user acquisition workflows.
Build:

* ASO generation;
* marketing asset generation;
* distribution plans;
* campaign abstraction;
* content workflows;
* budget enforcement.

Exit Criteria
The factory can prepare measurable distribution experiments while respecting financial and platform controls.
12. Phase 10 — Analytics & Monitoring
Objective
Create the feedback loop after launch.
Build:

* event ingestion;
* metric definitions;
* dashboards;
* monitoring;
* anomaly detection;
* release health monitoring.

Exit Criteria
The factory can identify meaningful changes in application behavior using real evidence.
13. Phase 11 — Autonomous Iteration
Objective
Allow the factory to propose and execute bounded improvements.
Target loop:

```text
MONITOR
 ↓
ANALYZE
 ↓
HYPOTHESIS
 ↓
ITERATION PROPOSAL
 ↓
HUMAN APPROVAL
 ↓
IMPLEMENT
 ↓
TEST
 ↓
RELEASE
 ↓
MEASURE
```

The system must not optimize blindly.
14. Phase 12 — Reliability & Hardening
Objective
Make the factory reliable enough for continuous operation.
Build:

* stronger sandboxing;
* failure recovery;
* resource governance;
* observability;
* backup/recovery;
* concurrency controls;
* security hardening;
* provider failover;
* operational tooling.

15. Model Strategy
The factory should remain model-independent.
Possible model sources:

* proprietary APIs;
* hosted open-weight models;
* self-hosted models;
* local models.

The architecture must allow model providers to change without redesigning the factory.
16. Automation Strategy
Automation should increase gradually.
Recommended progression:

```text
Manual
 ↓
Tool-assisted
 ↓
Agent-assisted
 ↓
Bounded automation
 ↓
Supervised autonomy
 ↓
High-confidence autonomy
```

Do not jump directly from manual execution to unrestricted autonomy.
17. Human Control
Human approval should remain around consequential decisions even as other stages become autonomous.
Automation should reduce repetitive execution, not eliminate accountability.
18. Phase Discipline
Each phase must have:

* explicit scope;
* dependencies;
* acceptance criteria;
* tests;
* documentation;
* migration requirements;
* rollback strategy.

Do not begin the next phase merely because code for the current phase exists.
19. No Big-Bang Rewrite
The factory should evolve from the existing implementation.
Prefer:

```text
small change
 ↓
test
 ↓
validate
 ↓
commit
 ↓
next change
```

over:

```text
rewrite entire factory
```

20. Roadmap Changes
This roadmap is versioned architecture guidance.
Actual sequencing may change after implementation evidence.
When the roadmap changes:

* document why;
* preserve existing evidence;
* update dependencies;
* avoid silently changing previously approved architecture.

21. Definition of Done
A phase is complete only when:

1. implementation exists;
2. tests exist;
3. quality gates are satisfied;
4. documentation is updated;
5. existing functionality remains intact;
6. failure behavior is defined;
7. security implications are reviewed;
8. relevant auditability exists.

22. Final Target
The long-term target is:

```text
DISCOVER
   ↓
RESEARCH
   ↓
ANALYZE
   ↓
SELECT
   ↓
SPECIFY
   ↓
BUILD
   ↓
TEST
   ↓
SECURE
   ↓
RELEASE
   ↓
DISTRIBUTE
   ↓
MEASURE
   ↓
ITERATE
   ↺
```

with humans controlling the consequential approval gates.
The goal is not unrestricted autonomy.
The goal is a reliable, evidence-driven software production system.

---

## Reconciliation with current implementation (as of 2026-09-22)

This document asks explicitly (via the Batch 10 instructions) that its Phase 0 baseline claims be checked against the actual repository, not accepted at face value. Two of the twelve items in §2's "Current Baseline" list are overstated relative to what docs 04–27's reconciliations already established; the rest hold up.

### §2 Current Baseline, item by item

| Baseline item | Verdict | Basis |
|---|---|---|
| Lifecycle/state-machine logic | **Accurate.** `factory/dashboard/lib/stateMachine.js`, 19 states, actor-gated transitions, verified by test. |
| Human approval gates | **Accurate.** `AWAITING_*` exits require `HUMAN`, enforced in code and independently re-verified twice during this documentation project (`26-HUMAN-APPROVALS.md`). |
| Service layer | **Accurate**, with the scope caveat already recorded in `04-ARCHITECTURE.md`: it covers state transitions and file I/O only, not the broader budget/tool-invocation service layer this document's target architecture describes. |
| CLI | **Accurate.** `factory/cli/appfactory.py` + `factory/dashboard/lib/cli.js`, real commands (`discover`, `approve`, `reject`, `status`), thin-wrapping the same service layer as the dashboard (no duplicated logic, per `04-ARCHITECTURE.md`). |
| Dashboard | **Accurate.** Real, running, screenshotted during this project; several of its routes are explicit, honest stubs rather than fake functionality. |
| Append-only audit log | **Accurate**, with the two gaps `25-AUDIT-LOGGING.md` found (rejected transitions produce no entry; state-write precedes audit-write in `store.js`) — real and working for the happy path, not flawless. |
| File-based persistence | **Accurate.** `candidates/`, `approved/`, `rejected/`, `apps/`, all real, all in git history. |
| Schemas | **Accurate but narrower than it sounds** — three schemas exist (`opportunity`, `research-record`, `app-manifest`), and only one (`opportunity`) has ever been populated with a real record; `research-record.schema.json` has never been used despite existing since Phase 0, and `app-manifest.schema.json` was superseded in practice by an incompatible hand-written `status.json` (`10-DATA-MODELS.md`'s reconciliation). "Schemas" as a baseline item is true; it should not be read as "schema-validated data," which is not true (see next). |
| Hisaab vertical slice | **Accurate, with its own CRITICAL blocker preserved, not resolved** — Hisaab exists as complete source, 13/13 real unit tests, a real security review, and an honest release-candidate report stating no build was possible in this environment. It is a genuine vertical slice through the *documentation and process*, not through a working build artifact. |
| **Basic validation** | **Overstated.** `11-SCHEMAS.md`'s reconciliation found directly, by reading `factory/dashboard/lib/store.js`, that **no JSON Schema validator is installed or called anywhere in the pipeline** — `opportunity.json` is read and written via plain `JSON.parse`/`JSON.stringify` with no validation against its own schema. The one time schema validation was performed at all, it was a manual, one-off Python check during Hisaab's opportunity creation, run once and not kept. "Basic validation" should be understood as "informal, human-performed spot checks," not an implemented validation layer. |
| **Security checks** | **Accurate only for the one narrow thing that actually happened, not as a repeatable pipeline.** A real `gitleaks` scan was run once against the repository and Hisaab specifically (`SECURITY_REVIEW.md`), and a manual manifest review was performed once. There is no checked-in security-scanning script, no CI step, and no mechanism that would re-run these checks automatically on the next app — "security checks" happened, they are not yet a *capability* the factory has in a reusable sense. |
| Documentation foundation | **Accurate, and substantially expanded by this very project** — docs 00–27 (this document being the 29th of 30 planned) now exist; before this documentation effort began, only `factory/{ENVIRONMENT,ARCHITECTURE,ROADMAP}.md` and `CLAUDE.md` existed. |

### Phase 0 exit criteria (§4), checked against reality

| Exit criterion | Status |
|---|---|
| State transitions validated | **Met.** Both illegal-transition rejection and wrong-actor rejection were verified directly (via CLI bridge and HTTP API) during dashboard development. |
| Human gates enforced | **Met**, per the same verification. |
| Audit records produced | **Met for successful transitions; not met for rejected/blocked ones** — see `25-AUDIT-LOGGING.md`'s finding that failed transitions currently produce no audit trail at all. This exit criterion should be considered partially, not fully, satisfied. |
| Existing tests pass | **Met, narrowly.** `WageCalculatorTest` (8/8) and `BackupManagerTest` (5/5) pass — the only tests that exist in the entire repository, both belonging to Hisaab, not to the factory's own dashboard/state-machine code. **There is no test suite for `stateMachine.js`, `store.js`, or `auditLog.js` themselves** — every verification of the state machine's own correctness (illegal transitions rejected, actor gating enforced) was done manually, ad hoc, during development, and is not codified as a runnable `npm test`. This is a real, actionable gap against `03-PRINCIPLES.md` P-026 ("Tests Protect Architecture") that this roadmap's own Phase 0 exit criteria should be read as not yet fully met. |
| No duplicate lifecycle implementations | **Met.** Confirmed repeatedly across docs 04–27: every document in this series defers to `factory/dashboard/lib/stateMachine.js` as the sole lifecycle authority; none introduced a second one. |

### Phase strategy (§3) vs. `factory/ROADMAP.md`'s existing phase numbering — a naming collision worth flagging, not resolving here

This repository already has a `factory/ROADMAP.md` (written during Phase 0 of the original factory build, before this documentation series began) with its own Phase 0–7 numbering (Architecture, Working Local MVP, Automated Research, Automated App Generation, Automated QA/Security, Play Store Automation, Monitoring/Analytics, Multi-App Scaling). This document's §3 introduces a **different** Phase 0–10 numbering (Foundation, Agent Runtime, Research Factory, Product Factory, Coding Factory, Verification & Security, Release Factory, Distribution Factory, Analytics & Monitoring, Autonomous Iteration, Reliability & Hardening) that does not map one-to-one onto the original. For example, the original roadmap's "Phase 2 — Automated research" and this document's "Phase 2 — Research Factory" cover similar ground but sit at different points in each document's own sequence, and the original's "Phase 1 — Working local MVP" (Hisaab) corresponds to *part of* this document's "Phase 0 — Foundation," not a separate phase. **This is a real naming collision between two roadmap documents in the same repository, not resolved by this reconciliation** — per this batch's own instruction not to invent resolutions, both documents are left as-is, and a future pass should either retire `factory/ROADMAP.md` in favor of this document's numbering or explicitly cross-reference the two.

**Update (Phase 5):** the paragraph above describes this document's original Phase 0–10 list. That list also disagreed with `30-PHASE-IMPLEMENTATION-PLAN.md` (which inserts Model Router and Tool Runtime as Phases 2 and 3, making Research Factory Phase 4 and Product Factory Phase 5). §3 and the phase section headings have been renumbered to match `30-PHASE-IMPLEMENTATION-PLAN.md`, the numbering the implementation actually follows. The separate collision with the older `factory/ROADMAP.md` remains unresolved.

### §5–§14 (Phases 1–10) — not reconciled individually here

Each of these phases describes work that has not started (Agent Runtime, Model Router, Tool Runtime, Research/Product/Coding/Verification/Release/Distribution/Analytics Factories, Autonomous Iteration, Reliability & Hardening) — their individual gaps against reality are already documented exhaustively in docs 07 through 27's own reconciliation sections and are not repeated here.

### Summary

Ten of twelve Phase 0 baseline claims hold up; "basic validation" and "security checks" are real but narrower than the phrase implies — both happened once, by hand, and are not yet repeatable capabilities. One of five Phase 0 exit criteria ("existing tests pass") is met only for Hisaab's own two test files, not for the factory's own dashboard/state-machine code, which has no automated test suite despite being the most safety-critical part of the whole system. A naming collision between this document's phase numbering and the pre-existing `factory/ROADMAP.md` is flagged, not resolved. No roadmap phase was implemented while writing this document.
