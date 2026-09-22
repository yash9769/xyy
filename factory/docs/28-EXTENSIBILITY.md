Extensibility Architecture
1. Purpose
The App Factory is intended to evolve over time.
New:

* agents;
* models;
* tools;
* application templates;
* platforms;
* distribution channels;
* analytics providers;
* storage systems;
* workflows

should be addable without rewriting the core factory.
2. Core Principle
Extend through explicit interfaces and contracts, not through duplicated logic.
The factory should favor stable contracts between components.
3. Extension Boundaries
Major extension points include:

```text
Model Provider
Agent
Tool
Workflow
Application Template
Build Backend
Test Backend
Security Scanner
Release Provider
Distribution Channel
Analytics Provider
Storage Backend
```

Each extension should implement a defined contract.
4. Agent Extensions
New agents should follow the common agent architecture.
An agent should define:

* identifier;
* purpose;
* input schema;
* output schema;
* required capabilities;
* permitted tools;
* execution limits;
* failure behavior.

Adding a new agent must not require changing unrelated agents.
5. Model Extensions
The model router should allow new providers/models to be registered through capability metadata.
A model integration should define:

* provider;
* model;
* capabilities;
* context limits;
* structured-output support;
* tool-use support;
* estimated pricing;
* availability;
* reliability metadata.

The rest of the factory should not depend directly on provider-specific APIs.
6. Tool Extensions
Tools should expose explicit schemas.
A tool definition should specify:

```text
name
version
purpose
input_schema
output_schema
permissions
side_effect_level
timeout
retry_policy
audit_requirements
```

Agents should request capabilities rather than directly invoking implementation-specific code.
7. Workflow Extensions
The lifecycle should remain authoritative.
New workflows should integrate through the existing orchestration and state-management layers.
A new workflow must not create an independent lifecycle state machine unless explicitly approved as an architectural change.
8. Application Templates
The factory should eventually support reusable application templates.
Examples:

* local-first CRUD;
* SaaS dashboard;
* utility application;
* productivity application;
* marketplace;
* content application.

Templates may provide:

* project structure;
* UI components;
* architecture;
* testing conventions;
* security defaults;
* build configuration.

Templates must not bypass quality gates.
9. Platform Extensions
Android is the initial platform.
Future support may include:

* iOS;
* web;
* desktop;
* backend services.

Platform-specific functionality should remain behind platform adapters where practical.
10. Build Backend Extensions
The build layer should eventually support multiple implementations.
Conceptually:

```text
BuildService
    ├── AndroidBuildBackend
    ├── WebBuildBackend
    └── FutureBackend
```

The orchestration layer should depend on the interface rather than a particular build implementation.
11. Release Provider Extensions
Publishing should use provider abstractions where appropriate.
Example:

```text
ReleaseService
    ├── GooglePlayProvider
    ├── FutureStoreProvider
    └── FutureDistributionProvider
```

Provider-specific behavior should remain isolated.
12. Analytics Extensions
Analytics providers should map external events into the factory's canonical metric model.
The factory should not make every downstream component understand provider-specific schemas.
13. Storage Evolution
The current factory uses file-based persistence.
Future storage may include:

* SQLite;
* PostgreSQL;
* another database;
* cloud storage.

The migration should preserve the logical data model.
Storage migration must not silently change lifecycle semantics.
14. Versioning
Extensions should be versioned.
Breaking changes require explicit migration.
Example:

```text
Schema v1
   ↓
Migration
   ↓
Schema v2
```

Do not silently reinterpret historical records under a new schema.
15. Backward Compatibility
Existing applications and records should remain usable when new components are introduced where practical.
Compatibility requirements should be documented before breaking changes.
16. Feature Flags
Experimental capabilities may be introduced behind feature flags.
Example:

```text
ENABLE_NEW_BUILD_BACKEND=false
```

Feature flags should not be used to hide unfinished production functionality indefinitely.
17. Plugin Architecture
A plugin should not automatically receive unrestricted permissions.
Each plugin must declare:

* capabilities;
* tools;
* permissions;
* network access;
* data access;
* side effects.

The factory should apply least privilege.
18. Configuration
Configuration should be separated from application logic.
Examples:

* model selection;
* budget limits;
* retry policies;
* tool permissions;
* feature flags;
* environment settings.

Secrets must remain outside ordinary configuration files.
19. Avoiding Abstraction Overload
Extensibility should not result in unnecessary abstraction.
Do not introduce an interface merely because a second implementation might someday exist.
The preferred sequence is:

```text
Working implementation
        ↓
Repeated requirement
        ↓
Stable abstraction
        ↓
Second implementation
```

20. Extension Validation
Every extension should have:

* contract tests;
* schema validation;
* permission validation;
* failure tests;
* integration tests where required.

A new extension must not weaken existing quality gates.
21. Current Implementation
The current factory is intentionally simpler than this target architecture.
Existing components should remain stable while extension points are introduced incrementally.
Do not perform broad abstraction refactoring solely to make the code resemble this document.
22. Non-Goals
This document does not require:

* a public plugin marketplace;
* third-party agent development;
* multi-cloud abstraction;
* support for every platform;
* generalized enterprise architecture.

Extensibility should follow actual factory needs.

---

## Reconciliation with current implementation (as of 2026-09-22)

**The current factory has zero of the twelve named extension points (§3) as formal interfaces — and per §19/§21, that is correct, not a gap to rush to close.** There is exactly one implementation of everything: one state machine, one dashboard, one CLI, one Android template, one app. §19's own sequence (`working implementation → repeated requirement → stable abstraction → second implementation`) has not yet reached its second step for almost anything in this factory, so building abstractions now would be exactly the "abstraction overload" this document warns against.

### Extension points (§3), checked against what exists

