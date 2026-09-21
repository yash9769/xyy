App Factory Architecture
App Factory — System Architecture
1. Purpose
This document defines the high-level technical architecture of the App Factory.
The architecture must support:

* multiple AI providers
* autonomous agents
* deterministic services
* controlled tools
* human approval gates
* Android application generation
* automated testing
* security validation
* release preparation
* distribution
* monitoring
* iterative improvement
* auditability
* cost controls

The architecture must remain modular so individual components can be replaced without rewriting the entire system.
2. Architectural Model
The factory is divided into these logical layers:

```
┌───────────────────────────────────────────────┐
│                 HUMAN LAYER                   │
│ Dashboard / CLI / Approval / Configuration   │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────▼────────────────────────┐
│              APPLICATION LAYER                 │
│ Opportunities / Apps / Lifecycle / Reports    │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────▼────────────────────────┐
│               ORCHESTRATION                   │
│ Workflow execution / Agent coordination       │
└───────────────┬───────────────────┬───────────┘
                │                   │
        ┌───────▼───────┐   ┌──────▼────────┐
        │    AGENTS     │   │    SERVICES   │
        │ AI reasoning  │   │ Deterministic │
        └───────┬───────┘   └──────┬────────┘
                │                   │
                └─────────┬─────────┘
                          │
                  ┌───────▼────────┐
                  │     TOOLS       │
                  │ Controlled I/O  │
                  └───────┬────────┘
                          │
        ┌─────────────────┼──────────────────┐
        ↓                 ↓                  ↓
   Git / Files        Build/Test        External APIs
        │                 │                  │
        └─────────────────┼──────────────────┘
                          ↓
                   AUDIT / EVENTS
```

3. Core Components
3.1 Dashboard
The dashboard is the primary human control plane.
Responsibilities:

* display current lifecycle state
* display action-required items
* show opportunity evidence
* show application status
* allow authorized human approvals
* allow rejection with reason
* allow requests for more research
* display audit events
* display build/test/security status
* display costs
* display monitoring information

The dashboard must not contain independent lifecycle logic.
It calls the authoritative service layer.
4. CLI
The CLI provides a programmatic human/operator interface.
It should expose operations such as:

```
appfactory status
appfactory opportunities
appfactory approve
appfactory reject
appfactory research
appfactory build
appfactory test
appfactory security
appfactory release
appfactory audit
```

The CLI and dashboard must call the same service layer.
They must never maintain separate business logic.
5. Service Layer
The service layer is the authoritative execution boundary for factory operations.
Responsibilities include:

* lifecycle transitions
* validation
* authorization
* record mutation
* artifact registration
* audit event creation
* budget enforcement
* invoking deterministic services
* invoking controlled tools

The service layer must not depend on a specific UI.
6. State Machine
The state machine defines:

* legal states
* legal transitions
* actor requirements
* transition preconditions
* transition side effects

No component may bypass it.
The state machine is authoritative for lifecycle state.
7. Orchestrator
The orchestrator coordinates multi-step workflows.
Example:

```
Research opportunity
    ↓
Validate research schema
    ↓
Store research
    ↓
Calculate opportunity analysis
    ↓
Transition state
    ↓
Request human approval
```

The orchestrator should coordinate components rather than duplicate their business logic.
8. Agents
Agents are AI reasoning components.
Agents should perform tasks such as:

* research
* analysis
* product specification
* UX planning
* coding
* debugging
* security analysis
* release copy generation
* ASO
* marketing
* metric analysis

Agents must not directly mutate lifecycle state.
They request operations through defined services/tools.
9. Agent Runtime
The agent runtime is responsible for:

* loading agent configuration
* providing task context
* selecting a model
* exposing permitted tools
* executing model calls
* validating outputs
* enforcing budgets
* enforcing timeouts
* enforcing iteration limits
* recording execution metadata

An agent execution should have a unique identifier.
Example:

```
agent_run_id
opportunity_id
app_id
agent_type
model
started_at
completed_at
status
cost
tool_calls
output
error
```

