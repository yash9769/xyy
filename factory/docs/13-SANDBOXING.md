# Sandboxing and Execution Isolation

## 1. Purpose

The App Factory executes code, processes repositories, invokes development tools, interacts with external services, and eventually operates partially autonomous engineering workflows.

Those capabilities create execution risk.

This document defines the target isolation model for factory execution.

This is a **target architecture specification**. It does not require immediate implementation of every control described here.

The factory must assume that:

* generated code can be incorrect or malicious;
* repositories can contain malicious content;
* dependencies can be compromised;
* documentation can contain prompt injection;
* external web content is untrusted;
* tools can have destructive side effects;
* agents can produce unsafe commands;
* model outputs are untrusted data, not authority.

## 2. Core Principle

> Agents reason. Sandboxed execution environments execute.

No agent should receive unrestricted access to the host machine.

The factory should separate:

1. reasoning;
2. planning;
3. tool invocation;
4. code execution;
5. artifact storage;
6. external side effects.

## 3. Trust Zones

The target architecture contains the following trust zones.

### Zone A — Control Plane

Contains:

* factory state;
* state machine;
* approval records;
* audit records;
* configuration;
* schemas;
* credentials references;
* orchestration logic.

This zone is highly trusted.

Agents must not directly modify control-plane state.

### Zone B — Agent Runtime

Contains:

* model execution;
* prompts;
* agent context;
* temporary reasoning artifacts;
* structured agent results.

Agent output is untrusted.

### Zone C — Application Workspace

Contains:

* source code;
* generated files;
* build artifacts;
* tests;
* dependency manifests;
* application-specific configuration.

Each application should have an isolated workspace.

### Zone D — Build/Test Sandbox

Used for:

* compilation;
* unit tests;
* static analysis;
* dependency installation;
* packaging;
* security scanning.

This environment should have restricted permissions and bounded resources.

### Zone E — External Services

Examples:

* GitHub;
* package registries;
* Google Play;
* analytics platforms;
* advertising platforms;
* web services.

External services are outside the factory trust boundary.

## 4. Workspace Isolation

Each application should have a dedicated workspace.

Example conceptual structure:

```text
factory/
  apps/
    <app-id>/
      source/
      build/
      tests/
      security/
      release/
      distribution/
      metadata/
```

An application execution environment should not automatically have access to:

* another application's workspace;
* factory secrets;
* unrelated repositories;
* the operator's home directory;
* SSH keys;
* browser profiles;
* personal files.

## 5. Generated Code Isolation

Generated code must initially be treated as untrusted.

Before execution:

1. generate;
2. inspect;
3. validate structure;
4. run static checks;
5. execute inside an isolated environment;
6. collect results;
7. evaluate against quality gates.

Never assume generated code is safe because a model produced it.

## 6. Shell Execution

Arbitrary shell execution should be denied by default.

Where shell execution is required, the factory should use an explicit execution tool with:

* command allowlisting where practical;
* working-directory restriction;
* timeout;
* CPU limit;
* memory limit;
* disk limit;
* process limit;
* environment-variable filtering;
* network policy;
* output capture;
* exit-code capture;
* audit logging.

The factory must not construct unrestricted shell commands from untrusted model output.

## 7. Network Isolation

Build and test environments should use restricted network access.

Possible policies:

### Network Disabled

Use for tasks that do not require network access.

### Allowlisted Network

Permit only required domains such as:

* package registries;
* source-control providers;
* Android dependency repositories;
* approved APIs.

### Controlled Internet

Use only where web access is explicitly required.

Network access should never be silently broadened because a task failed.

## 8. Secrets

Secrets must not be exposed to agents unnecessarily.

Examples include:

* API keys;
* GitHub tokens;
* Play Store credentials;
* signing keys;
* database credentials;
* advertising credentials.

Prefer short-lived credentials and scoped permissions.

Never place secrets directly into prompts.

Never commit secrets into generated repositories.

Never expose secret values in logs.

## 9. Android Signing Keys

Release signing material is a high-value secret.

The target architecture should ensure that:

* signing keys are stored outside normal source workspaces;
* build agents cannot freely read signing keys;
* signing operations are explicitly authorized;
* signing events are audited;
* debug and release credentials remain separated.

