App Factory State Machine
App Factory — State Machine Specification
1. Purpose
This document defines the authoritative lifecycle state machine.
The state machine is the primary control mechanism for application lifecycle transitions.
No UI, CLI, agent, n8n workflow, or external integration may bypass it.
2. Actor Types
The factory recognizes three actor classes:

```
HUMAN
AGENT
SYSTEM
```

HUMAN
The application owner/operator.
Can perform human approval transitions.
AGENT
AI-driven reasoning component.
Can perform only transitions explicitly permitted for agents.
An agent can never satisfy a HUMAN-only transition.
SYSTEM
Deterministic factory infrastructure.
Can perform only system-authorized transitions.
3. State Naming
States should use explicit uppercase identifiers.
Approval states must use:

```
AWAITING_*
```

This makes approval boundaries obvious in code, logs, and tooling.
4. Canonical Lifecycle
The initial canonical lifecycle is:

```
DISCOVERED
    ↓
RESEARCHING
    ↓
ANALYZING
    ↓
OPPORTUNITY_READY
    ↓
AWAITING_OPPORTUNITY_APPROVAL
    ↓
APPROVED
    ↓
SPEC_GENERATING
    ↓
AWAITING_SPEC_APPROVAL
    ↓
BUILDING
    ↓
TESTING
    ↓
SECURITY_REVIEW
    ↓
RELEASE_CANDIDATE
    ↓
AWAITING_RELEASE_APPROVAL
    ↓
PUBLISHING
    ↓
PUBLISHED
    ↓
DISTRIBUTING
    ↓
MONITORING
```

Post-publication states:

```
MONITORING
    ├── ITERATION_PROPOSED
    ├── PAUSED
    └── KILLED

ITERATION_PROPOSED
    ↓
AWAITING_ITERATION_APPROVAL
    ↓
ITERATING
    ↓
TESTING
```

The implementation may add operational states such as failure/retry states if required.
Any added state must be documented and tested.
5. State Definitions
DISCOVERED
An opportunity candidate exists but has not yet entered structured research.
Allowed actors:

```
SYSTEM
AGENT
HUMAN
```

RESEARCHING
Evidence collection is in progress.
Allowed transition into this state:

```
DISCOVERED → RESEARCHING
```

ANALYZING
Research is being converted into structured opportunity analysis.
OPPORTUNITY_READY
The opportunity package is complete enough for human review.
Required:

* research record
* evidence
* analysis
* proposed solution
* distribution assessment
* cost estimate
* risks

AWAITING_OPPORTUNITY_APPROVAL
Human decision required.
Allowed exit actors:

```
HUMAN ONLY
```

Allowed outcomes:

```
APPROVED
RESEARCHING
REJECTED
```

A rejection or research request must contain the appropriate audit information.
APPROVED
Opportunity has received valid human approval.
No agent-generated approval can create this state.
SPEC_GENERATING
Product specification is being generated (Phase 5 ProductAgent; entered via `START_SPEC`, left via the AGENT-only `SUBMIT_SPEC_FOR_APPROVAL`).
AWAITING_SPEC_APPROVAL
Human review of the product specification.
Allowed exit actor:

```
HUMAN ONLY
```

Possible outcomes (as implemented in `stateMachine.js`):

```
BUILDING   (APPROVE_SPEC, HUMAN)
REJECTED   (REJECT_SPEC, HUMAN)
```

There is no "revise and resubmit" outcome: `REJECT_SPEC` is terminal. A revision loop (e.g. a HUMAN-only `REQUEST_SPEC_REVISION` back to `APPROVED`) would be a state-machine change requiring its own approval; it has not been added.

BUILDING
Application source is being created or modified.
TESTING
Automated tests and validation are running.
SECURITY_REVIEW
Security validation is running.
Required results depend on the security policy.
RELEASE_CANDIDATE
The application satisfies the configured release-candidate gates.
Minimum conditions:

```
required build succeeded
required tests passed
required security checks passed
required artifacts exist
no blocking failures
```

