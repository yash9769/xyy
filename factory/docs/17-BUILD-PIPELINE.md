Build Pipeline
1. Purpose
The build pipeline converts an application source tree into a verifiable build artifact.
The pipeline must distinguish between:

* source generation;
* compilation;
* packaging;
* artifact verification.

A successful build does not automatically mean that an application is ready for release.
2. Build Lifecycle
The target pipeline is:

```text
SOURCE
  ↓
PRE-BUILD VALIDATION
  ↓
DEPENDENCY RESOLUTION
  ↓
COMPILE
  ↓
TEST
  ↓
PACKAGE
  ↓
ARTIFACT VALIDATION
  ↓
BUILD EVIDENCE
```

3. Build Inputs
A build should explicitly identify:

* application ID;
* source revision;
* build configuration;
* target platform;
* target architecture;
* dependency lock/version information;
* build tool versions;
* environment;
* required secrets or credentials.

4. Reproducibility
The factory should strive for reproducible builds.
Record at minimum:

* source commit;
* build configuration;
* build tool version;
* dependency versions;
* environment;
* timestamp;
* artifact checksum.

Perfect reproducibility may not always be possible, but differences must be observable.
5. Dependency Resolution
Dependencies should be:

* explicitly declared;
* version controlled;
* reviewed;
* scanned for known vulnerabilities;
* retrieved from approved sources where practical.

Unexpected dependency changes should trigger validation.
6. Build Isolation
Build execution should occur inside the execution boundaries defined by `13-SANDBOXING.md`.
The build process should not receive unrestricted access to:

* host filesystem;
* unrelated application workspaces;
* personal files;
* factory secrets;
* release credentials.

7. Build Configurations
The factory should distinguish configurations such as:

```text
DEBUG
TEST
RELEASE
```

Configuration differences must be explicit.
A debug build must never accidentally be treated as a release artifact.
8. Android Build Outputs
For Android applications, possible outputs include:

* APK;
* AAB;
* mapping/proguard artifacts;
* test reports;
* checksums.

The expected artifact type should be defined by the release specification.
9. Artifact Validation
After building, validate:

* artifact exists;
* expected file type;
* expected application ID;
* expected version;
* expected version code;
* package integrity;
* checksum;
* signing status where applicable.

A file merely existing at the expected path is insufficient.
10. Build Failures
Build failures must preserve:

* command/tool;
* exit code;
* source revision;
* environment;
* relevant logs;
* dependency errors;
* failure category.

Example categories:

```text
SOURCE_ERROR
DEPENDENCY_ERROR
ENVIRONMENT_ERROR
CONFIGURATION_ERROR
RESOURCE_ERROR
TOOLCHAIN_ERROR
UNKNOWN
```

11. Infrastructure Blocking
Infrastructure limitations must be represented separately.
Example:

```text
Android dependency repository unavailable
        ↓
BUILD = BLOCKED
```

The factory must not invent a successful build artifact.
12. Build Caching
Caching may reduce cost and execution time.
However:
Cached results must never bypass required validation.
A cached artifact should be reused only when its inputs are demonstrably equivalent.
13. Build Retry
Retries should be bounded.
Retry only when the failure is plausibly transient.
Examples:
Potentially Retryable

* temporary network failure;
* transient service outage;
* temporary resource exhaustion.

Usually Not Retryable

* syntax error;
* invalid dependency;
* deterministic compilation error;
* invalid configuration.

14. Build Provenance
Every release candidate artifact should be traceable to:

```text
Application
 ↓
Source revision
 ↓
Build configuration
 ↓
Build execution
 ↓
Artifact
 ↓
Checksum
```

15. Build Gate
The build gate should require:

* build completed;
* expected artifact generated;
* artifact validated;
* no unresolved blocking build errors.

A model-generated claim that the build "should work" is not build evidence.
16. Current Implementation
The current repository may not yet provide the complete build pipeline described here.
Where the current environment prevents a full Android build, the factory must record the limitation honestly.
For example:

```text
BUILD
Status: BLOCKED
Reason: required build dependency unavailable
```

This is preferable to fabricating an artifact or marking the build successful.
17. Non-Goals
This document does not require immediate:

* cloud build infrastructure;
* distributed build workers;
* advanced artifact caching;
* automatic Play Store upload.

Those are later capabilities.

---

## Reconciliation with current implementation (as of 2026-09-21)

**Hisaab's build attempt is, almost precisely, a live instance of this document's own §11/§16 example.** No abstraction was needed to make this section honest — the actual event matches the hypothetical nearly word-for-word.

### The build lifecycle (§2), stage by stage, against what actually happened