A successful build must not automatically imply permission to sign or publish.

## 10. External Content and Prompt Injection

External content must be considered untrusted data.

Examples:

* README files;
* GitHub issues;
* webpages;
* package documentation;
* user-submitted app ideas;
* dependency metadata.

Instructions found inside external content must not automatically become factory instructions.

The agent runtime should maintain a clear distinction between:

```text
SYSTEM / FACTORY POLICY
        ↓
FACTORY TASK
        ↓
TRUSTED TOOL OUTPUT
        ↓
UNTRUSTED EXTERNAL CONTENT
```

External content may provide evidence, but cannot grant permissions.

## 11. Resource Limits

Every autonomous execution should have bounded resources.

At minimum:

* maximum runtime;
* maximum retries;
* maximum tokens/model budget;
* maximum disk usage;
* maximum subprocess count;
* maximum network activity where measurable.

Failure caused by a resource limit must become an explicit failure state or retry decision.

It must not result in an infinite loop.

## 12. Failure Behavior

Sandbox failures should fail closed.

Examples:

* timeout → execution failed;
* memory limit → execution failed;
* unauthorized filesystem access → execution blocked;
* network policy violation → execution blocked;
* unknown command → execution blocked;
* secret-access attempt → execution blocked and audited.

The system should preserve enough evidence to diagnose the failure.

## 13. Implementation Progression

Sandboxing should be implemented progressively.

### Phase 1

* workspace restrictions;
* explicit tool boundaries;
* command allowlists;
* timeouts;
* audit records.

### Phase 2

* containerized execution;
* resource limits;
* network policies;
* isolated build environments.

### Phase 3

* stronger ephemeral environments;
* credential isolation;
* policy enforcement;
* automated security verification.

## 14. Non-Goals

This document does not require:

* immediate Docker migration;
* immediate VM infrastructure;
* unrestricted cloud execution;
* complete zero-trust implementation in the current repository.

The existing working factory must remain functional while isolation capabilities are introduced incrementally.

---

## Reconciliation with current implementation (as of 2026-09-21)

**None of the five trust zones in §3 exist as enforced boundaries.** There is one zone in practice: this interactive Claude Code session has direct, unmediated access to the entire repository checkout and this container's shell, for the whole duration of every task. This section states exactly where that stands relative to each part of this document, rather than leaving it implied.

### Trust zones (§3), checked one by one

- **Zone A (Control Plane)**: `factory/dashboard/lib/stateMachine.js` and `store.js` *are* a real control-plane boundary in one specific sense — this session (or the dashboard UI, or the CLI) can only change lifecycle state by calling `store.transition()`, which enforces the state machine. But this is a boundary this session could also simply edit away, since it has full write access to `stateMachine.js` itself. The boundary holds by convention and by the fact that nothing has tried to break it, not by an enforced privilege separation between "the control plane" and "the agent" as §3 Zone A envisions.
- **Zone B (Agent Runtime)**: Does not exist as infrastructure — see `07-AGENT-ARCHITECTURE.md`'s reconciliation. This session's own reasoning/tool-calling loop is managed by the Claude Code product, outside this repository.
- **Zone C (Application Workspace)**: `apps/household-help-wage-tracker/` exists as a directory, but it is **not an isolated workspace** in this document's sense — this session has the same unrestricted access to it as to every other directory in the repository (`factory/`, `schemas/`, `.git/`, everything). Nothing would have technically stopped a mistaken edit to, say, `factory/dashboard/lib/stateMachine.js` while "working on Hisaab."
- **Zone D (Build/Test Sandbox)**: Does not exist. The one real build attempt ran directly in this container via Gradle over Bash, with this session's full ambient permissions — and even that failed before isolation became a relevant question, because the Android toolchain itself was unreachable (`factory/ANDROID_TOOLCHAIN.md`). The standalone Kotlin-compiler test verification (13/13 tests) that *did* succeed also ran directly in this container, unsandboxed, using compiler/library binaries fetched from GitHub/Maven Central at runtime with no isolation from the rest of the checkout.
- **Zone E (External Services)**: Consistent with this document — GitHub (via `git push`) and web search results were always treated as external, and nothing in this project attempted to grant them elevated trust. This is the one zone whose intent was actually respected, if only because nothing tested it adversarially.