AWAITING_RELEASE_APPROVAL
Human must review the release candidate.
Allowed exit actor:

```
HUMAN ONLY
```

Possible outcomes:

```
PUBLISHING
BUILDING
SECURITY_REVIEW
```

depending on the reason for requested changes.
PUBLISHING
Publishing operation is executing.
Publishing failures must not be represented as successful publication.
PUBLISHED
Publication has been verified.
DISTRIBUTING
Distribution workflows are active.
Examples:

* ASO
* content
* organic acquisition
* paid acquisition

MONITORING
Application is live and metrics are being collected.
ITERATION_PROPOSED
The factory has identified a possible improvement and generated an evidence-backed proposal.
This is a proposal state, not an authorization state.
AWAITING_ITERATION_APPROVAL
Human approval is required for consequential product changes.
Allowed exit actor:

```
HUMAN ONLY
```

ITERATING
Approved changes are being implemented.
After iteration:

```
ITERATING
    ↓
TESTING
    ↓
SECURITY_REVIEW
    ↓
RELEASE_CANDIDATE
```

The application must pass normal quality gates again.
PAUSED
Application activity has been intentionally paused.
Recurring activities that should stop must be disabled.
KILLED
Application lifecycle is permanently terminated.
Historical data remains available.
No automatic process may revive a killed application.
6. Human-Only Transition Rule
The implementation must enforce:

```
if current_state starts with "AWAITING_":
    actor.type MUST equal "HUMAN"
```

The rule must be enforced in code.
It must not depend on:

* UI restrictions
* prompt instructions
* agent behavior
* CLI conventions

7. Illegal Transition Behavior
An illegal transition must:

1. reject the request
2. preserve current state
3. create an appropriate error/audit record where applicable
4. return a structured error
5. never partially execute the requested transition

Example:

```
AGENT attempts:

AWAITING_RELEASE_APPROVAL
        ↓
PUBLISHING

Result:

REJECTED
reason = HUMAN_APPROVAL_REQUIRED
```

8. Transition Contract
Every transition should be represented conceptually as:

```
{
  "transition_id": "uuid",
  "resource_id": "app-or-opportunity-id",
  "from_state": "CURRENT_STATE",
  "to_state": "TARGET_STATE",
  "actor_type": "HUMAN|AGENT|SYSTEM",
  "actor_id": "actor-id",
  "timestamp": "ISO-8601",
  "reason": "optional",
  "metadata": {}
}
```

9. Preconditions
A transition may define preconditions.
Example:

```
RELEASE_CANDIDATE
        ↓
AWAITING_RELEASE_APPROVAL
```

requires:

```
build artifact exists
required tests passed
security review complete
release metadata exists
no blocking issue
```

Preconditions must be evaluated deterministically wherever possible.
10. Postconditions
After a successful transition:

* state must equal target state
* audit event must exist
* required artifacts must exist
* required side effects must be verified

11. Audit Requirement
Every successful lifecycle transition must generate an append-only audit event.
Minimum information:

```
timestamp
actor
resource
from state
to state
reason
metadata
```

Approval transitions must additionally record:

```
human actor identity
decision
approval/rejection reason where applicable
```

12. Idempotency
Repeated execution of an already completed transition must not corrupt state.
Where an operation has external side effects, the implementation should use idempotency mechanisms where supported.
Example:
Calling:

```
PUBLISH
```

twice must not accidentally create two independent releases.
13. Concurrency
Concurrent lifecycle transitions must be prevented or safely serialized.
Example:

```
Two agents attempt:

TESTING → SECURITY_REVIEW
```

Only one valid transition may succeed.
The second operation must receive a deterministic result rather than corrupting state.
14. Recovery
A failed operation must not automatically advance lifecycle state.
Example:

```
BUILDING
   ↓
build fails
   ↓
remain BUILDING
```

unless a documented failure/retry state is implemented.
Never:

```
build fails
   ↓
pretend success
   ↓
TESTING
```