| Stage | Target | What actually happened |
|---|---|---|
| SOURCE | Application source tree exists | Real: `apps/household-help-wage-tracker/app/src/main/java/com/appfactory/hisaab/` — complete Kotlin source for all MVP screens, Room entities, DAO, ViewModels. |
| PRE-BUILD VALIDATION | Manifest/config validation before attempting compilation | **Not performed as a distinct step.** The manifest was read and reviewed manually as part of the security review (`SECURITY_REVIEW.md`), not validated by a pre-build tool. |
| DEPENDENCY RESOLUTION | Resolve AGP/AndroidX/Compose/Room from configured repositories | **This is exactly where it failed.** Running `gradle wrapper` against the template reproduced the failure directly: `Plugin [id: 'com.android.application', version: '8.5.2', apply: false] was not found` — because Gradle's `google()` repository shorthand resolves through `dl.google.com`, which this environment's egress policy blocks (confirmed via the proxy's own diagnostic endpoint, not inferred). |
| COMPILE | Compile Kotlin/Java sources | **Never reached for the full app** — dependency resolution failed first. **Partially reached for two files**: `WageCalculator.kt` and `BackupManager.kt` were compiled successfully, standalone, with a Kotlin compiler fetched from GitHub releases (not the blocked host) plus JUnit4/`org.json` from Maven Central — real evidence those two files are at least syntactically and type-correct, but this is not the app compiling, only two of its ~20 source files in isolation. |
| TEST | Run the test suite against the build | 13/13 tests passed for the two standalone-compiled modules (see `16-TESTING.md`'s reconciliation); the rest `NOT_RUN`. |
| PACKAGE | Produce APK/AAB | **Never reached. No packaging was attempted or possible**, since compilation of the full app never happened. |
| ARTIFACT VALIDATION | Verify the artifact exists, has the right type/ID/version/checksum | **Not applicable — there is no artifact to validate.** |
| BUILD EVIDENCE | Structured record of what happened | `factory/ANDROID_TOOLCHAIN.md` and `reports/household-help-wage-tracker-release-candidate.md` are the evidence, in prose, not as a structured `Build` record (see `10-DATA-MODELS.md` reconciliation — no `Build` schema exists). |

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §3 Explicit build inputs (app ID, revision, config, platform, tool versions) | **Recorded informally, not as a structured input manifest.** `templates/android/README.md` and `apps/household-help-wage-tracker/gradle/libs.versions.toml` pin exact versions (AGP 8.5.2, Kotlin 2.0.21, Compose BOM 2024.10.00, etc.) — this is real, checked-in version-pinning, just not wrapped in a formal "build input" record. |
| §4 Reproducibility (commit, config, tool version, checksum) | **Partially true.** Source commit and tool/dependency versions are all knowable from git history and `libs.versions.toml`, but there is no artifact checksum (no artifact exists) and no automated capture of "this exact combination was tried and failed" beyond this session's own documentation. |
| §5 Dependency review/scanning | **Declared and version-controlled (real), not scanned.** `SECURITY_REVIEW.md` records "no live CVE database check was performed against them (Trivy unavailable in this environment)" as an open MEDIUM finding — stated honestly, not glossed over. |
| §6 Build isolation per `13-SANDBOXING.md` | **Not implemented** — the one build attempt ran directly in this session's own unsandboxed container, per `13-SANDBOXING.md`'s own reconciliation. |
| §7 Explicit DEBUG/TEST/RELEASE configuration distinction | **Implemented correctly in source, unverified by an actual build.** `app/build.gradle.kts` does define separate `release` (minified, ProGuard) and `debug` (`.debug` applicationId suffix) build types — this is real, reviewed configuration — but since no build ever ran, it has never been *exercised*, only read. |
| §8 Android build outputs (APK/AAB/mapping/checksums) | **None exist.** Zero artifacts of any kind were produced. |
| §9 Artifact validation | **Not applicable — nothing to validate.** |
| §10 Build failure categorization | **The actual failure maps cleanly to this document's own taxonomy: `TOOLCHAIN_ERROR` (or arguably `ENVIRONMENT_ERROR`)** — not `SOURCE_ERROR`. This distinction was already made correctly in `factory/ANDROID_TOOLCHAIN.md`, which is explicit that the source/template was never shown to be wrong, only unbuildable in this environment. No structured `failure_category` field exists to record this, though — it's stated in prose. |
| §11 Infrastructure blocking represented separately from failure | **This is the best-matched section in the whole document.** `factory/ANDROID_TOOLCHAIN.md`'s own heading is literally "Android toolchain — Phase 1 status: BLOCKED (network policy)," and the release-candidate report's BUILD STATUS field reads "NOT BUILT — CRITICAL BLOCKER" with an explicit statement: "This is not a claim of a failed build — no build was possible." That sentence is this document's §11 principle, arrived at independently before this document existed. |
| §12 Caching without bypassing validation | **Not applicable** — no successful build has ever occurred to cache. |
| §13 Bounded, cause-appropriate retries | **The one real retry decision was made correctly, if informally.** `dl.google.com` reachability was re-checked three separate times across the project (once during initial toolchain setup, once after the user said they'd allowlist it, once more before finalizing the release-candidate report) — each a plausible-transient-failure retry — and then explicitly stopped per the instruction not to keep retrying an organization policy denial. No `max_retries` config enforces this; it was the human/session's own judgment. |
| §14 Build provenance chain (app → revision → config → execution → artifact → checksum) | **Broken at "artifact"** — everything up to and including "build execution" is traceable via git history and this session's own transcript, but the chain has no artifact or checksum to terminate on. |
| §15 Build gate (no model claim of "should work" counted as evidence) | **Honored.** No claim was ever made that Hisaab's build "should work" or "looks correct" as a substitute for actually running it — the release-candidate report's CRITICAL blocker framing is the opposite of that. |
| §16 Honest current-implementation framing | **This document's own example text is, almost verbatim, what `factory/ANDROID_TOOLCHAIN.md` and the release-candidate report already say.** No new honesty was required to satisfy this section — the existing reports already meet its bar. |
| §17 Non-goals | Consistent — no cloud build infrastructure, distributed workers, caching, or Play Store upload automation has been attempted or claimed. |

### Summary

This document describes a pipeline that essentially did not get to run for Hisaab — it failed at the second stage (dependency resolution) for reasons entirely outside the source code's control. The one thing worth preserving from this reconciliation: **this project's existing incident report already satisfies this document's central honesty requirement without needing to be rewritten** — `factory/ANDROID_TOOLCHAIN.md` and the release-candidate report were written under the same "BLOCKED is not FAIL is not PASS" discipline this document formalizes, before this document existed. What's missing is the structured `Build` record type and any build-isolation/sandboxing infrastructure to eventually retry this against — neither was implemented while writing this document.
