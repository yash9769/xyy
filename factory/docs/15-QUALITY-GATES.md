# Quality Gates

## 1. Purpose

The App Factory must distinguish between:

* work that was attempted;
* work that appears plausible;
* work that was actually verified.

Quality gates provide that distinction.

A factory stage must not be considered successful merely because an agent produced an output.

## 2. Core Principle

> No evidence, no pass.

The factory must never infer a successful gate from:

* model confidence;
* agent claims;
* generated code;
* previous successful runs;
* absence of an error message;
* partial execution.

A gate passes only when its defined evidence exists and satisfies its criteria.

## 3. Gate Result Model

Every gate should resolve to one of:

```text
PASS
FAIL
BLOCKED
NOT_RUN
WAIVED
```

### PASS

Required checks completed successfully.

### FAIL

Required checks executed and one or more failed.

### BLOCKED

The check could not execute because of an environmental, authorization, dependency, or infrastructure problem.

### NOT_RUN

The check was intentionally not executed.

### WAIVED

A human explicitly accepted the documented exception.

`BLOCKED`, `NOT_RUN`, and `WAIVED` must never be silently treated as `PASS`.

## 4. Gate Evidence

Each gate should record:

* gate ID;
* gate version;
* application ID;
* workflow ID;
* timestamp;
* executor;
* inputs;
* checks performed;
* result;
* evidence references;
* failure details;
* waiver information where applicable.

## 5. Gate Categories

The target factory should support gates for:

1. opportunity validation;
2. product specification;
3. implementation;
4. build;
5. functional testing;
6. security;
7. release;
8. distribution;
9. monitoring;
10. iteration.

## 6. Opportunity Gate

Before an opportunity becomes buildable, verify:

* problem evidence exists;
* target user is defined;
* proposed solution is understandable;
* competitive/replacement context was researched;
* monetization hypothesis exists where relevant;
* distribution hypothesis exists;
* major risks are documented.

The factory must distinguish:

```text
FACT
CLAIM
HYPOTHESIS
UNKNOWN
```

Unknown information must not be presented as verified evidence.

## 7. Product Specification Gate

Verify that the specification contains at minimum:

* target user;
* problem;
* core workflow;
* functional requirements;
* non-functional requirements;
* supported platforms;
* data/storage requirements;
* privacy/security requirements;
* monetization assumptions where relevant;
* acceptance criteria;
* known limitations.

Ambiguous requirements should block autonomous implementation when they materially affect architecture or user safety.

## 8. Build Gate

A build gate should verify:

* source compilation;
* dependency resolution;
* required artifacts generated;
* expected artifact type;
* build exit status;
* reproducibility where applicable.

Example:

```text
Gradle failed because dependency download was blocked
        ↓
BUILD = BLOCKED
```

It must not be recorded as:

```text
BUILD = PASS
```

because the source code appears correct.

## 9. Test Gate

Verify required test categories.

Examples:

* unit tests;
* integration tests;
* UI tests;
* regression tests;
* edge-case tests;
* negative tests.

The required test set should be defined by the application specification.

A test suite passing does not prove that untested requirements work.

## 10. Security Gate

Security review should consider, where applicable:

* secrets;
* authentication;
* authorization;
* input validation;
* injection;
* insecure storage;
* network security;
* dependency vulnerabilities;
* exported Android components;
* permissions;
* logging;
* privacy;
* cryptographic usage;
* supply-chain risks.

Security checks should produce evidence.

A model statement such as:

```text
"The application appears secure."
```

is not security evidence.

## 11. Release Gate

Before a release candidate can be published, verify:

* required tests passed;
* security gate passed or was explicitly waived;
* version metadata is correct;
* release artifact exists;
* artifact integrity is recorded;
* signing requirements are satisfied;
* store metadata is complete;
* known blocking issues are resolved;
* required human approval exists.

## 12. Distribution Gate

Verify:

* app listing exists;
* screenshots/assets are available;
* description is complete;
* target audience is defined;
* distribution channels are configured;
* campaign budgets are authorized where applicable;
* tracking is available.

Distribution should be treated as part of product delivery rather than an optional postscript.

## 13. Human Approval Gate

Some gates require human approval.

Examples:

* opportunity selection;
* product specification;
* release;
* paid advertising;
* destructive operations;
* high-risk external actions.

Approval must identify:

* human actor;
* exact object approved;
* decision;
* timestamp;
* relevant evidence;
* optional reason.

An agent must never approve its own work.

## 14. Gate Dependencies

Gates should have explicit dependencies.

Example:

```text
BUILD
  ↓
TEST
  ↓
SECURITY
  ↓
RELEASE CANDIDATE
  ↓
HUMAN RELEASE APPROVAL
  ↓
PUBLISH
```

A downstream gate cannot compensate for a missing required upstream gate.

## 15. Gate Versioning

Gate definitions may evolve.

Every execution must record the gate version used.

This allows historical results to remain interpretable when the factory's quality standards change.

## 16. Quality Gate Failures

A failure should produce actionable information:

```text
gate
check
expected
actual
evidence
severity
recommended next action
```

The factory may propose remediation.

It must not silently convert failure into success.

## 17. Waivers

Waivers are exceptional.

A waiver must include:

* gate;
* failed requirement;
* reason;
* risk;
* approving human;
* timestamp;
* expiration if applicable.

A waiver should remain visible in the audit history.

## 18. No False Green

The dashboard must make uncertainty visible.

Bad:

```text
Release: Ready
```

when security testing was blocked.

Better:

```text
Release: BLOCKED

Security Gate: BLOCKED
Reason: required scanner unavailable
```

The factory must prefer an explicit incomplete state over a misleading successful state.

## 19. Quality Gate Philosophy

The factory's objective is not:

> produce the largest number of apps.

It is:

> produce verified artifacts whose quality claims can be traced to evidence.

Speed is valuable only when verification remains intact.

## 20. Non-Goals

This document does not require immediate implementation of every gate.

It defines the contract that future automated pipelines must satisfy.

Existing factory behavior must remain intact until a deliberate migration implements these gates.

---

## Reconciliation with current implementation (as of 2026-09-21)

**This document's result model (§3: `PASS`/`FAIL`/`BLOCKED`/`NOT_RUN`/`WAIVED`) does not exist as a data type anywhere in the factory, but its central discipline — §2's "no evidence, no pass" and §18's "no false green" — was, by coincidence, already the exact editorial standard this project's own release-candidate report was written to. This section makes the connection explicit rather than leaving it implicit.**

### The clearest available evidence: Hisaab's release-candidate report, re-read against this document

`reports/household-help-wage-tracker-release-candidate.md` was written *before* this document existed, but checking it against this document's own categories is instructive:

- Its **BUILD STATUS** section reads "NOT BUILT — CRITICAL BLOCKER" with the exact reasoning this document's §8 example describes almost verbatim: a dependency (the Android Gradle Plugin, AndroidX, etc.) could not be resolved because `dl.google.com` was blocked, so the correct classification is this document's `BLOCKED`, not `FAIL` and certainly not `PASS`. The report did not use the word "BLOCKED" as a formal enum value (none existed to use), but it drew exactly the distinction §3 requires: not-run-due-to-environment is different from actually-failing, and neither is success.
- Its **TEST STATUS** is "PARTIAL" — a category this document doesn't even name (§3's enum has no `PARTIAL`), because the true situation (some checks genuinely passed — 13/13 pure-logic unit tests, verified outside Gradle — while others were `BLOCKED` — Compose UI tests, Room tests, lint) doesn't collapse cleanly into any single one of `PASS`/`FAIL`/`BLOCKED`/`NOT_RUN`/`WAIVED` for one gate. This is a real, concrete design gap this document doesn't resolve: **a "Test Gate" needs to represent a mix of sub-results**, not one verdict, when only some of several required test categories could run.
- The report's **RELEASE BLOCKERS** table, with a `CRITICAL`/`MEDIUM`/`LOW` severity column and a named blocker per row, is structurally very close to this document's §16 "gate failure" shape (`gate, check, expected, actual, evidence, severity, recommended next action`) — again, arrived at independently, before this document existed, by the same "don't claim success without verification" instinct (also stated as a factory rule in the original Phase 1 brief and in `CLAUDE.md`).

