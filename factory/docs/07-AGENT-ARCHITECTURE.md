App Factory — Agent Architecture
1. Purpose
This document defines how AI agents operate inside the App Factory.
Agents are reasoning components, not the source of truth.
The architecture must allow agents to:

* reason about tasks
* inspect permitted context
* use permitted tools
* produce structured outputs
* recover from bounded failures
* hand work to other agents
* request deterministic services

Agents must not bypass the factory's state machine, permissions, validation, audit, or human approval systems.
2. Agent Mental Model
An agent execution follows:

```text
TASK
  ↓
CONTEXT
  ↓
MODEL
  ↓
REASONING
  ↓
TOOL REQUESTS
  ↓
TOOL EXECUTION
  ↓
OBSERVATION
  ↓
FINAL STRUCTURED OUTPUT
  ↓
VALIDATION
```

The agent runtime controls the loop.
The LLM does not control the runtime itself.
3. Agent vs Service
The distinction is mandatory.
Agent
Used when reasoning is required.
Examples:

* "Which opportunity has stronger evidence?"
* "Why might these users be abandoning onboarding?"
* "What implementation approach satisfies this product requirement?"

Service
Used when deterministic execution is possible.
Examples:

* calculate budget
* validate JSON
* change state
* run tests
* build application
* scan secrets
* create audit event

Never use an LLM where deterministic software can reliably perform the operation.
4. Agent Types
The initial agent catalog should eventually include:

```text
DiscoveryAgent
ResearchAgent
OpportunityAnalysisAgent
ProductAgent
UXAgent
ArchitectureAgent
CodingAgent
BuildAgent
TestingAgent
SecurityAgent
ReleaseAgent
ASOAgent
MarketingAgent
GrowthAgent
AnalyticsAgent
MonitoringAgent
IterationAgent
```

Agents may be combined during early implementation when separation would create unnecessary complexity.
The architecture must preserve the ability to split them later.
5. Agent Responsibilities
DiscoveryAgent
Find potential problems and application opportunities.
Produces:

```text
OpportunityCandidate[]
```

It must not approve opportunities.
ResearchAgent
Collect evidence about a candidate.
Produces:

```text
ResearchRecord
```

It must distinguish source evidence from generated analysis.
OpportunityAnalysisAgent
Transforms research into a structured opportunity assessment.
Produces:

```text
OpportunityAnalysis
```

It may calculate or request deterministic calculations but must not invent measurements.
ProductAgent
Produces the product specification after opportunity approval.
It defines:

* MVP
* user flows
* features
* non-goals
* acceptance criteria
* privacy requirements
* analytics requirements

UXAgent
Produces UX recommendations and screen specifications.
It should operate within the approved product scope.
It must not silently add major functionality.
ArchitectureAgent
Produces or reviews technical architecture for the application.
It must respect:

* approved product scope
* factory templates
* security requirements
* platform constraints

CodingAgent
Creates or modifies application source code.
The CodingAgent should operate through controlled repository tools.
It must not directly modify lifecycle state.
BuildAgent
Runs deterministic build operations.
It may analyze build failures using an LLM, but the actual build must be performed by deterministic tooling.
TestingAgent
Analyzes test failures and may propose or implement bounded fixes.
Test execution itself remains deterministic.
SecurityAgent
Analyzes security results and identifies security risks.
Security scanners should perform deterministic checks where possible.
ReleaseAgent
Prepares release artifacts and metadata.
It must not publish unless explicitly authorized.
ASOAgent
Generates and analyzes:

* title
* short description
* long description
* keywords
* screenshot messaging
* store positioning

Claims must be evidence-based.
MarketingAgent
Produces distribution assets such as:

* landing-page copy
* social posts
* community posts
* short-video scripts
* campaign concepts

GrowthAgent
Analyzes acquisition and product metrics.
It produces recommendations rather than silently changing the product or spending money.
AnalyticsAgent
Analyzes structured metrics.
It must distinguish:

```text
Observed metric
Calculated metric
Interpretation
Hypothesis
Recommendation
```

MonitoringAgent
Detects significant changes in:

* crashes
* reviews
* ratings
* installs
* retention
* conversion
* infrastructure health

IterationAgent
Converts monitoring signals into proposed experiments or product changes.
Consequential changes require the appropriate approval gate.
6. Agent Contract
Every agent must expose a predictable contract.
Conceptually:

```text
Agent.run(
    task,
    context,
    tools,
    constraints
)
→ AgentResult
```

The implementation should define explicit types/interfaces.
7. Agent Result
An agent result should contain structured information such as:

```json
{
  "run_id": "uuid",
  "status": "SUCCESS",
  "output": {},
  "artifacts": [],
  "tool_calls": [],
  "warnings": [],
  "errors": [],
  "usage": {},
  "cost": {}
}
```

The exact schema belongs in the schemas directory.
8. Context Construction
Agents should receive only the context required for their task.
Context may include:

* current application state
* relevant product specification
* relevant research
* relevant files
* relevant previous agent outputs
* tool results
* applicable policies

Do not automatically send the entire repository or entire audit log to every agent.
9. Context Trust Levels
Inputs should be conceptually classified as:

```text
TRUSTED_SYSTEM
TRUSTED_HUMAN
VERIFIED_DATA
EXTERNAL_DATA
AGENT_OUTPUT
UNTRUSTED_CONTENT
```

Lower-trust content must never automatically override higher-priority system instructions or permissions.
10. Tool Calling
Agents request tools.
They do not directly execute tools.
Flow:

```text
Agent
 ↓
Tool request
 ↓
Schema validation
 ↓
Permission check
 ↓
Budget check
 ↓
Execution
 ↓
Result validation
 ↓
Audit
 ↓
Agent observation
```

11. Agent Loops
Agent loops must be bounded.
Required controls:

```text
max_iterations
max_runtime
max_tool_calls
max_cost
max_consecutive_failures
```

When a limit is reached:

```text
STOP
 ↓
persist current state
 ↓
record failure/limit
 ↓
return control to orchestrator
```

Never continue indefinitely.
12. Agent Handoffs
Agents may hand work to another agent only through the orchestrator.
Example:

```text
ResearchAgent
      ↓
ResearchRecord
      ↓
Orchestrator
      ↓
OpportunityAnalysisAgent
```

Agents must not directly invoke arbitrary agents.
13. Approval Boundaries
Agents may prepare approval packages.
They may not approve them.
Example:

```text
OpportunityAnalysisAgent
        ↓
OpportunityReady
        ↓
AWAITING_OPPORTUNITY_APPROVAL
        ↓
HUMAN
```

14. Agent Memory
Do not create unrestricted persistent agent memory.
Persist only useful structured state:

* task results
* artifacts
* decisions
* relevant observations
* audit events

Long-term knowledge should be explicitly stored in the factory's knowledge/data layer.
15. Agent Prompting
Agent prompts should be versioned where practical.
A production agent execution should record:

* agent version
* prompt/template version
* model
* model parameters
* tool configuration
* relevant context identifiers

This supports reproducibility.
16. Agent Failure
Agent failures must be explicit.
Examples:

```text
MODEL_TIMEOUT
MODEL_ERROR
INVALID_OUTPUT
SCHEMA_FAILURE
TOOL_FAILURE
PERMISSION_DENIED
BUDGET_EXCEEDED
MAX_ITERATIONS
HUMAN_REQUIRED
```

Do not convert an agent failure into a successful lifecycle state.
17. Agent Security
Agents must be treated as potentially unreliable and potentially manipulable.
External content may contain:

* prompt injection
* malicious instructions
* misleading data
* malicious code
* fake tool instructions

External content must never grant permissions.
18. Agent Quality
Agent quality should be evaluated using measurable criteria appropriate to the task.
Examples:
Research:

* evidence completeness
* source quality
* citation validity

Coding:

* build success
* tests
* static analysis
* regression rate

Security:

* finding accuracy
* false-positive rate
* coverage

Marketing:

* factual accuracy
* policy compliance
* content quality

19. Agent Architecture Invariants

1. Agents cannot approve their own work.
2. Agents cannot bypass the state machine.
3. Agents cannot directly mutate lifecycle state.
4. Agents cannot grant themselves permissions.
5. Agent output is untrusted until validated.
6. Agent loops are bounded.
7. Tool calls are controlled.
8. Important agent executions are auditable.
9. Model providers are replaceable.
10. Deterministic operations remain outside the LLM.

---

## Reconciliation with current implementation (as of 2026-09-21)

**None of the agent catalog, agent contract, agent runtime, or orchestrator described above exists as factory infrastructure.** This is expected — `factory/ROADMAP.md` places automated engineering (Phase 3), automated QA/security (Phase 4), and everything downstream in later phases, and `factory/docs/00-VISION.md`/`01-GOALS-AND-NON-GOALS.md` both frame this as a progressive-automation target, not a Phase 1 requirement. This section exists so that gap is stated plainly rather than left ambiguous.

### What "the agent" actually is today

There is exactly one "agent" in the running system: **this interactive Claude Code session**, invoked directly by the human operator (via terminal / this chat). It is not addressable as `DiscoveryAgent`, `ResearchAgent`, `CodingAgent`, etc. — it is one general-purpose reasoning process that the human directs to do research, write specs, write code, or write documentation, turn by turn. Concretely, for the one opportunity that has gone through the factory so far (`household-help-wage-tracker` / Hisaab):

- **§5 DiscoveryAgent / ResearchAgent role**: performed by this session running `WebSearch` calls directly, with the human then reviewing and approving the synthesized opportunity record. No `OpportunityCandidate[]`/`ResearchRecord` schema-conformant artifact was produced separately from the opportunity JSON itself.
- **§5 ProductAgent / UXAgent / ArchitectureAgent role**: performed by this session writing `PRD.md`, `USER_FLOWS.md`, `FEATURES.md`, `ARCHITECTURE.md` directly as Markdown files, immediately after opportunity approval — without the `AWAITING_SPEC_APPROVAL` gate in `factory/dashboard/lib/stateMachine.js` actually being exercised via a dashboard click (recorded honestly in `factory/state/audit-log.jsonl`'s migration entry).
- **§5 CodingAgent role**: performed by this session directly writing Kotlin/Gradle source into `apps/household-help-wage-tracker/`. There is no controlled repository tool boundary between "the agent" and "the filesystem" — this session has direct Write/Edit/Bash access to the whole repository, not a scoped `filesystem.write` tool restricted to that app's directory (see `factory/docs/09-TOOL-ARCHITECTURE.md`'s reconciliation for more on this).
- **§5 BuildAgent / TestingAgent / SecurityAgent role**: performed by this session running `gradle`, `gitleaks`, and a standalone Kotlin compiler directly via Bash — not through a `android.build`/`security.gitleaks` tool abstraction with its own schema/permission/audit wrapper. The actual Gradle build could not run at all in this environment (`factory/ANDROID_TOOLCHAIN.md`); what testing/security work *was* done (13/13 unit tests via a standalone Kotlin compiler, a real `gitleaks` scan) was still just this session running shell commands directly, not a `BuildAgent`/`TestingAgent`/`SecurityAgent` calling a tool layer.
- **§5 ReleaseAgent / ASOAgent / MarketingAgent / GrowthAgent / AnalyticsAgent / MonitoringAgent / IterationAgent**: none of this work has happened yet (no app has reached `PUBLISHED`), so these roles are entirely unexercised, not just unformalized.

### Gaps against this document, named explicitly