10. Model Router
All LLM calls should pass through a model abstraction.
The model router selects an appropriate provider/model based on:

* task type
* quality requirement
* latency requirement
* cost budget
* availability
* fallback policy

Example:

```
Research
   ↓
Model Router
   ↓
Research Model

Coding
   ↓
Model Router
   ↓
Coding Model

Simple classification
   ↓
Model Router
   ↓
Low-cost model
```

Agents must not directly depend on provider-specific SDKs where avoidable.
11. Tool Layer
Tools provide controlled capabilities to agents.
Examples:

```
filesystem.read
filesystem.write

git.status
git.diff
git.branch
git.commit
git.push

github.create_branch
github.create_pr

android.build
android.test

security.gitleaks
security.sast
security.dependencies

browser.search
browser.fetch

analytics.read

playstore.prepare
playstore.publish
```

Each tool must define:

* name
* input schema
* output schema
* permissions
* timeout
* side effects
* audit behavior
* failure behavior

12. Deterministic Services
Deterministic services should handle operations where conventional software is more reliable than an LLM.
Examples:

* state transitions
* schema validation
* wage calculations
* cost calculations
* budget enforcement
* file management
* hashing
* test execution
* artifact validation
* report generation
* audit logging

Agents should not replace deterministic business logic.
13. Persistence
The initial factory remains file-based.
Primary structures:

```
candidates/
approved/
rejected/
apps/
factory/state/
reports/
schemas/
```

Audit:

```
factory/state/audit-log.jsonl
```

The architecture should not introduce a database merely for convenience.
A database may be introduced later only when a demonstrated requirement justifies it.
14. Event and Audit System
Important operations should produce events.
Example:

```
{
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "actor_type": "AGENT",
  "actor_id": "research-agent",
  "action": "RESEARCH_COMPLETED",
  "resource_type": "OPPORTUNITY",
  "resource_id": "opp-001",
  "state_before": "RESEARCHING",
  "state_after": "ANALYZED",
  "metadata": {}
}
```

Audit events should be append-only.
15. External Automation Layer
External automation systems such as n8n may trigger or consume factory workflows.
Examples:

```
n8n
 ↓
scheduled research trigger
 ↓
Factory API
```

or:

```
Factory
 ↓
event
 ↓
n8n
 ↓
notification / external workflow
```

n8n must not become the authoritative lifecycle state machine.
The factory remains authoritative.
16. Application Workspace
Each application should have an isolated workspace.
Example:

```
apps/
└── hisaab/
    ├── source/
    ├── research/
    ├── product/
    ├── build/
    ├── test/
    ├── security/
    ├── release/
    ├── distribution/
    └── monitoring/
```

The exact structure may evolve, but artifacts must remain attributable to the application.
17. Security Boundary
Generated application code must not automatically receive unrestricted access to the factory host.
Where code execution is required:

```
Agent
 ↓
Controlled execution service
 ↓
Sandbox
 ↓
Build/test
 ↓
Structured result
```

The sandbox should have:

* restricted filesystem
* controlled network access
* resource limits
* timeout
* process limits
* no access to factory secrets by default

18. Configuration
Configuration must be externalized.
Examples:

```
MODEL_PROVIDER
MODEL_NAME
MODEL_BASE_URL
MODEL_API_KEY
MAX_AGENT_ITERATIONS
MAX_AGENT_RUNTIME
MAX_APP_BUDGET
BUILD_TIMEOUT
TEST_TIMEOUT
SECURITY_POLICY
```

Secrets must not be committed to Git.
19. Dependency Direction
Preferred dependency direction:

```
UI
 ↓
Service Layer
 ↓
Domain / State Machine
 ↓
Infrastructure / Tools
```

Agents should interact through defined interfaces.
Infrastructure must not become the owner of business rules.
20. Architecture Invariants
The following must always remain true:

1. One authoritative state machine.
2. One authoritative service layer.
3. Human approval cannot be simulated.
4. Agents cannot directly mutate lifecycle state.
5. All LLM output is untrusted.
6. All external side effects are controlled.
7. All consequential side effects are auditable.
8. Model providers are replaceable.
9. n8n is not the source of truth.
10. Deterministic logic remains deterministic.
11. Autonomous loops are bounded.
12. Security checks cannot be silently bypassed.
13. Failed operations cannot be represented as successful.
14. Factory code and generated application code have separate trust boundaries.
15. Existing working functionality must be preserved unless intentionally changed.

---

## Reconciliation with current implementation (as of 2026-09-21)

This section exists so the target architecture above is never mistaken for what is actually running. Where the two differ, **the current implementation is the source of truth** until an explicitly approved migration phase changes it.

| Component (§) | Target | Current implementation | Status |
|---|---|---|---|
| Dashboard (§3.1) | Full control plane: state, action-required, evidence, approvals, audit, build/test/security status, costs, monitoring | `factory/dashboard/public/` (vanilla HTML/JS) + `server.js` (Express). Shows lifecycle state, Action Required, evidence, Approve/Reject/Need-More-Research, Hisaab's static (hand-written) build/security status, activity log. | **Partially implemented.** No cost display, no live monitoring display (nothing published yet to monitor). |
| CLI (§4) | `appfactory status/opportunities/approve/reject/research/build/test/security/release/audit` | `factory/cli/appfactory.py` implements `discover, analyze(stub), approve, reject, status, dashboard`; `spec/build/test/review/release/publish/monitor/iterate` are explicit labeled stubs. No `appfactory audit` command exists (the audit log is currently read only via the dashboard's `/api/activity` or by reading `factory/state/audit-log.jsonl` directly). | **Partially implemented**, and command names differ slightly from this spec (`review` vs `security`, no `research`/`audit` subcommands yet). |
| Service layer (§5) | Authoritative execution boundary: transitions, validation, authorization, budget enforcement, tool invocation | `factory/dashboard/lib/store.js` implements transitions, validation (via the state machine), directory moves, audit logging. **No budget enforcement, no tool invocation layer exist** — there is nothing yet for it to invoke. | **Partially implemented** (the state-transition subset only). |
| State machine (§6) | Legal states/transitions/actor requirements/preconditions | `factory/dashboard/lib/stateMachine.js` — implemented, but its 19-state model differs from the canonical model in `factory/docs/06-STATE-MACHINE.md`. See that document's own reconciliation section for the exact differences. | **Implemented, but a different state set than this spec's canonical proposal.** Not reconciled/migrated yet — by design, per this session's instructions. |
| Orchestrator (§7) | Coordinates multi-step workflows (research → validate → store → analyze → transition → request approval) | Does not exist. Today a human runs `appfactory discover` (writes one record) and separately, interactively, asks Claude Code to do research/analysis, which a human then transcribes into the opportunity record by hand. | **Not implemented.** |
| Agents (§8) | Named AI reasoning components performing research/coding/security-analysis/ASO/etc. as addressable units with their own runs | Does not exist as infrastructure. "The agent" today is this interactive Claude Code session, invoked directly by the human — there is no `agent_run_id`, no agent registry, no separation between "an agent" and "the person typing at Claude Code." | **Not implemented.** |
| Agent runtime (§9) | Model selection, tool exposure, output validation, budget/timeout/iteration enforcement, execution metadata | Does not exist. | **Not implemented.** |
| Model router (§10) | Abstraction selecting provider/model per task | Does not exist. There is exactly one model in use (this session, configured outside factory code) and no factory code calls an LLM API directly — Claude Code itself is invoked by the human. | **Not implemented. This is the largest gap against `factory/docs/00-VISION.md` §7 (Model Independence).** |
| Tool layer (§11) | Named tools with schemas/permissions/timeouts (`filesystem.*`, `git.*`, `github.*`, `android.*`, `security.*`, `browser.*`, `playstore.*`) | Does not exist as a formal layer. Equivalent operations happen today via this session's own general-purpose tools (Bash, Read, Write, WebSearch, etc.), which have none of the per-tool permission/schema/audit structure this spec requires. | **Not implemented.** |
| Deterministic services (§12) | State transitions, schema validation, calculations, budget enforcement, test execution, audit logging | State transitions (`stateMachine.js`), audit logging (`auditLog.js`), and one real calculation module exist (`apps/household-help-wage-tracker/.../WageCalculator.kt`, app-specific, not factory infrastructure). Schema validation exists as JSON Schema files (`schemas/*.json`) but nothing currently runs them programmatically — no validator is wired in. No budget enforcement exists. | **Partially implemented**, narrower than this spec (mostly state machine + audit, not a general deterministic-services layer). |
| Persistence (§13) | File-based: `candidates/ approved/ rejected/ apps/ factory/state/ reports/ schemas/` | Matches exactly — this is already true. `factory/state/audit-log.jsonl` exists and is append-only. | **Implemented**, matches spec. |
| Event/audit system (§14) | Structured event with `event_id, actor_type, actor_id, action, resource_type, resource_id, state_before, state_after, metadata` | `factory/dashboard/lib/auditLog.js` records `timestamp, actor, actorName, action, opportunityId, previousState, newState, reason?, note?`. Missing fields vs. this spec: `event_id` (no UUID — entries are ordered by file position/timestamp only), `actor_type` vs `actor` (same concept, different field name), `resource_type` (implicitly always "OPPORTUNITY" — apps don't yet get their own audit entries distinct from their opportunity). | **Partially implemented** — same purpose, different/narrower schema. Field-name reconciliation is a future task, not done here. |
| External automation / n8n (§15) | n8n may trigger/consume factory workflows via events/API | Does not exist. No n8n integration, no factory HTTP API beyond the dashboard's own `/api/*` (which is designed for the dashboard UI, not as a general external-automation surface). | **Not implemented.** |
| Application workspace (§16) | `apps/<id>/{source,research,product,build,test,security,release,distribution,monitoring}/` | `apps/household-help-wage-tracker/` currently has `app/` (source), top-level `PRD.md, USER_FLOWS.md, FEATURES.md, ARCHITECTURE.md, TEST_PLAN.md, PRIVACY.md, MONETIZATION.md, SECURITY_REVIEW.md, status.json`, and `store/` — a flatter, doc-centric layout, not this spec's subdirectory-per-concern structure. | **Different structure than this spec proposes.** Not migrated — flagged, not silently changed. |
| Security boundary / sandbox (§17) | Agent code execution routed through a controlled, sandboxed build/test service | Does not exist. Builds/tests for Hisaab were attempted directly in this session's own container (and were blocked entirely — see `factory/ANDROID_TOOLCHAIN.md` — before any sandboxing question became relevant). | **Not implemented.** |
| Configuration (§18) | Externalized config: `MODEL_PROVIDER, MODEL_NAME, MAX_AGENT_ITERATIONS, BUILD_TIMEOUT`, etc. | Does not exist as a config surface — `factory/config/` currently holds only `scoring-weights.yaml` and `kill-criteria.yaml` (business-rule thresholds, not runtime/model/budget configuration). No secrets are committed (verified by `gitleaks` in `SECURITY_REVIEW.md`), consistent with this spec, but there is nothing yet to configure. | **Not implemented.** |
| Dependency direction (§19) | UI → Service Layer → Domain/State Machine → Infrastructure/Tools | Matches for the part that exists: `public/app.js` → `server.js` → `lib/store.js` → `lib/stateMachine.js`. No infrastructure/tools layer exists yet to be at the bottom of the chain. | **Implemented for the existing subset.** |

### Summary
The **human layer, application layer (file-based state), and the state-machine/service-layer core** are real and match this spec's intent closely, if not its exact naming. Everything below that in the target diagram — orchestrator, agents, agent runtime, model router, tool layer, sandboxing, external automation, and configuration/budgets — **does not exist yet**. This is expected at this stage (see `factory/ROADMAP.md` Phases 2–7) and is recorded here so no future reader assumes otherwise from this document alone.
