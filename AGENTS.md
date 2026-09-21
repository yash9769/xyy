AGENTS.md — App Factory Engineering Contract
1. Mandatory Reading
Before modifying the App Factory, read:

```text
factory/docs/00-VISION.md
factory/docs/01-GOALS-AND-NON-GOALS.md
factory/docs/03-PRINCIPLES.md

```

Also read the relevant phase specification and architecture documents before implementing a phase.
If an applicable specification does not exist, do not invent a large architecture. Create or request the specification first.
2. Existing System Is Authoritative
Before creating new code:

1. inspect the repository
2. inspect existing services
3. inspect existing state-machine behavior
4. inspect existing schemas
5. inspect existing tests
6. inspect existing documentation

Do not recreate functionality that already exists.
3. Do Not Invent Requirements
Do not invent:

* states
* APIs
* files
* database structures
* permissions
* tool capabilities
* provider behavior
* external API behavior
* test results
* security results
* research evidence

If required information is unavailable, explicitly identify the missing information.
4. Preserve the Approval Architecture
Never weaken, bypass, simulate, or remove human approval gates unless the specification explicitly changes the policy and the change itself is approved.
An AI agent must never act as a HUMAN approval actor.
5. State Machine Rules
Lifecycle state must only be changed through the authoritative service layer.
Never mutate state directly from:

* UI
* CLI
* agent code
* n8n
* scripts
* tests
* external integrations

All lifecycle transitions must be validated by the state machine.
6. Agent Rules
Agents are untrusted reasoning components.
Never assume:

* their output is correct
* their JSON is valid
* their research is factual
* their code is secure
* their commands are safe
* their conclusions are correct

Validate agent outputs before execution.
7. Tool Rules
Every tool must have:

* explicit input schema
* explicit output schema
* permission requirements
* error behavior
* timeout where applicable
* audit behavior where applicable

Default permission:

```text
DENY

```

8. Model Rules
Never hard-code one LLM provider into application/business logic.
Use the model abstraction/router.
Provider-specific configuration belongs in configuration, not scattered throughout the codebase.
9. Code Quality
Every implementation should prioritize:

* small modules
* explicit interfaces
* strong typing where appropriate
* clear error handling
* testability
* deterministic behavior
* minimal duplication
* minimal unnecessary dependencies

Do not create abstractions without a concrete reason.
10. Testing
Every meaningful code change requires appropriate tests.
At minimum, test:

* success path
* expected failure path
* authorization behavior where relevant
* schema validation where relevant
* state transitions where relevant
* boundary conditions

Do not claim a test passed unless it was actually executed.
11. Security
Never:

* expose secrets in source code
* commit API keys
* disable security checks merely to make a build pass
* grant broad permissions for convenience
* execute untrusted generated code with unrestricted host privileges

Security failures must remain visible.
12. Autonomous Loops
Every automated loop must have:

* maximum iterations
* timeout
* failure handling
* observable progress
* termination condition

No infinite repair/retry loops.
13. External Side Effects
Before implementing an external side effect, determine:

* required permission
* approval requirement
* authentication mechanism
* rollback behavior
* audit requirement
* failure behavior

Examples:

* Git push
* deployment
* publishing
* advertising
* spending
* deleting external resources

14. Documentation
When architecture or behavior changes:

1. update the relevant documentation
2. update schemas if applicable
3. update tests
4. document important decisions

Do not leave known documentation contradictions unresolved.
15. Phase Discipline
Only implement the requested phase.
Do not opportunistically implement unrelated future features.
If future work is discovered, record it in the roadmap/backlog rather than silently expanding scope.
16. Change Discipline
Prefer small, reviewable changes.
Before modifying an existing subsystem:

```text
Understand
→ Test
→ Modify
→ Test
→ Review

```

Avoid broad rewrites unless explicitly required.
17. Completion Criteria
Do not declare a task complete until:

* implementation exists
* relevant tests run
* tests pass or failures are explicitly reported
* lint/static checks run where applicable
* documentation is updated where necessary
* no known requirement has been silently skipped

18. Honesty Rule
Never claim:

* "implemented" when only designed
* "tested" when not tested
* "secure" without performing the relevant checks
* "published" without verification
* "working" based solely on generated code
* "approved" without a valid HUMAN approval event

Report blockers directly.
19. When Uncertain
Use this decision order:

```text
1. Read the specification.
2. Inspect existing code.
3. Inspect tests.
4. Search the repository.
5. Determine whether the requirement can be established from evidence.
6. If not, stop and ask rather than inventing.

```

20. Primary Objective
Build a factory that is:

```text
Reliable
Observable
Secure
Auditable
Model-independent
Cost-controlled
Testable
Maintainable
Repeatable

```

Do not optimize for the appearance of autonomy.
Optimize for controlled, verifiable automation.