| Extension point | Current state |
|---|---|
| Model Provider | **One provider, no interface.** This interactive session is the only model ever used; no `ModelProvider` interface exists because there is no second provider to abstract over (`08-MODEL-ROUTING.md`'s reconciliation). |
| Agent | **One "agent" (this session), no interface.** No `AgentContract` exists (`07-AGENT-ARCHITECTURE.md`'s reconciliation). |
| Tool | **This session's own Bash/Read/Write/WebSearch tools, no factory-owned interface.** No `ToolDefinition` schema exists (`09-TOOL-ARCHITECTURE.md`'s reconciliation). |
| Workflow | **One workflow implicitly exists** (opportunity → approval → spec → build → ...), expressed entirely as the state machine's transition table, not as a separate "workflow" abstraction layered on top of it — correctly, since `06-STATE-MACHINE.md` is already the authoritative lifecycle, and this document's §7 explicitly forbids a second one. |
| Application Template | **One template** (`templates/android/`), used once (Hisaab). No template *registry* or selection mechanism exists — copying the directory and renaming the package was done by hand (`factory/PHASE1_LEARNINGS.md` names this exact manual step as a Phase 3 automation candidate). |
| Build Backend | **One backend concept** (Gradle/Android), never abstracted, and never even successfully exercised (`factory/ANDROID_TOOLCHAIN.md`). No `BuildService` interface exists. |
| Test Backend | **One ad hoc backend**: a standalone Kotlin compiler + JUnit4, invoked directly via Bash for the one Phase 1 verification that could run. Not wrapped in any interface. |
| Security Scanner | **One scanner** (`gitleaks`, installed via apt and invoked directly), plus manual manifest review. No scanner-abstraction layer exists. |
| Release Provider | **None exist** — no release has ever been prepared to the point of needing a provider abstraction (`18-RELEASE-PIPELINE.md`'s reconciliation). |
| Distribution Channel | **None exist** (`19-DISTRIBUTION.md`'s reconciliation). |
| Analytics Provider | **None exist, and Hisaab specifically opts out of having one** (`22-ANALYTICS.md`'s reconciliation) — the factory's first real app is a case *against* needing this extension point yet, not evidence for it. |
| Storage Backend | **One backend**: plain files (`candidates/`, `approved/`, JSON files, `audit-log.jsonl`). §13 explicitly allows this to remain file-based; no migration has been attempted or is needed yet. |

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §4–§12 Per-extension-point contracts (agent/model/tool/template/platform/build/release/analytics) | **None exist**, consistently with the table above — there is no second implementation of anything these sections describe interfaces for. |
| §13 Storage evolution preserving the logical data model | **Not applicable yet** — no storage migration has occurred, so nothing has been tested against this requirement. The logical data model itself (per `10-DATA-MODELS.md`) is only partially formalized (3 of ~17 resource types have schemas), which would need to mature before a storage migration could meaningfully "preserve" it. |
| §14 Versioned extensions, explicit migration | **Not applicable** — nothing has been extended or migrated. Notably, `10-DATA-MODELS.md`'s reconciliation already found that **no factory-level record has a `schema_version` field today**, which would need to exist before any of this document's versioning guidance could be followed even once. |
| §15 Backward compatibility | **Trivially true** — with one app and one template, nothing has ever needed to remain compatible with a prior version of itself. |
| §16 Feature flags | **Does not exist.** No `ENABLE_*` flag or equivalent configuration exists anywhere in the repository — every capability that exists is either fully present or fully absent, with no gradual/flagged rollout mechanism. |
| §17 Plugin architecture, least privilege | **Not applicable — there are no plugins.** This session's own tool access is governed by Claude Code's product-level permission prompts, not a factory-defined plugin permission system (the same point already made in `09-TOOL-ARCHITECTURE.md`'s reconciliation). |
| §18 Configuration separated from logic | **Partially true, narrowly.** `factory/config/scoring-weights.yaml` and `kill-criteria.yaml` are real, external, business-rule configuration, not hard-coded into `pipeline.py`/`stateMachine.js` — this is a genuine, if small, instance of this section's principle already being followed. No model/budget/retry/feature-flag configuration exists, because none of those subsystems exist yet to configure. |
| §19 Avoiding abstraction overload | **This is the section most worth highlighting, because the current factory already follows it correctly, by omission.** `CLAUDE.md`'s own ground rules ("no DI framework for v1... add one only past ~5 screens") and `03-PRINCIPLES.md` P-027 ("Do Not Over-Engineer Before Evidence") both independently arrived at the same instinct this section states directly. The factory has one of everything specifically *because* a second implementation has never yet been needed — this is the correct state for a system that has shipped exactly one (unbuilt) app, not a shortcoming. |
| §20 Extension validation (contract/schema/permission/failure tests) | **Not applicable — there are no extensions to validate.** The closest analogue, testing the one real "contract" that exists (the state machine's transition rules), was done manually during development (illegal-transition and wrong-actor rejection, verified via ad hoc CLI/HTTP calls) rather than as a checked-in contract-test suite — the same gap `06-STATE-MACHINE.md`/`15-QUALITY-GATES.md` already named from the testing angle. |
| §21 Simplicity preserved, no premature refactoring | **Fully honored across this entire 27-document reconciliation project.** Not one line of factory code was changed to "look more like" any of these 28 target-architecture documents — every reconciliation section in docs 04 through 27 explicitly states what wasn't touched. |
| §22 Non-goals | Consistent — no plugin marketplace, third-party agent SDK, or multi-cloud abstraction has been built or claimed. |

### Summary

This is the one document in the entire series where "almost nothing exists yet" is the *correct* finding, not a gap to close urgently — §19's own principle explains why: every extension point this document describes needs a second real implementation to justify existing, and the factory doesn't have a second of anything yet, by design, at this stage of `factory/ROADMAP.md`. The one genuinely reusable pattern already in place — configuration externalized from logic (`factory/config/*.yaml`) — is small but real, and is the seed this document's §18 would want grown, not replaced. No interface, plugin system, or abstraction layer was implemented while writing this document.
