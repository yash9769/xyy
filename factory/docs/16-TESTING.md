Testing Architecture
1. Purpose
Testing is the verification layer between generated implementation and release.
The App Factory must never treat:

* successful code generation;
* successful compilation;
* agent confidence;
* or absence of obvious errors

as proof that an application works correctly.
Testing must produce explicit, inspectable evidence.
2. Testing Principle
Test requirements, not merely code.
Tests should trace back to:

```text
Product Requirement
        ↓
Acceptance Criterion
        ↓
Test Case
        ↓
Execution
        ↓
Evidence
        ↓
Gate Result
```

3. Test Levels
The factory should support multiple testing levels.
Level 1 — Static Validation
Examples:

* syntax validation;
* formatting;
* linting;
* type checking;
* manifest validation;
* configuration validation.

Level 2 — Unit Testing
Test isolated business logic.
Examples:

* wage calculations;
* validation functions;
* parsers;
* state transitions;
* utility functions.

Level 3 — Integration Testing
Verify interactions between components.
Examples:

* database access;
* repository/service interactions;
* API integration;
* file persistence;
* authentication flows.

Level 4 — UI Testing
Verify important user workflows.
Examples:

* onboarding;
* navigation;
* form submission;
* data creation;
* editing;
* deletion;
* error states.

Level 5 — End-to-End Testing
Verify complete user journeys across the application.
Example:

```text
Launch
 ↓
Create record
 ↓
Perform action
 ↓
Persist data
 ↓
Restart application
 ↓
Verify data
```

4. Test Strategy
Every application should have a test strategy derived from its product specification.
The strategy should identify:

* critical workflows;
* critical business logic;
* security-sensitive functionality;
* data integrity requirements;
* expected failure conditions;
* regression risks.

Not every application requires identical test coverage.
5. Positive and Negative Tests
The factory should test both successful and unsuccessful behavior.
Positive

```text
valid input → expected result
```

Negative

```text
invalid input → safe rejection
```

Examples:

* empty required fields;
* invalid values;
* duplicate records;
* malformed data;
* unauthorized actions;
* unexpected lifecycle transitions.

6. Edge Cases
Tests should explicitly cover boundary conditions.
Examples:

* zero;
* maximum supported values;
* empty collections;
* duplicate entries;
* missing data;
* very long input;
* offline state;
* interrupted operations;
* application restart.

7. Regression Testing
When a defect is fixed, the factory should create or update a regression test where practical.
Conceptually:

```text
Bug
 ↓
Reproduction
 ↓
Regression Test
 ↓
Fix
 ↓
Full Relevant Test Suite
```

A fix without regression coverage should be considered incomplete for repeatable defects.
8. Test Isolation
Tests should avoid modifying unrelated factory state.
Test environments should use:

* isolated application data;
* test-specific configuration;
* controlled fixtures;
* deterministic inputs where possible.

Production credentials must never be used for ordinary tests.
9. Determinism
Where possible, tests should be reproducible.
Record:

* source revision;
* dependency versions;
* test version;
* environment;
* configuration;
* input data.

Non-deterministic tests must be identified rather than silently ignored.
10. Test Result Model
Each test run should record:

```text
test_run_id
application_id
source_revision
test_suite
environment
started_at
completed_at
status
passed
failed
skipped
blocked
artifacts
failure_details
```

Possible overall statuses:

```text
PASS
FAIL
BLOCKED
NOT_RUN
```

11. Coverage
Coverage metrics may be useful but must not become the sole definition of quality.
High code coverage does not prove:

* correct product behavior;
* good UX;
* secure implementation;
* complete requirements.

Coverage should therefore be treated as evidence, not as the entire quality model.
12. Test Failures
When tests fail, the factory should preserve:

* failing test;
* expected result;
* actual result;
* stack trace where available;
* relevant logs;
* source revision;
* environment;
* artifact references.

An agent may propose a fix.
The factory must rerun the required verification after the fix.
13. Automated Repair Loop
Future autonomous coding may use a bounded loop:

```text
BUILD
 ↓
TEST
 ↓
FAIL
 ↓
DIAGNOSE
 ↓
PROPOSE FIX
 ↓
APPLY FIX
 ↓
REBUILD
 ↓
RETEST
```

The loop must have:

* maximum iterations;
* maximum time;
* maximum cost;
* allowed file scope;
* security restrictions.

It must terminate when limits are reached.
14. Test Environment Failures
Infrastructure failures must not be interpreted as application failures.
For example:

