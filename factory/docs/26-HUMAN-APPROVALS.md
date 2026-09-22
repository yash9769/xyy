Human Approval Architecture
1. Purpose
The App Factory is designed to automate execution while keeping consequential decisions under human control.
Human approval is therefore a formal system capability, not a conversational convention.
2. Core Principle
Automation may prepare a decision. Only an authorized human may approve a protected decision.
The factory must never simulate approval through:

* agent-generated approval;
* default approval;
* timeout-based approval;
* inferred user intent;
* previous approval;
* model confidence.

3. Protected Decisions
The exact policy is configurable, but protected decisions may include:

* selecting an opportunity;
* approving a product specification;
* publishing an application;
* spending money;
* launching advertising;
* executing destructive operations;
* accepting security exceptions;
* changing high-risk production configuration.

4. Approval Object
An approval must reference the exact object being approved.
Example:

```text
approval_id
object_type
object_id
object_version
decision
actor
timestamp
evidence
reason
```

This prevents approval from becoming detached from the artifact that was reviewed.
5. Version Binding
Approval should be bound to a specific version.
Example:

```text
ProductSpec v4
        ↓
HUMAN APPROVED
        ↓
ProductSpec v5 created
```

Approval for v4 must not automatically apply to v5.
6. Approval States
Possible states:

```text
PENDING
APPROVED
REJECTED
EXPIRED
SUPERSEDED
```

7. Approval Lifecycle

```text
Agent / Service prepares artifact
        ↓
Validation
        ↓
AWAITING_HUMAN_APPROVAL
        ↓
Human reviews
        ↓
APPROVE / REJECT / REQUEST_MORE_INFORMATION
```

The exact lifecycle must remain compatible with the authoritative state machine.
8. Evidence Presented to Humans
Approval interfaces should show enough evidence for an informed decision.
Examples:
Opportunity

* problem evidence;
* research;
* market assumptions;
* risks;
* estimated effort;
* distribution hypothesis.

Product Specification

* requirements;
* architecture;
* UX;
* privacy/security requirements;
* known unknowns.

Release

* build evidence;
* test results;
* security review;
* artifact;
* version;
* known issues;
* release notes.

9. Approval Quality
The system should avoid approval interfaces that encourage blind clicking.
A human should be able to identify:

* what is being approved;
* what changed;
* what evidence supports it;
* what remains unknown;
* what risks exist.

10. Rejection
Rejection should optionally capture a reason.
Useful rejection reasons include:

* insufficient evidence;
* wrong target user;
* unacceptable risk;
* cost too high;
* implementation quality;
* distribution concerns;
* strategic mismatch.

Reasons can improve future factory behavior.
11. Request More Information
A human should be able to request additional research instead of only approving or rejecting.
Example:

```text
AWAITING_APPROVAL
        ↓
NEED_MORE_RESEARCH
        ↓
RESEARCH
        ↓
UPDATED_ARTIFACT
        ↓
AWAITING_APPROVAL
```

12. Approval Expiration
Some approvals should expire.
Examples:

* old release candidate;
* outdated security review;
* campaign budget;
* temporary authorization.

Expiration policy should be explicit.
13. Multiple Approvals
High-risk operations may require multiple authorized humans.
The architecture should support:

* sequential approval;
* independent approval;
* role-based approval;
* quorum-based approval.

This is optional and should only be implemented when justified by risk.
14. Approval and Agents
Agents may:

* prepare recommendations;
* summarize evidence;
* identify risks;
* generate alternatives.

Agents may not:

* approve their own work;
* impersonate humans;
* modify approval records;
* bypass an approval gate.

15. Approval and Automation
After approval, automation may execute the approved action.
However, execution must remain bound to the approved object.
Example:

```text
Approved:
Release Candidate 17

Allowed:
Publish Release Candidate 17

Not automatically allowed:
Publish Release Candidate 18
```

16. Auditability
Every approval must generate an audit event.
The event should include:

* actor;
* object;
* decision;
* timestamp;
* object version;
* evidence reference.

17. Dashboard Requirements
The approval interface should provide:

* Action Required queue;
* object details;
* evidence;
* changes since previous version;
* risks;
* decision controls;
* rejection reason;
* request-more-information option;
* audit history.

18. Current Implementation
The current dashboard and state machine already implement human-gated transitions.
Future approval features must extend the existing service/state-machine architecture.
Do not create a second approval mechanism outside the authoritative service layer.
19. Non-Goals
This document does not require:

* multi-user enterprise RBAC immediately;
* biometric approval;
* cryptographic signatures;
* complex organizational approval workflows.

Those capabilities may be introduced later if required.

---

## Reconciliation with current implementation (as of 2026-09-22)

**The core mechanism this document cares most about — an agent cannot approve its own work — is real, enforced in code, and independently verified during this project.** What's missing is almost everything around that mechanism: version binding, expiration, evidence-diffing, and structured rejection-reason taxonomies for anything other than opportunity rejection.

### §2/§14 — the one requirement checked hardest, and confirmed true again

This is the single most load-bearing claim in this whole document series, so it is worth re-verifying rather than citing from memory: `factory/dashboard/lib/stateMachine.js`'s `validate()` function checks `edge.allowedActors.includes(actor)` for every transition, and every `AWAITING_*`-exiting transition's `allowedActors` array contains only `['HUMAN']`. This was directly tested during dashboard development (an `AGENT`-actor `APPROVE_OPPORTUNITY` attempt returned `"Actor 'AGENT' may not perform 'APPROVE_OPPORTUNITY' — only HUMAN may."`) and again via the HTTP API (a `KILL` attempt from an invalid state was rejected with a structured error, not silently accepted). No default approval, timeout-based approval, or inferred-intent approval exists anywhere in the codebase — every approval action requires an explicit `POST /api/opportunities/:id/transition` call or CLI invocation with `actor` resolved by the caller, and the dashboard's own frontend (`app.js`) never sends any actor other than the implicit `HUMAN` the server assigns to dashboard-originated requests.

### §4/§5 — Approval object and version binding: the clearest gap