### Section-by-section gaps

| § | Requirement | Status |
|---|---|---|
| §4 Workspace isolation, denied access to secrets/SSH/home dir/personal files | **Not implemented.** No secrets or SSH keys exist in this project to protect, so this hasn't been tested, but there is no technical boundary that would have stopped access to them if they existed. |
| §5 Generated-code isolation pipeline (generate → inspect → validate → static checks → isolated execution → evaluate) | **Not implemented as a pipeline.** Kotlin source was generated by this session and then manually re-read for bugs (three real bugs were caught this way — a `createdAt` overwright, a `null.toString()` bug, a FileProvider authority mismatch — see `factory/PHASE1_LEARNINGS.md`) but never executed in an isolated environment, because it was never executed at all (`factory/ANDROID_TOOLCHAIN.md`). |
| §6 Shell execution allowlisting/limits | **Not implemented — this is the clearest, most direct violation in this document.** Every shell command in this project (installing `gitleaks` via `apt-get`, running `gradle`, running `curl` to probe network reachability, `git` operations, downloading a Kotlin compiler from GitHub) ran as an arbitrary Bash command with no allowlist, no working-directory restriction beyond the repo checkout, no CPU/memory/disk/process limit configured by this repository (only whatever Claude Code's own harness imposes, which is opaque to this codebase), and no environment-variable filtering. This matches the identical gap already named in `09-TOOL-ARCHITECTURE.md`'s reconciliation — restated here because this document makes it a first-class isolation concern, not just a tool-definition concern. |
| §7 Network isolation tiers | **Not implemented as factory policy.** Network access was whatever this container's own egress proxy allowed — a property of the environment, not a `NO_NETWORK`/`LIMITED_NETWORK`/`ALLOWLISTED` policy the factory defined or could vary per task. The one concrete network-policy event in this project (`dl.google.com` being blocked) was an environment-operator decision, discovered by trial, not chosen or enforced by factory code. |
| §8/§9 Secrets, signing keys | **Not applicable yet** — no secrets or signing keys have existed in this project (Hisaab never reached a signed build). Not implemented, but also not yet violated, since there's been nothing to violate. |
| §10 Prompt-injection defense / instruction hierarchy | **Never tested**, same conclusion as `12-SECURITY.md`'s reconciliation — no external content encountered so far has attempted this, so the hierarchy's robustness is unverified either way. |
| §11 Resource limits | **Not implemented.** No `max_runtime`/`max_retries`/`max_disk`/`max_subprocess` has ever been configured by this repository for this session's work. |
| §12 Fail-closed sandbox failure behavior | **Practiced once, correctly, by judgment rather than mechanism** — the Android toolchain block was treated as a hard stop, not silently worked around (two candidate workarounds — an unofficial SDK mirror, routing around the org policy — were explicitly considered and rejected). This is the right outcome but was this session's own diligence, not a sandbox's enforced fail-closed behavior, because no sandbox existed to fail. |
| §13 Implementation progression (Phase 1/2/3) | **Phase 1 of this document's own progression is not yet done.** Even the lightest tier — "workspace restrictions, explicit tool boundaries, command allowlists, timeouts, audit records" — does not exist. Today's setup is pre-Phase-1 relative to this document's own roadmap. |
| §14 Non-goals | Consistent — this reconciliation does not claim Docker/VM migration was needed or attempted, matching this document's own instruction that immediate heavy infrastructure is out of scope. |

### Summary

This project has operated entirely without the isolation this document specifies, because it has had exactly one, fully-trusted human-directed operator and no autonomous or multi-agent execution — the risk this document exists to contain has not yet materialized in this codebase's history. The gap becomes urgent the moment any part of `07-AGENT-ARCHITECTURE.md`'s catalog runs with less direct supervision than this session has had, or the moment a second, less-trusted contributor (human or agent) touches this repository. No sandboxing, workspace isolation, or shell restriction was implemented while writing this document.