```text
Dependency server unavailable
        ↓
Test = BLOCKED
```

not:

```text
Test = PASS
```

and not necessarily:

```text
Application = FAIL
```

The distinction must remain visible.
15. Security Testing
Security testing is related to, but separate from, functional testing.
Depending on the application, testing may include:

* secret scanning;
* dependency vulnerability scanning;
* static analysis;
* manifest analysis;
* permission review;
* network-security checks;
* authentication/authorization testing;
* input validation testing.

Security results must feed the security gate.
16. Test Artifacts
Useful artifacts include:

* test reports;
* logs;
* screenshots;
* videos;
* coverage reports;
* static-analysis reports;
* APK/AAB references;
* crash traces.

Artifacts should be associated with the corresponding test run.
17. Test Selection
The factory should avoid unnecessary full-suite execution when safe.
Possible strategy:

```text
small change
 ↓
targeted tests
 ↓
broader regression tests
 ↓
full suite when required
```

The selection logic must remain deterministic and auditable.
18. Current Implementation
The existing factory may contain only a subset of this architecture.
Documentation must describe future capabilities as planned rather than pretending they already exist.
Existing validated tests must remain authoritative until the testing architecture is deliberately implemented.
19. Non-Goals
This document does not require immediate implementation of:

* device farms;
* cloud test infrastructure;
* complete UI automation;
* advanced fuzzing;
* production telemetry-based testing.

Those capabilities can be introduced incrementally.

---

## Reconciliation with current implementation (as of 2026-09-21)

Hisaab is the only application with any real testing history, and it is a genuinely useful — if narrow — case study against this document's five-level model, because it demonstrates both a real `PASS` and a real, correctly-labeled `BLOCKED`, never a false green.

### Test levels (§3), checked against what actually ran