15. Testing Requirements
The state machine must have automated tests for:
Valid transitions
Every documented legal transition.
Invalid transitions
Examples:

```
DISCOVERED → PUBLISHED
BUILDING → PUBLISHED
MONITORING → BUILDING
```

Actor enforcement
Examples:

```
AGENT → AWAITING_* exit = reject
SYSTEM → AWAITING_* exit = reject
HUMAN → AWAITING_* exit = allowed if preconditions pass
```

Preconditions
Invalid release candidates must not reach approval/publishing.
Idempotency
Repeated transitions must not corrupt state.
Concurrency
Concurrent transition attempts must behave deterministically.
16. State Machine Invariants
The following are non-negotiable:

```
1. State can only change through the state machine.
2. Every transition has an actor.
3. Every transition is auditable.
4. AWAITING_* exits require HUMAN.
5. Invalid transitions are rejected.
6. Failed operations do not become successful states.
7. Preconditions are enforced.
8. External side effects are not assumed successful without verification.
9. State cannot be silently rewritten.
10. KILLED applications cannot automatically resume.
```

17. Implementation Rule
The state machine must remain small, explicit, deterministic, and easy to test.
Do not embed LLM reasoning inside transition validation.
The LLM may propose:

```
"Move opportunity to OPPORTUNITY_READY."
```

The deterministic state machine decides:

```
Is this transition legal?
Are preconditions satisfied?
Is this actor authorized?
```

Only then may the transition occur.

---

## Reconciliation with current implementation (as of 2026-09-21)

**The current source of truth is `factory/dashboard/lib/stateMachine.js`, not the canonical model in §4–5 above.** Per this session's instructions, the existing implementation is preserved as-is; migrating to the canonical model below is an explicitly separate, future, human-approved phase. This section exists so that difference is never silently lost or assumed away.

### State set comparison

