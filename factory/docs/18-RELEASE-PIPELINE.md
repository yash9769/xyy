Release Pipeline
1. Purpose
The release pipeline converts a verified application build into a controlled release candidate and, after required approval, a published release.
Release is a high-consequence operation.
The factory must separate:

```text
BUILD
```

from:

```text
RELEASE
```

and:

```text
PUBLISH
```

2. Release Lifecycle
Target lifecycle:

```text
BUILD
 ↓
TEST
 ↓
SECURITY REVIEW
 ↓
RELEASE CANDIDATE
 ↓
HUMAN RELEASE APPROVAL
 ↓
SIGN
 ↓
PUBLISH
 ↓
VERIFY
```

3. Release Candidate
A release candidate should contain:

* application ID;
* version name;
* version code;
* source revision;
* build ID;
* artifact reference;
* artifact checksum;
* test results;
* security results;
* known issues;
* release notes;
* store metadata;
* approval status.

4. Release Readiness
A release candidate is not automatically publishable.
Required conditions should include:

* required build gate passed;
* required tests passed;
* security review passed or explicitly waived;
* artifact validated;
* metadata complete;
* no unresolved release blockers;
* required human approval exists.

5. Version Management
The factory must prevent accidental version conflicts.
Versioning should distinguish:

* human-readable version name;
* numeric version code;
* source revision;
* release identifier.

Version generation must be deterministic according to configured policy.
6. Signing
Signing is a sensitive operation.
Release signing credentials must:

* remain outside ordinary source workspaces;
* have restricted access;
* never be exposed to model prompts;
* be audited;
* be separated from development credentials.

Signing must not occur simply because a build succeeded.
7. Release Artifact Integrity
Before publication, verify:

* checksum;
* package/application ID;
* version;
* signing identity;
* artifact type;
* expected permissions/configuration;
* release metadata.

The artifact uploaded for publication must be the artifact that passed the required release checks.
8. Store Metadata
Release preparation should include:

* app title;
* short description;
* full description;
* screenshots;
* icon;
* feature graphics where applicable;
* category;
* content declarations;
* privacy information;
* support/contact information.

Missing mandatory metadata should block publication.
9. Human Approval
Publishing an application is a consequential external side effect.
The default architecture should therefore require explicit human approval before first publication and, where configured, before subsequent releases.
Approval should reference the exact release candidate.
Conceptually:

```text
Release Candidate #42
        ↓
Human reviews evidence
        ↓
APPROVE
        ↓
Publish
```

An agent cannot approve its own release.
10. Publishing
Publishing should be implemented as a dedicated tool/service rather than unrestricted browser automation.
The tool should:

* accept a validated release candidate;
* verify authorization;
* perform the external action;
* capture the external release identifier;
* record the result;
* return structured evidence.

11. Idempotency
Publishing operations must account for retries.
If the first request succeeded but the response was lost, blindly repeating the action can cause inconsistent state.
The release system should use:

* external release identifiers;
* idempotency keys where supported;
* pre-publication state checks.

12. Publication Verification
After publication, the factory should verify:

* external release status;
* version;
* availability;
* package/application identity;
* basic store visibility;
* relevant deployment warnings.

Publication success must be verified rather than inferred from a successful API request.
13. Rollback and Pause
The release system should support controlled responses to serious problems.
Depending on platform capabilities:

* halt further rollout;
* pause distribution;
* revert configuration;
* publish corrective release;
* disable affected automation.

The exact rollback mechanism is platform-specific.
14. Release Failure
Failures should be categorized.
Examples:

```text
AUTHORIZATION_FAILURE
VALIDATION_FAILURE
ARTIFACT_FAILURE
STORE_REJECTION
NETWORK_FAILURE
PLATFORM_FAILURE
POLICY_FAILURE
UNKNOWN
```

The system should preserve the external response and relevant evidence.
15. Release Security
The release pipeline must protect against:

* wrong application ID;
* wrong artifact;
* compromised signing credentials;
* unauthorized publishing;
* accidental production configuration;
* secret leakage;
* malicious generated code.

16. Release Gate
The release gate must explicitly evaluate:

```text
Build
Tests
Security
Artifact
Metadata
Approval
```

Any required failed or blocked condition prevents publication.
17. Current Implementation
The existing factory may only represent release states and evidence without implementing actual Play Store publication.
That is acceptable.
The documentation must distinguish:

```text
STATE REPRESENTATION
```

from:

```text
ACTUAL EXTERNAL PUBLISHING
```

No fake publication capability should be introduced merely to make the dashboard appear complete.
18. Non-Goals
This document does not require immediate implementation of:

* automated Play Store publishing;
* staged rollouts;
* multi-store publishing;
* automatic rollback;
* production deployment infrastructure.

Those capabilities belong to later implementation phases.

---

## Reconciliation with current implementation (as of 2026-09-21)

**The factory today has state representation for release, and nothing else** — exactly the distinction §17 asks documentation to preserve. No signing, publishing, or Play Store integration exists, has been attempted, or is faked anywhere (including the dashboard, which was checked specifically for this).

### What "release" means in the factory today

`factory/dashboard/lib/stateMachine.js` has `RELEASE_CANDIDATE`, `AWAITING_RELEASE_APPROVAL`, `INTERNAL_TEST`, `AWAITING_PRODUCTION_APPROVAL`, and `PUBLISHED` as named states with actor-gated transitions — this is real, working *state representation*. Nothing behind any of those states performs signing, uploads to Google Play, or verifies external publication. Hisaab's opportunity record sits at `lifecycle_state: RELEASE_CANDIDATE` today; no code path exists that could move it to `PUBLISHED` except a human/CLI call explicitly invoking the (implemented, real) state-machine transitions — there is no `playstore.publish`-equivalent tool for that call to trigger any external effect.

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §2 Full lifecycle through SIGN/PUBLISH/VERIFY | **Reached `RELEASE_CANDIDATE` only, and even that is contested** — per `06-STATE-MACHINE.md`/`15-QUALITY-GATES.md`'s reconciliations, Hisaab occupies the `RELEASE_CANDIDATE` state name without its Build Gate having actually passed. `SIGN`, `PUBLISH`, `VERIFY` have never been reached or attempted. |
| §3 Release candidate record (app ID, version, revision, build ID, artifact reference/checksum, test/security results, metadata, approval status) | **Exists only as prose, not as a structured record** — `reports/household-help-wage-tracker-release-candidate.md` covers every one of these fields narratively (package ID `com.appfactory.hisaab`, version `0.1.0`/`versionCode 1`, test/security summaries, known limitations) except `build ID` and `artifact checksum`, which don't exist because there is no artifact. No `ReleaseCandidate` schema exists (`10-DATA-MODELS.md` reconciliation). |
| §4 Release readiness conditions | **Explicitly and correctly NOT met, and reported as such.** The release-candidate report's own RELEASE BLOCKERS table lists the CRITICAL blocker (no build) plus three MEDIUM/LOW items, and its closing paragraph states plainly: "This release candidate is NOT ready to build a release, let alone publish." This is §4's intent, satisfied by report content even though no automated readiness check enforces it. |
| §5 Version management (name, code, revision, release ID) | **Partially implemented, unverified.** `app/build.gradle.kts` declares `versionCode = 1` and `versionName = "0.1.0"` — real, reviewed values — but since no build ever ran, these have never been embedded into an actual artifact or checked for conflict against a prior release (there is no prior release). No deterministic version-generation *policy* exists; the values were simply hand-set once. |
| §6 Signing (secured, audited, separated from dev credentials) | **Not applicable — no signing key exists in this project.** Hisaab has never been built, let alone signed. This is "not yet needed," not "implemented" or "violated." |
| §7 Release artifact integrity checks | **Not applicable — no artifact exists to check.** |
| §8 Store metadata completeness | **Drafted, explicitly marked incomplete/unverified.** `apps/household-help-wage-tracker/store/{listing.md, privacy-policy-draft.md, data-safety-draft.md}` cover title, short/full description, category, release notes, a screenshot *plan* (not actual screenshots — none can be captured without a running build), and a privacy policy draft explicitly marked "pending a real build to verify against." This is real, useful work, correctly labeled as draft rather than store-ready. |
| §9 Human approval referencing the exact release candidate, agent cannot self-approve | **The mechanism is real and enforced** (`AWAITING_RELEASE_APPROVAL` requires `actor === HUMAN`, verified by test) — but it has **never been exercised for Hisaab**, because the agent correctly never called `SUBMIT_RELEASE_FOR_APPROVAL` in the first place, knowing the build gate had failed. So this is "the gate would hold if reached, and the agent chose not to reach it" — a good outcome, achieved partly by the state machine and partly by the agent's own judgment not to ask for an approval it knew shouldn't be granted yet. |
| §10 Publishing as a dedicated tool | **Does not exist.** No `playstore.publish`-equivalent tool, service, or browser-automation script exists anywhere in this repository. |
| §11 Idempotent publishing | **Not applicable — nothing has ever been published, so no retry/idempotency scenario has occurred.** |
| §12 Publication verification (not inferred from a successful API call) | **Not applicable — no publication attempt has occurred to verify or fail to verify.** |
| §13 Rollback/pause | The state machine does have a real `PAUSED`/`KILLED` mechanism (`MONITORING → PAUSED`, `PAUSED → RESUME`, both `HUMAN`-gated) that could serve this purpose once an app is actually live — but it has never been exercised, since nothing has reached `MONITORING`. |
| §14 Release failure categorization | **Not applicable — no release attempt has been made to fail in a categorizable way.** The one real failure in this project (the build) is categorized in `17-BUILD-PIPELINE.md`'s reconciliation as `TOOLCHAIN_ERROR`/`ENVIRONMENT_ERROR`, not a release-stage failure. |
| §15 Release security (wrong artifact, compromised signing, unauthorized publish, etc.) | **Not applicable — none of these risks have been able to materialize, since there is no artifact, no signing key, and no publishing tool.** |
| §16 Release gate evaluating Build/Tests/Security/Artifact/Metadata/Approval together | **Does not exist as a single enforced check.** Each of these six inputs is individually documented (unevenly — Build is `BLOCKED`, Tests `PARTIAL`, Security `PASS` with noted gaps, Artifact `N/A`, Metadata `draft`, Approval `not requested`) in the release-candidate report, but nothing computes a single gate verdict from them automatically; a human reading the report has to synthesize that themselves (correctly, in this project's case — the report's own conclusion already does this synthesis in prose). |
| §17 Distinguishing state representation from actual publishing | **This is the one requirement most directly and deliberately honored.** Checked specifically for this reconciliation: `factory/dashboard/public/app.js`'s "Published" page renders `renderStub('Published', 'No app has been published yet. Production publishing always requires explicit human confirmation (Gate 4) and is not automated.')` — the dashboard does not pretend a publish capability exists. No mock/fake `playstore.publish` function exists anywhere in the codebase that could be mistaken for a real one. |
| §18 Non-goals | Consistent — no Play Store automation, staged rollout, multi-store, or auto-rollback capability has been built or claimed. |

### Summary

The release pipeline is the batch-6 document with the widest gap between "target" and "reality," simply because release is the furthest stage down the pipeline and nothing has reached it for real. The one thing worth being precise about, because it's easy to get backwards: **the state machine's `RELEASE_CANDIDATE`/`PUBLISHED` states are real, working code — what's missing is everything this document describes as happening *inside* those states** (signing, the publish tool, verification, rollback), which is currently zero, and the dashboard correctly says so rather than implying otherwise. No signing, publishing, or verification capability was implemented while writing this document.
