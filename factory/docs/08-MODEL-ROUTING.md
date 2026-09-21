App Factory — Model Routing
1. Purpose
The Model Router provides a provider-independent interface between App Factory agents and language models.
The factory must be able to change models without rewriting agent logic.
2. Architecture

```text
Agent
  ↓
Model Router
  ↓
Task Classification
  ↓
Provider Selection
  ↓
Model
  ↓
Normalized Response
  ↓
Agent
```

3. Provider Independence
Supported providers may include:

* OpenAI-compatible APIs
* Anthropic-compatible APIs
* hosted open-weight models
* self-hosted vLLM
* RunPod
* local inference
* other compatible providers

The exact providers are configuration.
No agent should contain hard-coded provider-specific business logic.
4. Model Selection
Model selection should consider:

```text
task
quality requirement
context size
latency
availability
cost
tool support
structured-output support
coding capability
reasoning capability
```

Example:

```yaml
tasks:

  simple_classification:
    quality: low
    cost: minimal

  research:
    quality: medium-high

  opportunity_analysis:
    quality: high

  coding:
    quality: high
    coding_capability: required

  architecture:
    quality: very_high

  marketing_copy:
    quality: medium
```

These are routing policies, not permanent model choices.
5. Configuration
Model configuration should support:

```text
provider
model
base_url
api_key_reference
temperature
max_tokens
timeout
max_cost
supports_tools
supports_structured_output
```

Secrets must never be stored directly in source code.
6. Normalized Interface
Conceptually:

```text
modelRouter.generate(request)
```

Request:

```text
task_type
messages
tools
response_schema
constraints
```

Response:

```text
content
tool_calls
usage
model
provider
latency
cost
finish_reason
```

The exact implementation belongs in the model-runtime specification.
7. Cost Tracking
Every model execution should attempt to record:

```text
input_tokens
output_tokens
total_tokens
estimated_cost
actual_cost where available
provider
model
```

When the provider does not expose cost, the system may calculate an estimate from configured pricing.
Estimated cost must be labeled as estimated.
8. Budget Enforcement
The Model Router must support budget checks.
Example:

```text
Application budget
        ↓
Model call requested
        ↓
estimated cost
        ↓
remaining budget?
      /       \
    YES        NO
     ↓          ↓
 execute      reject
```

The router must not silently exceed configured budgets.
9. Fallback
Fallback models may be configured.
Example:

```yaml
coding:
  primary: MODEL_A
  fallback:
    - MODEL_B
    - MODEL_C
```

Fallback rules must define which failures permit fallback.
Example:
Allowed:

```text
provider unavailable
timeout
temporary API error
```

Potentially not allowed:

```text
invalid reasoning result
security failure
budget exceeded
policy restriction
human approval required
```

A fallback must never be used to bypass an authorization or approval requirement.
10. Model Capability Registry
The router should maintain capability metadata.
Example:

```yaml
model: example-model

capabilities:
  coding: true
  reasoning: true
  tools: true
  structured_output: true
  vision: false

limits:
  context_tokens: 128000
```

The router uses capability metadata to avoid assigning unsupported tasks.
11. Structured Outputs
Where supported, models should produce schema-constrained outputs.
All responses must still be validated after receipt.
Model support for structured output does not eliminate validation.
12. Prompt Versioning
Prompts/templates used in production agent runs should be versioned.
Record:

```text
prompt_id
prompt_version
model
provider
parameters
```

This enables debugging when model behavior changes.
13. Model Observability
Track:

* request count
* success rate
* latency
* token usage
* cost
* timeout rate
* schema failure rate
* tool-call failure rate
* fallback rate

These metrics should be available to the factory.
14. Model Evaluation
Before changing a primary model for a critical task, evaluate it against representative factory tasks.
Evaluation should consider:

```text
quality
accuracy
tool reliability
structured-output reliability
coding success
latency
cost
failure rate
```

Do not select a model solely because it has a higher benchmark score.
15. Local vs Cloud Inference
The architecture must support both.
Local
Useful for:

* cheap classification
* embeddings
* privacy-sensitive low-complexity tasks
* development
* offline operation

Cloud
Useful for:

* large models
* coding
* complex reasoning
* high-context tasks

The agent must not care where the model is physically running.
16. Model Failure Isolation
A provider failure must not corrupt application lifecycle state.
Example:

```text
Model timeout
    ↓
Agent run FAILED
    ↓
Orchestrator handles failure
    ↓
Lifecycle remains unchanged
```

Never:

```text
Model timeout
    ↓
assume success
    ↓
advance lifecycle
```

17. Model Routing Invariants

1. Agents use the model router.
2. Providers are configuration.
3. Secrets are externalized.
4. Model output is untrusted.
5. Costs are tracked.
6. Budgets are enforced.
7. Fallback cannot bypass authorization.
8. Model failure cannot advance lifecycle state.
9. Critical model changes should be evaluated.
10. Provider-specific logic stays inside the provider adapter.