**No version binding exists.** `opportunity.json` has no version number — a single mutable file is edited in place on every transition (`store.js`'s `writeJson()` overwrites the same path). This means:

- There is no way today to say "this approval was for the opportunity record *as it looked on 2026-09-18*, before evidence was added on 2026-09-19" — approving `AWAITING_OPPORTUNITY_APPROVAL` approves whatever the file currently contains, with no snapshot of what was actually reviewed.
- §5's example (`ProductSpec v4 approved; v5 created; approval does not carry over`) has no equivalent at all in this factory — there is no `ProductSpec` schema/version (per `10-DATA-MODELS.md`'s reconciliation; Hisaab's spec is seven separate Markdown files with no version numbers), so "does approval carry over to a new version" is not even an answerable question yet.
- This is a real, concrete gap worth prioritizing before this mechanism sees heavier use: today, nothing would prevent an opportunity's `evidence[]` array from being edited *after* approval without that being visible as a distinct, re-reviewable change — the audit log records that `APPROVE_OPPORTUNITY` happened, but not a hash or snapshot of what state was approved.

### §6/§7 — Approval states and lifecycle

**States exist, under different names, and the lifecycle matches structurally.** `AWAITING_OPPORTUNITY_APPROVAL`, `AWAITING_SPEC_APPROVAL`, `AWAITING_RELEASE_APPROVAL`, `AWAITING_PRODUCTION_APPROVAL` are this document's `PENDING` state, scoped per-decision-type rather than generic; `APPROVE_*`/`REJECT_*` actions produce this document's `APPROVED`/`REJECTED`. **`EXPIRED` and `SUPERSEDED` do not exist as concepts anywhere** — an opportunity can sit in `AWAITING_OPPORTUNITY_APPROVAL` indefinitely with no expiration, and there is no mechanism to mark an old, still-pending approval request as superseded by a newer one.

### §11 — Request More Information

**Implemented and exercised.** `NEED_MORE_RESEARCH` is a real action from `AWAITING_OPPORTUNITY_APPROVAL` back to `RESEARCHING`, `HUMAN`-only, present in the dashboard's `ACTION_LABELS` map (`app.js`) as a labeled button. This document's exact diagram (`AWAITING_APPROVAL → NEED_MORE_RESEARCH → RESEARCH → UPDATED_ARTIFACT → AWAITING_APPROVAL`) matches the implemented transition graph structurally, though the equivalent action does not exist for spec or release approval (`AWAITING_SPEC_APPROVAL`/`AWAITING_RELEASE_APPROVAL` only have `APPROVE_*`/`REJECT_*`, no "need more work" middle path — rejecting sends release approval back to `BUILDING` directly, which is close but not identical to this document's research-request pattern).

### §8/§9 — Evidence presented, approval quality

**Real and good, for opportunity approval specifically.** The dashboard's opportunity detail page (verified via the screenshots taken during this project and the `app.js` source) shows the full evidence array with source URLs and confidence labels (`VERIFIED_FACT`/`INFERRED`/`ESTIMATE`/`OPINION`), competitors, complaints, differentiation, and every risk field (`ip_risk`/`policy_risk`/`technical_risk`/`market_signal`) before presenting the Approve/Reject/Need-More-Research buttons — this is a real, working instance of §9's "a human should be able to identify what is being approved... what risks exist," not a blind-click interface. **§8's "changes since previous version" requirement is not met**, for the same reason version binding doesn't exist (§4/§5 above) — there is nothing to diff against.

### §10 — Rejection reasons

**Implemented with a real, if different, taxonomy.** `schemas/opportunity.schema.json`'s `rejection_reason` enum (`weak_demand, too_competitive, poor_monetization, too_difficult, policy_risk, ip_risk, not_interesting, other`) covers similar ground to this document's suggested list but is specific to opportunity rejection — no equivalent structured reason exists for rejecting a spec or a release candidate (those transitions accept a free-text `note` only, via the CLI bridge's `--note` flag, with no enum).

### §12/§13 — Expiration, multiple/quorum approvals

**Neither exists**, and this document itself marks both as optional/justified-by-risk-only — consistent with a single-operator factory where quorum approval has no meaning yet (there is only one human).

### §15 — Execution bound to the approved object

**Not fully applicable yet, but the one place this matters is handled correctly by omission.** No release has ever been approved, so "publish RC17, not RC18" has never been tested — but the fact that Hisaab's `RELEASE_CANDIDATE` state was never submitted for approval in the first place (per `15-QUALITY-GATES.md`'s reconciliation — the agent correctly never called `SUBMIT_RELEASE_FOR_APPROVAL` knowing the build gate had failed) means this risk hasn't materialized, not that it's been solved.

### §16/§17 — Auditability, dashboard requirements

**Auditability**: every approval action does generate an audit entry (per `25-AUDIT-LOGGING.md`'s reconciliation) — actor, object (`opportunityId`), decision (the action name), timestamp, and reason where given. **No `object_version` or `evidence reference` field exists**, the same gap as §4/§5 above. **Dashboard requirements (§17)**: the Action Required queue, object details, evidence, risks, decision controls, and rejection-reason capture are all real (verified via `app.js` and this project's own screenshots); "changes since previous version" and a per-object audit-history view (today's Activity Log is global, not filterable to one opportunity's history from its detail page) are both missing.

### §18/§19

**Fully honored** — no second approval mechanism was created anywhere in this batch of documents; every approval concept described here maps onto `factory/dashboard/lib/stateMachine.js`/`store.js`, extending rather than duplicating it. No enterprise RBAC, biometric approval, or cryptographic signature was implemented or claimed.

### Summary

The one requirement this document exists to guarantee — agents cannot approve their own work — is real, tested, and holds. The most consequential gap found here is version binding (§4/§5): today, approving an opportunity approves whatever the file currently contains, with no snapshot of what was actually reviewed, which becomes a real risk the moment an opportunity record can be edited between when a human looks at it and when they click Approve. No approval code, versioning, or expiration mechanism was implemented while writing this document.