| Level | Target | What happened for Hisaab |
|---|---|---|
| Level 1 — Static validation | Lint, type checking, manifest validation | **`BLOCKED`.** `./gradlew lint` requires the same Android Gradle Plugin/AndroidX toolchain that could not be resolved (`factory/ANDROID_TOOLCHAIN.md`); it was never run. Kotlin's own type checking *did* implicitly run, though, as a side effect of successfully compiling `WageCalculator.kt` and `BackupManager.kt` with a standalone `kotlinc` — that's real evidence the code is at least syntactically/type-correct for those two files, even though it's a narrower check than a full lint pass. |
| Level 2 — Unit testing | Isolated business logic (this document's own example: "wage calculations") | **`PASS`, genuinely verified.** `WageCalculatorTest` (8/8) and `BackupManagerTest` (5/5) were compiled and executed for real, outside Gradle, using a Kotlin compiler fetched from `github.com/JetBrains/kotlin` releases (not the blocked host) plus JUnit4/`org.json` from Maven Central. This is exactly this document's §2 trace: PRD's wage-calculation requirement → `WageCalculator`'s documented pro-ration rules → 8 explicit test cases (all-present, absences, half-days, daily-rate, zero-present, negative-net-payable, zero-working-days, negative-wage-amount) → real execution → `OK (8 tests)` in the transcript → installed as the app's permanent `src/test/` suite, not a throwaway script. |
| Level 3 — Integration testing | Database access, persistence | **`NOT_RUN`.** No Room DAO test exists or ran; `TEST_PLAN.md` explicitly lists this as "NOT YET RUN (needs Gradle/AndroidX)," not silently skipped. |
| Level 4 — UI testing | Onboarding, navigation, forms, error states | **`NOT_RUN`.** `ExampleComposeTest.kt` exists as a placeholder in the template and was never adapted/run for Hisaab's real screens — same Gradle/AndroidX blocker. |
| Level 5 — End-to-end testing | Full user journey incl. restart | **`NOT_RUN`.** Never attempted; would require an installed APK, which does not exist. |

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §4 Test strategy derived from product spec | **Partially true, informally.** `TEST_PLAN.md` does identify Hisaab's critical logic (wage calculation, backup fail-closed behavior) and maps tests to it — but this was written by this session reading the PRD and deciding what mattered, not by a formal, repeatable "test strategy generation" step. |
| §5/§6 Positive/negative tests, edge cases | **Done, and done well, for the two modules that could be tested.** `WageCalculatorTest` explicitly covers zero-present-days (not a crash/NaN), a negative wage amount (throws), and zero total working days (no divide-by-zero) — real edge cases, not just happy-path checks. `BackupManagerTest` explicitly covers invalid JSON, wrong schema version, and a missing required field, each asserted to fail closed via `InvalidBackupException`, not silently. |
| §7 Regression testing tied to bug fixes | **Not formally practiced.** Three real bugs were found and fixed during Hisaab's implementation (a `createdAt` overwrite on staff edit, a `null.toString()` bug in JSON parsing, a FileProvider authority mismatch between debug/release builds — see `factory/PHASE1_LEARNINGS.md`), but none of them got a dedicated regression test added afterward; they were caught by manual code re-reading, not by a test that would now catch a recurrence. |
| §8 Test isolation, no production credentials | **Consistent by default** — there are no production credentials in this project to accidentally use. |
| §9 Determinism, recorded environment | **Partially true.** The standalone-compiler verification recorded its inputs informally in this session's own transcript and in `TEST_PLAN.md`'s prose (Kotlin 2.0.21, JUnit 4.13.2, specific Maven Central artifact versions) but not as a structured, machine-readable `TestRun` record per `10-DATA-MODELS.md` §11. |
| §10 Structured `TestRun` record with `PASS/FAIL/BLOCKED/NOT_RUN` | **Does not exist as a data type anywhere.** This is the same gap `10-DATA-MODELS.md`/`15-QUALITY-GATES.md` already named: the *distinction* is honestly made in prose (`TEST_PLAN.md`, the release-candidate report), but never captured as this document's structured record with a machine-checkable `status` field. |
| §11 Coverage as evidence, not sole quality measure | **Consistent** — no coverage percentage has ever been computed or cited for Hisaab; nothing has over-relied on it because it was never generated. |
| §12 Preserving failure details | **Practiced informally.** When the Android toolchain failure occurred, the actual `curl`/`gradle` error output was captured and quoted directly in `factory/ANDROID_TOOLCHAIN.md` (e.g., the exact `dl.google.com:443 — connect_rejected` proxy message, the exact AGP plugin-resolution failure text) rather than paraphrased — that is genuinely this section's spirit, just not stored in a dedicated `TestRun.failure_details` field. |
| §13 Bounded automated repair loop | **Not implemented as code.** The "max 5–10 build-fix iterations" policy is written in `TEST_PLAN.md`/the original Phase 1 instructions but was never exercised as an actual loop — the build failed at the toolchain level before there was anything to iteratively repair. No `max_iterations`/`max_time`/`max_cost`/file-scope limit is enforced by any code. |
| §14 Infrastructure failure ≠ application failure | **This is exactly right in this project's existing reports, already.** `factory/ANDROID_TOOLCHAIN.md` and the release-candidate report are careful to say the *build* is `BLOCKED` by environment policy, not that Hisaab's *code* is broken — this document's central distinction was already being honored before this document existed. |
| §15 Security testing feeding the security gate | Covered in `SECURITY_REVIEW.md` (real `gitleaks` scan, manual manifest review) — see `12-SECURITY.md`/`15-QUALITY-GATES.md` reconciliations for the fuller picture; not duplicated here. |
| §16 Test artifacts (reports, logs, coverage, APK/AAB references) | **Partially true.** The two real test runs' console output (`OK (8 tests)`, `OK (5 tests)`) exists in this session's transcript and is summarized in `TEST_PLAN.md`, but no APK/AAB exists to reference (none was built), no coverage report was generated, and no screenshots/videos exist (no UI ever ran). |
| §17 Selective test execution (targeted → broad → full) | **Not applicable yet** — with only two test files and no CI, there has never been a "which tests should re-run" decision to make. |
| §18 Current implementation described honestly | **This document's own instruction was already this project's practice** — `TEST_PLAN.md` was updated mid-project specifically to change "Compose UI tests (Robolectric...)" from an implied-complete section header to one explicitly marked "NOT YET RUN," precisely to avoid the trap this section warns against. |
| §19 Non-goals | Consistent — no device farm, cloud test infra, or fuzzing has been attempted or claimed. |

### Summary

Testing in this project is a genuine, if small, success story for this document's core principle: the two modules that *could* be tested without the blocked toolchain were tested for real, with real positive and negative cases, and the result was reported as `13/13 pass` — not "should work" or "looks correct." Everything gated behind the Android toolchain (lint, Room, Compose UI, end-to-end) is honestly `BLOCKED`/`NOT_RUN`, never claimed as `PASS`. What's missing is entirely structural: no `TestRun` record type, no regression-test-on-fix discipline, and no bounded repair loop exist as enforced mechanisms — the good outcomes so far came from this session's care, not from factory infrastructure. No test code, record type, or repair loop was implemented while writing this document.