---

## Reconciliation with current implementation (as of 2026-09-21)

**No model router exists. There is exactly one model/provider in use, and factory code never calls it directly.**

### What actually happens today

The only "model call" in this entire project is the interactive Claude Code session itself — invoked by the human operator through the Claude Code product (terminal or this chat), configured entirely outside this repository (model choice, API key, base URL are all managed by Claude Code / the user's Anthropic account, not by any file under `factory/`). No file in this repository selects a model, calls a model API, or normalizes a model response. `factory/dashboard/`, `factory/cli/`, and `factory/orchestration/pipeline.py` contain zero LLM calls — they are pure state-machine/file-I/O code, by design (see `factory/ARCHITECTURE.md` §7 "AI vs deterministic code": "No automated LLM API calls are wired into the CLI itself... Claude Code (this tool) *is* the AI layer, invoked by the human").

This means `factory/docs/00-VISION.md` §7 ("Model Independence... The application code must communicate with models through a model abstraction/router rather than directly embedding provider-specific assumptions") is **not satisfied** — not because a different provider is hard-coded in, but because there is no factory-owned model-calling code at all yet to be provider-coupled or provider-independent. The gap is total, not partial.

### Section-by-section status

| § | Requirement | Current state |
|---|---|---|
| §2 Router architecture | Does not exist. |
| §3 Provider independence | Trivially "satisfied" only in the sense that nothing is hard-coded — but that's because nothing calls a model API from factory code, not because an abstraction was built and kept provider-agnostic. |
| §4 Model selection by task | Does not exist. There is one model for every task (research, writing, coding, review) — this session — selected by the human choosing which Claude Code session to run, not by factory policy. |
| §5 Model configuration schema | Does not exist as a factory config file. `factory/config/` currently holds only `scoring-weights.yaml` and `kill-criteria.yaml` (business thresholds), nothing model-related. |
| §6 Normalized request/response interface | Does not exist. |
| §7 Cost tracking | **Not implemented for model usage.** `COST_MODEL.md` tracks *infrastructure* cost (aiming for $0/month) and explicitly treats "Claude Code usage itself" as an existing subscription cost, out of scope for that document's accounting — it does not track per-task token usage, estimated cost per opportunity, or per-app model spend anywhere. |
| §8 Budget enforcement | Does not exist. Nothing has ever rejected a task for exceeding a model budget, because no budget is tracked. |
| §9 Fallback | Not applicable — there is one model, no fallback chain is configured or possible today. |
| §10 Capability registry | Does not exist. |
| §11 Structured outputs + validation | **Partially analogous, informally.** This session does sometimes validate its own output against `schemas/*.json` by hand (e.g., checking required fields before writing an `opportunity.json`), but there is no automated schema-validation step wired into any pipeline — a human/this session remembering to check is not the same as the enforced validation this document requires. |
| §12 Prompt versioning | Not applicable — no separate, versioned prompts exist outside Claude Code's own system prompt (managed by the product, not this repo). |
| §13 Model observability | Not tracked anywhere in this repository. |
| §14 Model evaluation before switching | Not applicable — no switching mechanism exists to evaluate before using. |
| §15 Local vs. cloud inference | Not implemented. Only cloud inference (this hosted session) has ever been used; no local/self-hosted model has been wired in or evaluated. |
| §16 Model failure isolation | **Partially true, incidentally.** When this session hit the Android toolchain blocker, it did not "pretend success" — it stopped and reported the blocker (`factory/ANDROID_TOOLCHAIN.md`, the release-candidate report). But that was this session's own judgment/instruction-following, not a factory-level `Model timeout → Agent run FAILED → lifecycle remains unchanged` mechanism enforced independent of the model's cooperation. If a future, less-careful model execution silently claimed success, nothing in the factory's code today would catch that — the state machine only validates *that a requested transition is legal*, not *that the claim backing it is true* (see `06-STATE-MACHINE.md`'s reconciliation on unenforced preconditions). |
| §17 Invariants 1–10 | None are enforced by dedicated infrastructure. Invariant 8 (model failure cannot advance lifecycle state) holds today only because failures have so far been reported by a cooperative session rather than caught by an independent check. |

### What this means going forward

Model routing is entirely greenfield. The one existing, load-bearing fact worth preserving when this is eventually built: **the factory's state machine and audit log were deliberately built to not know or care what produced a requested transition** (`factory/dashboard/lib/store.js` takes an `actor` string, not a model identity) — so introducing a model router later should not require changing `stateMachine.js` or `store.js` at all. The router would sit entirely upstream of them, inside whatever eventually becomes the "AGENT" actor's own infrastructure (see `07-AGENT-ARCHITECTURE.md`). No code changes were made in this pass to move toward this.