| This document's canonical states (22) | Implemented states in `stateMachine.js` (19) |
|---|---|
| `DISCOVERED` | `DISCOVERED` — same |
| `RESEARCHING` | `RESEARCHING` — same |
| `ANALYZING` | *(none — no equivalent state)* |
| `OPPORTUNITY_READY` | *(none — no equivalent state; implementation has `RESEARCH_COMPLETE` instead, which plays a similar "ready to submit" role but is named and positioned differently)* |
| `AWAITING_OPPORTUNITY_APPROVAL` | `AWAITING_OPPORTUNITY_APPROVAL` — same name, reached via `RESEARCH_COMPLETE` directly rather than through `ANALYZING`/`OPPORTUNITY_READY` |
| `APPROVED` | `APPROVED` — same |
| `SPEC_GENERATING` (previously named `SPECIFYING` in this document) | `SPEC_GENERATING` — same; this document was aligned to the implemented name in Phase 5 |
| `AWAITING_SPEC_APPROVAL` | `AWAITING_SPEC_APPROVAL` — same |
| `BUILDING` | `BUILDING` — same |
| `TESTING` | `TESTING` — same |
| `SECURITY_REVIEW` | `SECURITY_REVIEW` — same |
| `RELEASE_CANDIDATE` | `RELEASE_CANDIDATE` — same name, but the implementation does **not** currently enforce this document's §5 precondition list (build succeeded, tests passed, etc.) before entering this state — see the "Preconditions are not yet enforced" gap below |
| `AWAITING_RELEASE_APPROVAL` | `AWAITING_RELEASE_APPROVAL` — same |
| `PUBLISHING` | *(none — no equivalent state)* |
| — *(not in canonical list as a distinct pre-publish gate)* | `INTERNAL_TEST` — implemented, no canonical equivalent; reflects Play Console's internal/closed/production track distinction from the original Phase 0 architecture, reached via `APPROVE_RELEASE` from `AWAITING_RELEASE_APPROVAL` |
| — | `AWAITING_PRODUCTION_APPROVAL` — implemented, no canonical equivalent; the actual second human gate before `PUBLISHED` (this document's `PUBLISHING`→`PUBLISHED` collapses to a single step in the implementation, but gains this extra approval gate instead) |
| `PUBLISHED` | `PUBLISHED` — same |
| `DISTRIBUTING` | *(none — no equivalent state)* |
| `MONITORING` | `MONITORING` — same |
| `ITERATION_PROPOSED` | `ITERATION_PROPOSED` — same |
| `AWAITING_ITERATION_APPROVAL` | *(none — implementation goes straight from `ITERATION_PROPOSED` to the `APPROVE_ITERATION`/`DECLINE_ITERATION` actions without a separately named awaiting state; the awaiting-approval semantics exist, the extra named state does not)* |
| `ITERATING` | *(none — implementation's `APPROVE_ITERATION` action transitions directly back to `APPROVED`, reusing the existing `APPROVED → SPEC_GENERATING → ... → BUILDING` pipeline rather than having a dedicated `ITERATING` state)* |
| `PAUSED` | `PAUSED` — same |
| `KILLED` | `KILLED` — same |
| — | `REJECTED` — implemented as an explicit terminal state (this document mentions `REJECTED` only as a transition outcome in §7/§9, not as a numbered canonical state in §4) |

### Other implementation differences worth naming explicitly

- **Actor sets differ slightly.** The implementation's `START_RESEARCH`, `START_SPEC`, and `SUBMIT_FOR_PRODUCTION_APPROVAL` actions currently allow **both** `AGENT` and `HUMAN` as actors (see `stateMachine.js`'s `TRANSITIONS` table), where this document's model implies these should be agent/system-only steps a human wouldn't normally trigger directly. This was a pragmatic Phase-1 choice (there is no automated agent loop yet, so a human sometimes has to trigger these transitions manually) rather than a considered policy decision — flagged here, not changed.
- **Preconditions are not yet enforced.** §9 of this document requires `RELEASE_CANDIDATE`'s preconditions (build artifact exists, tests passed, security review complete) to be checked before the transition is allowed. The current `stateMachine.validate()` only checks "is this action legal from this state for this actor" — it has no concept of preconditions beyond that. This is exactly how Hisaab reached `RELEASE_CANDIDATE` despite never having a successful build; the *state name* was reached without the state's real-world meaning being true. This is the most significant functional gap between this spec and the running code and should be prioritized whenever state-machine work resumes.
- **Audit event schema differs from §8/§11.** Implemented fields: `timestamp, actor, actorName, action, opportunityId, previousState, newState, reason?, note?`. Missing vs. this spec: `transition_id`/`event_id` (no UUID per entry), `metadata` (no free-form object), and the field is named `actor`/`actorName` rather than `actor_type`/`actor_id`. Functionally equivalent for today's purposes, not byte-compatible with this document's contract.
- **Idempotency (§12) and concurrency (§13) are untested.** The implementation is single-process, synchronous, file-based, and has one operator — there is no evidence of a concurrency bug, but there is also no test proving two simultaneous transitions behave deterministically, and no idempotency key exists for any transition.
- **No automated tests exist for the state machine itself (§15/P-026).** This session verified the invariants *manually* during development (illegal transitions rejected, wrong-actor attempts rejected — both confirmed via ad hoc CLI/HTTP calls, not a checked-in test suite). There is no `npm test` or equivalent that runs these checks on every change. This is a concrete, actionable gap against §15 and `factory/docs/03-PRINCIPLES.md` P-026.

### What this means going forward

Per this session's explicit instructions: **no code changes were made as part of writing this document.** `factory/dashboard/lib/stateMachine.js`'s 19 states and their transitions remain the authoritative, running implementation. Migrating toward this document's 22-state canonical model — adding `ANALYZING`/`OPPORTUNITY_READY`/`PUBLISHING`/`DISTRIBUTING`/`AWAITING_ITERATION_APPROVAL`/`ITERATING`, enforcing real preconditions on `RELEASE_CANDIDATE`, and adding a real automated test suite — is future work requiring its own explicit approval before implementation begins.