**None of this was captured as a structured `GateResult` record**, though — it is all prose in a Markdown report. This document's actual, unmet requirement is turning that same honest judgment into a machine-checkable artifact a service could act on (e.g., to block a `SUBMIT_RELEASE_FOR_APPROVAL` transition automatically), not the judgment itself, which was already sound.

### The state-machine gap this document sharpens

`06-STATE-MACHINE.md`'s reconciliation already named this, and this document gives it a precise name: **the `RELEASE_CANDIDATE` lifecycle state has no `Build Gate`, `Test Gate`, or `Security Gate` precondition enforced before it can be entered.** Hisaab's opportunity record sits at `lifecycle_state: RELEASE_CANDIDATE` today (`approved/household-help-wage-tracker/opportunity.json`) despite its Build Gate being `BLOCKED` in this document's terms. That is not a false green in the *report* (the report is honest about it) — but it would be a **false green in the state machine** if anyone trusted the state name alone without reading the report, which is exactly the failure mode §18 warns against. This is the single most concrete, actionable finding to come out of writing this document.

### Gate-by-gate status

| Gate (§5) | Exists as a formal artifact? | What actually happened for Hisaab |
|---|---|---|
| Opportunity Gate (§6) | No formal `FACT/CLAIM/HYPOTHESIS/UNKNOWN` taxonomy exists — the closest equivalent is `evidence[].type`'s `VERIFIED_FACT/INFERRED/ESTIMATE/OPINION` enum in `opportunity.schema.json`, a different four-way split than this document's. | Real evidence was gathered and cited (`reports/phase1-opportunity-selection.md`); the opportunity was approved by the human via `AskUserQuestion`, recorded in the audit log. Substantively satisfied; not schema-checked against this document's specific field list. |
| Product Specification Gate (§7) | No schema/checklist enforces this document's 11-item minimum field list. | `PRD.md` covers target user, problem, MoSCoW-scoped features, privacy, monetization; no formal acceptance-criteria section exists as a distinct, checkable artifact. Mostly satisfied in substance, not in enforced structure. |
| Build Gate (§8) | No `Build` record type exists (`10-DATA-MODELS.md` reconciliation). | `BLOCKED`, correctly reported as such in prose, never as `PASS`. |
| Test Gate (§9) | No `TestRun` record type exists. | Genuinely mixed: two test modules `PASS` (13/13, run outside Gradle), the rest `BLOCKED`/`NOT_RUN`. Reported honestly; not represented as a single structured result. |
| Security Gate (§10) | No `SecurityReview` record type exists; `SECURITY_REVIEW.md` is the closest equivalent (a Markdown table, see `10-DATA-MODELS.md`/`12-SECURITY.md` reconciliations). | A real `gitleaks` scan (`PASS`, "no leaks found") and manual manifest review were performed and are evidence-backed, not model assertion. Dependency-CVE scanning was `NOT_RUN` (Trivy unavailable), stated as such. |
| Release Gate (§11) | Does not exist as an enforced check. | Correctly **not entered** — the agent never called `SUBMIT_RELEASE_FOR_APPROVAL` for Hisaab, because it knew the Build Gate had failed. This is the right behavior, achieved by the agent's own judgment rather than a gate the state machine would have enforced regardless. |
| Distribution Gate (§12) | Does not exist. | Not applicable — no app has published. `apps/household-help-wage-tracker/store/` has draft listing copy, explicitly marked as unverified against a real build. |
| Human Approval Gate (§13) | **This is the one gate that is genuinely, technically enforced** — `factory/dashboard/lib/stateMachine.js` rejects any non-`HUMAN` actor on an `AWAITING_*` exit. | Exercised for real: the opportunity approval for Hisaab is recorded in `factory/state/audit-log.jsonl` with `actor: HUMAN`. |
| Waivers (§17) | No waiver record type or mechanism exists. | Not applicable — nothing has been waived; known gaps are reported as open blockers, not waived exceptions. |

### What this means going forward

The judgment this document wants (evidence-backed, honestly-labeled results; no false green) has already been the operating standard in this project's actual reports — that discipline does not need to be newly instilled. What's missing is turning it into data the state machine can check automatically, most urgently at the `RELEASE_CANDIDATE` entry point identified above. No gate model, `GateResult` type, or state-machine precondition was implemented while writing this document.
