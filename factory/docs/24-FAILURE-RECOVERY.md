Failure Recovery Architecture

1. Purpose

Autonomous systems will encounter failures.

The objective is not to eliminate every failure.

The objective is to ensure failures are:

- bounded;
- observable;
- recoverable where safe;
- auditable;
- unable to silently corrupt factory state.

2. Core Principle

«Recover automatically only when the recovery action is known to be safe.»

Otherwise:

STOP
→ PRESERVE EVIDENCE
→ ESCALATE

3. Failure Categories

The factory should classify failures.

Agent Failure

Examples:

- malformed output;
- hallucinated data;
- reasoning timeout;
- repeated invalid output.

Tool Failure

Examples:

- API failure;
- command failure;
- permission denial;
- timeout.

Build Failure

Examples:

- compilation error;
- dependency failure;
- environment failure.

External Service Failure

Examples:

- GitHub outage;
- package registry failure;
- Play Store failure;
- analytics outage.

Security Failure

Examples:

- secret exposure;
- policy violation;
- unauthorized tool request;
- suspicious generated code.

Data Failure

Examples:

- corrupt state;
- schema mismatch;
- duplicate record;
- inconsistent references.

Resource Failure

Examples:

- budget exhausted;
- memory exhausted;
- disk exhausted;
- execution timeout.

4. Failure Record

Every meaningful failure should record:

failure_id
workflow_id
application_id
stage
component
category
severity
timestamp
input_reference
error
evidence
retry_policy
recovery_action
final_status

5. Severity

Possible severity levels:

LOW
MEDIUM
HIGH
CRITICAL

Severity should be defined using impact and scope.

6. Retry Policy

Retries should only occur when:

1. the failure is retryable;
2. retry count remains within bounds;
3. budget remains available;
4. repeating the action is safe.

Example:

Transient network failure
        ↓
retry
        ↓
retry
        ↓
maximum attempts
        ↓
BLOCKED

7. Exponential Backoff

External service retries should normally use bounded backoff where appropriate.

Example:

attempt 1 → short delay
attempt 2 → longer delay
attempt 3 → longer delay
        ↓
stop

Exact values should be configured by service.

8. Idempotency

Recovery must account for actions that may have succeeded before a response was received.

Examples:

- publishing;
- creating an external resource;
- sending a message;
- charging money;
- creating a campaign.

Before repeating an external side effect, determine whether the original operation already succeeded.

9. State Recovery

Factory state should not be reconstructed from model memory.

Recovery must use authoritative state and audit records.

The state machine remains the source of truth for lifecycle state.

10. Crash Recovery

If the orchestrator stops unexpectedly:

1. reload persisted state;
2. inspect the last known workflow state;
3. inspect incomplete tool executions;
4. reconcile external operations where required;
5. determine whether retry is safe;
6. resume or block.

Never assume an incomplete operation failed simply because the local process stopped.

11. Agent Recovery

If an agent fails:

Agent failure
 ↓
capture output/error
 ↓
classify failure
 ↓
retry if safe
 ↓
otherwise replace/escalate

Changing the model provider does not grant additional authorization.

12. Model Fallback

Model fallback may be used for technical failures.

Examples:

- provider outage;
- timeout;
- unavailable model.

Fallback should not bypass:

- human approval;
- security requirements;
- budget limits;
- tool restrictions;
- quality gates.

13. Tool Recovery

A failed tool call should return structured failure information.

The agent should not receive a vague:

"Something went wrong."

Instead:

tool
operation
status
error_category
retryable
evidence

14. Data Corruption

If authoritative state appears corrupted:

STOP MUTATIONS
        ↓
PRESERVE CURRENT STATE
        ↓
VALIDATE BACKUPS / HISTORY
        ↓
RECONCILE
        ↓
RESUME ONLY AFTER VALIDATION

The factory should never overwrite potentially recoverable evidence during automatic repair.

15. Audit Log Failure

The audit system is security- and reliability-sensitive.

If a required audit event cannot be persisted, operations that require that audit record should normally stop.

The factory should not silently continue consequential operations without required audit evidence.

16. Human Escalation

Escalation should provide:

- what failed;
- where it failed;
- impact;
- attempted recovery;
- remaining options;
- relevant evidence;
- recommended next action.

The recommendation must remain distinguishable from the actual human decision.

17. Recovery Actions

Possible actions:

RETRY
RESUME
ROLLBACK
PAUSE
BLOCK
ESCALATE
KILL

Not every action is valid for every failure.

18. Automatic Recovery Boundaries

Generally safer:

- retry transient API call;
- restart isolated worker;
- rerun deterministic test;
- refresh temporary state.

Generally higher risk:

- publish;
- spend money;
- delete data;
- modify production systems;
- rotate security credentials;
- change application behavior.

