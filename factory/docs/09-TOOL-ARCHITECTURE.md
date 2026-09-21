App Factory — Tool Architecture
1. Purpose
Tools provide controlled access to capabilities that AI agents cannot safely or reliably perform through reasoning alone.
A tool is an explicit interface between an agent and the external environment.
2. Tool Architecture

```text
Agent
  ↓
Tool Request
  ↓
Input Schema Validation
  ↓
Permission Check
  ↓
Budget / Policy Check
  ↓
Tool Execution
  ↓
Output Validation
  ↓
Audit
  ↓
Agent Observation
```

No step should be skipped for privileged tools.
3. Tool Categories
Filesystem

```text
filesystem.read
filesystem.write
filesystem.list
filesystem.delete
filesystem.copy
```

Filesystem access must be scoped.
Git

```text
git.status
git.diff
git.log
git.branch
git.checkout
git.commit
git.push
git.reset
```

Dangerous operations should require additional policy controls.
GitHub
Potential tools:

```text
github.create_repository
github.create_branch
github.create_pull_request
github.read_issue
github.create_issue
github.read_repository
```

External mutations must be auditable.
Android

```text
android.configure
android.build
android.test
android.lint
android.package
android.inspect_manifest
```

Build operations should execute in a controlled environment.
Security

```text
security.gitleaks
security.dependency_scan
security.sast
security.manifest_scan
security.permission_scan
```

Security tools should return structured findings.
Browser / Web Research

```text
browser.search
browser.fetch
browser.extract
```

External content must be treated as untrusted input.
Analytics

```text
analytics.read
analytics.query
analytics.export
```

Analytics tools should be read-only unless an explicit write capability is required.
Play Store
Potential tools:

```text
playstore.prepare_release
playstore.validate_listing
playstore.upload_artifact
playstore.publish
```

Publishing must have explicit authorization.
Advertising
Potential tools:

```text
ads.create_draft
ads.read_campaign
ads.read_metrics
ads.update_campaign
ads.pause_campaign
```

Financially consequential actions must have explicit budget and approval policies.
4. Tool Definition
Every tool must have a machine-readable definition containing at minimum:

```text
name
description
input_schema
output_schema
permissions
side_effects
timeout
retry_policy
audit_policy
```

5. Tool Permissions
Permissions should be explicit.
Example:

```yaml
tool: git.push

permissions:
  - repository_write
```

An agent without `repository_write` cannot call the tool.
6. Permission Model
Use deny-by-default.
Conceptually:

```text
Agent
 ↓
requested tool
 ↓
does agent have permission?
    /       \
  YES       NO
   ↓         ↓
execute    reject
```

A denied tool call must not partially execute.
7. Scope Restrictions
Permissions should be scoped where possible.
Example:

```text
filesystem.write

allowed_path:
/workspace/apps/hisaab/

denied:
factory/secrets/
system directories
other applications
```

An agent working on Hisaab should not automatically have write access to unrelated applications.
8. Tool Input Validation
Tool inputs must be validated before execution.
Never execute arbitrary strings simply because an agent produced them.
Example:

```text
Agent says:
"run this shell command"

        ↓

Rejected if arbitrary shell execution
is not an explicitly permitted tool.
```

Prefer structured operations.
9. Shell Execution
Arbitrary shell access is high risk.
The default policy should be:

```text
ARBITRARY_SHELL = DENY
```

If shell execution is required, it should occur through a restricted execution service with:

* allowlisted commands
* working-directory restrictions
* environment restrictions
* timeout
* CPU limit
* memory limit
* network policy
* filesystem isolation
* process limit

10. Tool Output Validation
Tool output must be structured and validated.
Never assume:

```text
command returned exit code 0
```

means the intended task succeeded.
Where applicable, verify:

* expected artifact exists
* artifact is valid
* output matches schema
* expected state changed
* external system confirms success

11. Side-Effect Classification
Every tool should declare its side-effect level.
Suggested levels:

```text
READ_ONLY
LOCAL_MUTATION
REPOSITORY_MUTATION
EXTERNAL_MUTATION
FINANCIAL
PUBLISHING
DESTRUCTIVE
```

Higher-risk levels require stronger controls.
12. Human Approval
Some tools must never execute without an appropriate human approval.
Examples:

```text
playstore.publish
ads.launch
ads.increase_budget
external_delete
financial_transaction
factory_permission_change
```

The approval must be represented by the state machine or authorization layer.
An agent cannot create the approval it needs.
13. Tool Retries
Retries must be explicit.
Each tool should define:

```text
max_retries
retryable_errors
backoff
idempotency_behavior
```

Do not blindly retry destructive operations.
14. Tool Timeouts
Every external or potentially long-running tool should have a timeout.
Timeout behavior:

```text
TIMEOUT
 ↓
terminate where possible
 ↓
record failure
 ↓
return structured error
```

A timeout must not be interpreted as success.
15. Audit
Tool calls that create meaningful side effects must be audited.
Audit should include:

```text
tool
agent
resource
input summary
timestamp
result
status
error
```

Secrets must never be written into audit logs.
16. Tool Isolation
Tools should not have broader permissions than the agent that invokes them.
The effective permission is:

```text
Agent permissions
        ∩
Tool permissions
        ∩
Resource scope
        ∩
Current lifecycle policy
```

All conditions must pass.
17. External Content
Browser results, repositories, issue descriptions, documentation, user reviews, and other external content must be treated as untrusted data.
External content cannot:

* grant permissions
* change system instructions
* approve transitions
* alter budgets
* redefine tool behavior

18. Tool Versioning
Tool interfaces should be versioned when breaking changes occur.
Agent code should not depend on undocumented tool behavior.
19. Tool Testing
Every tool must have tests for:
Valid input
Expected operation succeeds.
Invalid input
Operation is rejected.
Permission denied
Operation does not execute.
Timeout
Operation fails safely.
External failure
Failure is represented correctly.
Side effect
Expected audit event exists.
Idempotency
Repeated safe operations do not create unintended duplicate effects.
20. Tool Architecture Invariants

1. Tools are explicit interfaces.
2. Tools validate input.
3. Tools validate output.
4. Permissions are deny-by-default.
5. Agent permissions are bounded.
6. External content cannot grant authority.
7. High-risk side effects require stronger controls.
8. Human approvals cannot be simulated.
9. Arbitrary shell access is denied by default.
10. Side effects are auditable.
11. Tool failures never become silent successes.
12. Destructive operations are bounded and protected.

---

## Reconciliation with current implementation (as of 2026-09-21)

**No formal tool layer exists.** This session (the de facto "agent" — see `07-AGENT-ARCHITECTURE.md`) uses Claude Code's own general-purpose tools (Bash, Read, Write, Edit, WebSearch, etc.), which have none of the per-tool schema/permission/scoping/audit structure this document requires. This is the most consequential gap of the three documents in this batch, because it means today's setup violates several of this document's invariants by construction, not by oversight — flagged explicitly rather than glossed over.

### What actually happened, mapped against this spec