| §  | Requirement | Current state |
|---|---|---|
| §2 Agent mental model (runtime controls the loop) | No agent runtime exists. This session's own tool-calling loop (Claude Code's harness) plays that role today, but it is a general-purpose coding assistant loop, not a factory-owned, factory-configured agent runtime with the constraints this document describes. |
| §4 Agent catalog | None of these 17 agent types exist as separate, addressable components. |
| §6/§7 Agent contract / AgentResult schema | Does not exist. No `run_id`, no structured `AgentResult` JSON is produced or stored anywhere for any past work. |
| §8/§9 Context construction / trust levels | Not implemented. This session receives whatever context the human/conversation provides; there is no factory-level context-scoping or trust-labeling mechanism. |
| §10 Tool calling boundary | Does not exist as described — see `09-TOOL-ARCHITECTURE.md` reconciliation. |
| §11 Bounded agent loops | **Partially true only by policy, not enforcement.** `apps/household-help-wage-tracker/TEST_PLAN.md` documents a "max 5-10 build-fix iterations" policy from the original Phase 1 instructions, but no code enforces `max_iterations`/`max_runtime`/`max_cost`/`max_consecutive_failures` for this session's own work — the actual bound in practice was the human's own patience/direction, not a technical control. |
| §12 Agent handoffs via orchestrator | No orchestrator exists (see `04-ARCHITECTURE.md` reconciliation), so there is nothing to hand off through — one session did all roles sequentially. |
| §13 Approval boundaries | **This part is real and enforced.** The one piece of this document already true in code: `factory/dashboard/lib/stateMachine.js` rejects any `AWAITING_*`-exiting transition attempted by an `AGENT` actor (verified by test during the dashboard's development). Whatever eventually becomes "the ResearchAgent" or "the CodingAgent" will inherit this same enforcement for free, since it lives in the state machine, not in agent code. |
| §14 Agent memory | No persistent agent memory exists beyond the ordinary git history and the audit log — which is arguably fine per this section's own "persist only useful structured state" guidance, but there's no `run_id`-addressable memory store to evaluate against this document's intent either way. |
| §15 Prompt versioning | Not applicable yet — there are no separately-versioned agent prompts, since there are no separate agents. This session's own system prompt is managed by the Claude Code product, outside this repository. |
| §16 Agent failure taxonomy | Not implemented. Failures in this project so far (the Android toolchain being blocked) were reported in prose (`factory/ANDROID_TOOLCHAIN.md`, the release-candidate report) rather than as a structured `MODEL_TIMEOUT`/`TOOL_FAILURE`/etc. failure code. |
| §17 Agent security (prompt injection etc.) | Not implemented as a defense — this session applies ordinary judgment when reading external content (e.g., competitor listings, search results) but there is no factory-level mechanism enforcing that external data can't influence permissions or approvals. Nothing in this project's history has tested this boundary adversarially. |
| §18 Agent quality metrics | Not tracked. No measurable evaluation criteria have been computed for any of the work done so far (e.g., no tracked "evidence completeness" score for the Hisaab research). |
| §19 Invariants 1–4, 6–8, 10 | Invariant 1 (cannot approve own work) and invariant 3 (cannot directly mutate lifecycle state) are enforced today via the state machine/service layer, as noted in §13 above. Invariants 2 (cannot bypass the state machine — true, because there is nothing else mutating state), 4 (cannot grant own permissions — vacuously true, no permission system exists to grant from), 6 (bounded loops), 7 (controlled tool calls), 8 (auditable executions), and 10 (deterministic ops outside the LLM, partially true only for state transitions) are **not enforced by dedicated agent infrastructure**, because that infrastructure doesn't exist yet. |
| §19 Invariant 9 (model providers replaceable) | **Not true today.** See `08-MODEL-ROUTING.md`'s reconciliation — there is exactly one model/provider in use, invoked outside factory code entirely. |

### What this means going forward

This document describes the target shape of a multi-agent system that does not exist yet. Building any part of it — even a single named agent wrapper around what this session already does — is explicitly out of scope for this pass, per this session's instructions. The next concrete, low-risk step toward this architecture (not undertaken here) would likely be formalizing an `AgentResult`-shaped record for whatever work is done next, so future agent-catalog work has real data to build from rather than starting from zero.