Higher-risk actions should require stronger authorization.

19. Recovery Verification

Recovery itself must be verified.

Example:

Failure
 ↓
Recovery
 ↓
Verification
 ↓
PASS → continue
FAIL → stop/escalate

A recovery attempt is not evidence that recovery succeeded.

20. Failure Loops

The factory must detect repeated failure patterns.

Example:

build
 ↓
fix
 ↓
build
 ↓
fix
 ↓
build
 ↓
fix

If the maximum allowed iterations are exceeded:

STOP
→ preserve evidence
→ escalate

21. Incident Records

Significant failures should become incident records.

An incident may contain:

- timeline;
- affected applications;
- symptoms;
- root-cause hypothesis;
- evidence;
- actions;
- final resolution;
- preventive action.

Root cause should only be marked confirmed when supported by evidence.

22. Current Implementation

The current factory already has explicit state transitions and audit history.

Future recovery capabilities must build on those existing mechanisms rather than introducing a second state system.

The existing file-based architecture should remain functional until a deliberate migration occurs.

23. Non-Goals

This document does not require immediate:

- automatic rollback infrastructure;
- distributed fault tolerance;
- disaster-recovery clusters;
- production incident-management software.

The architecture should support these capabilities later without requiring a redesign of the lifecycle model.

---

## Reconciliation with current implementation (as of 2026-09-22)

**This project has exactly one real, well-documented failure to check this document against: the Android toolchain block.** It is, by coincidence, an unusually good test case — an External Service Failure (§3) that was handled almost entirely the way this document prescribes, without this document existing yet, and it is worth tracing through this document's own stages precisely rather than summarizing.

### The one real incident, traced through this document's model