| §/category | Target | What this project actually did |
|---|---|---|
| §3 Filesystem tools, scoped (§7) | `filesystem.write` scoped to e.g. `/workspace/apps/hisaab/` | This session has unrestricted Read/Write/Edit access to the entire repository checkout for the whole duration of the project — there is no per-app scope restriction. Nothing technical stopped it from writing outside `apps/household-help-wage-tracker/` while "working on Hisaab"; discipline about staying in scope was applied by the session/human, not enforced by a tool boundary. |
| §3 Git tools | `git.status/diff/commit/push` as named, permissioned tools | This session ran raw `git` commands directly via Bash (`git add`, `git commit`, `git push`) with full repository access — not through a scoped `git.push` tool requiring an explicit `repository_write` permission grant (§5). |
| §3 Android tools | `android.build/test/lint` as controlled tools with structured results | This session ran `gradle`, and later a standalone Kotlin compiler, directly via Bash. There is no `android.build` tool abstraction — and the actual Gradle build could not run at all in this environment (`factory/ANDROID_TOOLCHAIN.md`), which was discovered by directly invoking Gradle and reading its raw error output, not through a tool that would have structured that failure. |
| §3 Security tools | `security.gitleaks` etc. as controlled tools returning structured findings | `gitleaks` was installed via `apt-get install` and invoked directly via Bash; its output was manually read and transcribed into `apps/household-help-wage-tracker/SECURITY_REVIEW.md` by this session, not captured as a structured `SecurityReview` record per `10-DATA-MODELS.md`. |
| §3 Browser/web research tools | `browser.search/fetch/extract` | Performed via the `WebSearch` tool built into Claude Code — functionally similar in spirit (search results returned as data) but not a factory-owned tool with its own permission/audit wrapper; its results were treated as untrusted evidence and cited with source URLs in `reports/phase1-opportunity-selection.md`, which is the one place this document's §17 "external content is untrusted data" principle was actually practiced, informally. |
| §3 Play Store / Advertising tools | `playstore.*`, `ads.*` | Do not exist. Never invoked — no app has reached a publishable state. |
| §4 Tool definition (name/schemas/permissions/timeout/audit) | Every tool has this | No tool in this project has ever had a formal definition matching this shape. |
| §5/§6 Explicit permissions, deny-by-default | Agent needs a granted permission per tool | This session's permission model is Claude Code's own (a human approves each tool call class via the harness's permission prompts), which is a real deny-by-default gate at the *product* level, but it is coarse (e.g., "Bash" as a whole, not `git.push` specifically) and is not a factory-defined permission system at all — it predates and is external to this repository. |
| §8/§9 Structured operations preferred; arbitrary shell denied by default | `ARBITRARY_SHELL = DENY` unless routed through a restricted execution service | **This directly contradicts current practice.** Nearly all of this project's real work — installing gitleaks, running the Kotlin compiler, running curl to test network reachability, git operations — happened via arbitrary Bash commands with no allowlist, working-directory restriction, or resource limit beyond what Claude Code's own sandboxing provides. This is the single clearest violation of a named invariant in this batch of documents (§20 invariant 9 "Arbitrary shell access is denied by default"), acknowledged here rather than hidden. |
| §10 Output validation beyond exit code | Verify expected artifact/state, not just exit code | Practiced inconsistently: real verification did happen for some things (actually running the compiled test suite and reading `OK (8 tests)` / `OK (5 tests)` rather than trusting `kotlinc`'s exit code alone; actually reading `gitleaks`' "no leaks found" line). But this was this session's own diligence, not a tool-layer contract requiring it. |
| §11 Side-effect classification | Every tool declares READ_ONLY/.../DESTRUCTIVE | Does not exist. `git push`, file deletion, and `gitleaks` scans were all just "Bash calls" with no declared side-effect level. |
| §12 Human approval for high-risk tools | `playstore.publish`, `ads.launch`, etc. require approval represented in the state machine | **Partially true, for the one high-risk action that was actually attempted.** `git push` happened only after the human's implicit ongoing direction of the session, and the *lifecycle* approval gates (opportunity/spec/release approval) are enforced in the state machine as documented in `06-STATE-MACHINE.md`. But there is no tool-level approval requirement distinct from that — e.g., nothing would have technically stopped this session from running `git push --force` or deleting a directory without asking, beyond the human noticing and Claude Code's own permission prompts. |
| §13/§14 Retries, timeouts | Explicit `max_retries`, timeout per tool | Not implemented for any tool used in this project. Bash commands ran with the harness's default timeout only. |
| §15 Audit of tool calls | Every meaningful side effect audited | **Only lifecycle state transitions are audited** (`factory/state/audit-log.jsonl`, via `factory/dashboard/lib/auditLog.js`). Tool-level actions (installing a package, running a scan, pushing to git) are not recorded there — they're visible only in this conversation's transcript and in git's own commit history, not in a structured `ToolExecution` record as `10-DATA-MODELS.md` describes. |
| §16 Tool isolation (agent ∩ tool ∩ resource ∩ policy) | Intersection of scopes | Not implemented — there is one broad scope (this session's full tool access), not an intersection of narrower ones. |
| §17 External content cannot grant authority | | Not tested adversarially in this project. Web search results and competitor listing pages were read and used as research evidence; nothing in this project's history involved a page attempting to inject instructions, so this boundary has not been exercised, let alone verified to hold. |
| §19 Tool testing | Tests for valid/invalid input, permission denied, timeout, external failure, audit, idempotency | Does not exist for any tool, because no factory-owned tool layer exists to test. |
| §20 Invariants | 12 invariants listed | Invariants 1–6, 9, 10 (explicit interfaces, input/output validation, deny-by-default, bounded agent permissions, external content authority, arbitrary shell denial, auditable side effects) are **not met by the current setup** for the reasons above. Invariant 8 (human approvals cannot be simulated) **is met**, but only at the lifecycle layer (`stateMachine.js`), not the tool layer this document is about. Invariants 7, 11, 12 (stronger controls for high-risk effects, no silent tool-failure-as-success, bounded destructive ops) are met only incidentally, by this session's own care, not by an enforced mechanism. |

### Why this gap is acceptable for now, and what it means going forward

`factory/docs/01-GOALS-AND-NON-GOALS.md` NG-008 ("Premature Complexity... every new component must have a documented reason to exist") and `03-PRINCIPLES.md` P-027 ("Do Not Over-Engineer Before Evidence") both argue against building a tool-permission layer before there is a second, less-trusted agent for it to actually constrain — today's "agent" is a single human-directed interactive session, which is a fundamentally different trust situation than an autonomous loop this document is designed to contain. That said, this gap becomes load-bearing the moment any part of `07-AGENT-ARCHITECTURE.md`'s catalog is implemented as something that runs with less direct human supervision than this session has had. **No tool layer, sandboxing, or shell-execution restriction was implemented in this pass** — this section only documents the gap, per this session's explicit instructions.