| § | What this document asks for | What actually happened |
|---|---|---|
| §2 Core principle: recover automatically only when known safe; otherwise STOP → PRESERVE EVIDENCE → ESCALATE | **Followed exactly.** Two candidate "recoveries" were identified (an unofficial third-party SDK mirror baked into a Debian package's postinst script; routing around the org's egress policy) and both were explicitly rejected as unsafe, rather than attempted. The failure was then documented in full (`factory/ANDROID_TOOLCHAIN.md`) and escalated to the human via `AskUserQuestion` rather than silently worked around. |
| §3 Failure category | This is an **External Service Failure** (`dl.google.com` — the Android SDK/Maven repository host — unreachable), not a Build Failure in the narrower sense of "the source code is wrong." `factory/ANDROID_TOOLCHAIN.md` and the release-candidate report both draw this distinction correctly, independently of this document. |
| §4 Failure record fields | **Not captured as a structured record** — no `failure_id`/`severity`/`retry_policy` object exists. Every field this document wants is present *as prose* in `factory/ANDROID_TOOLCHAIN.md`: stage (dependency resolution), component (Gradle/AGP), category (environment/toolchain), evidence (exact proxy error text and AGP resolution failure quoted verbatim), recovery_action (none taken — escalated instead), final_status (still blocked, tracked as the CRITICAL blocker in the release-candidate report). |
| §5 Severity | Correctly treated as the top severity available: the release-candidate report's blocker table marks it **CRITICAL**, distinct from three separate MEDIUM/LOW items in the same table — a real, not arbitrary, severity distinction. |
| §6/§7 Bounded, appropriately-spaced retries | **Followed, informally.** `dl.google.com` reachability was re-checked three times across the project (initial discovery, after the user said they'd allowlist it, once more before finalizing the report) — not a tight retry loop, but spaced around actual state changes (a claimed policy change), which is closer to this document's "retry when there's reason to believe conditions changed" than blind exponential backoff would have been. It correctly stopped once told not to keep retrying an organization policy denial (an explicit non-retryable category, matching this document's §6 "invalid dependency"/"deterministic" examples in spirit, transplanted to a policy context). |
| §8 Idempotency before repeating a side effect | **Not applicable** — the failed operation (Gradle dependency resolution) has no partial-success ambiguity; it either resolves or it doesn't, so there was no "did this already succeed?" question to answer. |
| §9 State recovery from authoritative state/audit records, not model memory | **This is a genuine architectural strength already in place, not just a policy this project happened to follow once.** Because `factory/dashboard/lib/store.js` is the only writer of `opportunity.json`/`status.json`, and every write is synchronous and file-based, there is no in-memory "workflow state" this session could lose or misremember across a restart — re-reading the files *is* recovery. This was demonstrated directly earlier in this project: after this container was restarted mid-session (a background dashboard server process was lost), the factory's actual state (Hisaab's opportunity record, its `RELEASE_CANDIDATE` status, the audit log) was completely unaffected, because none of it lived in the interrupted process — only the ephemeral `npm run dashboard` server needed restarting, which is exactly this document's §10 "reload persisted state... resume" pattern, satisfied by construction rather than by a recovery procedure someone had to write. |
| §10 Crash recovery procedure | **Effectively already true for the reason above**, though no explicit "orchestrator" exists to crash — there is no long-running process holding authoritative state in memory to lose. The one actual crash-like event in this project (the container restart stopping the background dashboard server) required only restarting a stateless process; nothing needed reconciling. |
| §11 Agent recovery (classify → retry if safe → escalate) | **Followed informally** — this session (the de facto agent) classified the toolchain failure, determined retry was not currently safe/possible, and escalated via `AskUserQuestion` rather than attempting an unauthorized workaround. No model fallback occurred, so §12 is not applicable. |
| §12 Model fallback boundaries | **Not applicable — no model fallback has ever occurred in this project.** There is only one model/session throughout. |
| §13 Structured tool-failure information (not "something went wrong") | **Practiced well, informally.** When `gradle wrapper` failed, the actual error text was captured and quoted directly rather than paraphrased as a vague failure — see `factory/ANDROID_TOOLCHAIN.md`'s exact quote of the AGP plugin-resolution error. This is this section's spirit, achieved by this session choosing to preserve real output rather than by a tool contract requiring it. |
| §14 Data-corruption response (stop mutations, preserve, validate, reconcile) | **Not applicable — no data corruption has occurred in this project.** The file-based state has never been found inconsistent. |
| §15 Audit-log failure handling | **Not applicable — the audit log has never failed to persist an entry** (it's a synchronous local file append with no external dependency to fail). |
| §16 Human escalation content (what failed, impact, options, evidence, recommendation vs. decision) | **Followed closely.** The `AskUserQuestion` calls made during the toolchain investigation presented exactly this shape: what was blocked, why, what was already tried and rejected, and named options for the human to choose between — with the actual decision left to the human, not pre-selected. |
| §17 Recovery action vocabulary (RETRY/RESUME/ROLLBACK/PAUSE/BLOCK/ESCALATE/KILL) | **`BLOCK` and `ESCALATE` are the two actions actually used**, informally (not as a coded enum). `PAUSE`/`KILL` exist as real, working lifecycle actions in `stateMachine.js`, but were never applied to this failure, since the failure was at the toolchain level, not the opportunity/app lifecycle level. |
| §18 Automatic vs. high-risk recovery boundary | **Correctly respected** — nothing about this failure involved publishing, spending, or deleting data, so no high-risk recovery question ever arose; the two rejected "recoveries" (unofficial mirror, policy bypass) were rejected specifically because they would have crossed into unsafe territory, matching this section's own risk framing even though they aren't the financial/publishing examples this section lists. |
| §19 Recovery verification (an attempt is not evidence of success) | **N/A — no recovery was attempted, so none needed verifying.** The report states plainly that the blocker remains unresolved, not that a fix was tried and is presumed to have worked. |
| §20 Failure-loop detection with a hard stop | **The organization-policy-retry limit functioned as this document's failure-loop stop**, informally: after being told explicitly not to keep retrying a policy denial, this session did not re-attempt it beyond the one final pre-report check — a self-imposed bound, not a coded `max_iterations` counter. |
| §21 Incident record (timeline, symptoms, root-cause, evidence, resolution, preventive action) | **`factory/ANDROID_TOOLCHAIN.md` is, in substance, exactly this incident record** — it has a timeline (what was tried, in order), symptoms (the exact errors), a root-cause hypothesis stated with appropriate confidence ("dl.google.com... blocked by organization policy," confirmed via the proxy's own diagnostic endpoint, not guessed), evidence (quoted error text), and even preventive/next-step guidance ("What unblocking requires"). It exists as a Markdown file, not a structured `Incident` schema record, but its content genuinely satisfies this section's intent. |
| §22 Build on existing state transitions/audit history; no second state system | **Directly honored in this batch of documents overall** — no alert-state machine, incident-state machine, or failure-state machine was introduced anywhere in Batches 5–8; `factory/dashboard/lib/stateMachine.js` remains the only lifecycle state machine in the repository. |
| §23 Non-goals | Consistent — no rollback infrastructure, distributed fault tolerance, or incident-management software has been built or claimed. |

### Summary

This document is the best-matched reconciliation in the whole series so far, because the factory's one real failure was handled almost exactly the way this document prescribes — stop, preserve evidence, escalate, never fabricate success — before this document existed to prescribe it. What's missing is entirely structural: a `Failure` record type, a coded severity/retry-policy model, and a formal incident schema. The judgment was already sound; only the data model to make it machine-checkable and queryable across future failures is absent. No failure-recovery code, record type, or retry mechanism was implemented while writing this document.
