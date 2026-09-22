Audit Logging Architecture
1. Purpose
The App Factory performs increasingly consequential operations.
The system therefore requires an authoritative history of:

* state changes;
* human decisions;
* agent executions;
* tool executions;
* external side effects;
* failures;
* approvals;
* security events.

The audit system provides accountability and forensic traceability.
2. Core Principle
If an important action cannot be explained from recorded evidence, the factory did not adequately audit it.
Audit records must describe what happened, not what the system assumes happened.
3. Audit Sources
Events may originate from:

* human actions;
* agents;
* services;
* tools;
* orchestrators;
* external integrations;
* system failures.

Every event should identify its actor.
4. Actor Types
The factory should support:

```text
HUMAN
AGENT
SYSTEM
TOOL
EXTERNAL
```

Example:

```text
actor_type: HUMAN
actor_id: operator
action: APPROVE_RELEASE
```

5. Event Model
A target audit event should contain:

```text
event_id
timestamp
actor_type
actor_id
action
entity_type
entity_id
previous_state
new_state
result
reason
evidence
correlation_id
metadata
```

Not every field is mandatory for every event, but consequential operations should contain sufficient context.
6. Append-Only Principle
Audit history should be append-only.
Normal application logic must not:

* rewrite historical events;
* delete individual events;
* silently modify timestamps;
* replace previous decisions.

Corrections should be represented as new events.
7. State Transition Auditing
Every lifecycle state transition should produce an audit event.
Example:

```text
BUILDING
   ↓
TESTING
```

The event should identify:

* previous state;
* new state;
* actor;
* reason;
* timestamp;
* workflow/application.

8. Human Decisions
Human decisions should record:

* decision;
* actor;
* object;
* timestamp;
* reason where provided;
* relevant evidence.

Example:

```text
Decision:
REJECT

Object:
Opportunity-17

Actor:
HUMAN

Reason:
Insufficient market evidence
```

9. Agent Runs
Agent executions should record:

* agent type;
* task;
* model;
* model version;
* prompt/version reference;
* input references;
* output reference;
* tool calls;
* duration;
* token/cost information where available;
* result.

Sensitive prompt content should not be stored unnecessarily.
10. Tool Executions
Tool events should record:

* tool;
* operation;
* actor/requester;
* inputs or safe input reference;
* output/reference;
* status;
* duration;
* side effects;
* error information.

Secrets must never be written into audit records.
11. External Side Effects
Examples:

* Git push;
* repository creation;
* application publication;
* advertising spend;
* social-media publication;
* external resource creation.

These operations require stronger audit evidence.
The event should capture the external identifier where available.
12. Correlation
Related events should share a correlation identifier.
Example:

```text
Opportunity
 ↓
Research
 ↓
Analysis
 ↓
Approval
 ↓
Build
 ↓
Release
```

A correlation ID allows the complete lifecycle to be reconstructed.
13. Audit Integrity
The target architecture should consider mechanisms such as:

* append-only storage;
* checksums;
* hash chaining;
* restricted write access;
* backups.

The implementation should be proportional to the factory's risk and maturity.
14. Audit Access
Audit history should be readable by authorized operators.
Normal agents should not be able to rewrite audit history.
Sensitive audit information should be protected according to its contents.
15. Audit Retention
Retention should be defined according to:

* security requirements;
* operational needs;
* legal/privacy requirements;
* storage cost.

Retention policies should not silently destroy evidence required for active incidents.
16. Audit Failures
If a required audit event cannot be recorded, consequential operations should normally stop.
The factory should not silently execute high-risk actions without required audit evidence.
17. Current Implementation
The current factory already uses an append-only audit log.
Future improvements must extend the existing mechanism rather than create a competing audit system.
The current audit implementation remains authoritative until explicitly migrated.
18. Non-Goals
This document does not require immediate:

* immutable cloud logging;
* SIEM integration;
* blockchain-based audit records;
* centralized enterprise logging.

Those may be considered later if justified.

---

## Reconciliation with current implementation (as of 2026-09-22)

**A real, working append-only audit log exists** (`factory/dashboard/lib/auditLog.js` → `factory/state/audit-log.jsonl`), and this document explicitly requires extending it rather than replacing it (§17) — no new audit system was created. Its exact current implementation, read directly for this reconciliation, is reproduced here in full since it's short enough to check line by line:

```js
function append(entry) {
  ensureDir();
  const record = { timestamp: new Date().toISOString(), ...entry };
  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  return record;
}
function readAll() {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line)).reverse();
}
```

### Field-by-field comparison: this document's §5 model vs. what's actually written

| This document's field | Actual field in `factory/dashboard/lib/store.js`'s call to `auditLog.append()` | Status |
|---|---|---|
| `event_id` | **Does not exist.** No UUID or sequence number is generated per entry — an entry's identity is its position in the file plus its `timestamp`. | Missing |
| `timestamp` | `timestamp` (ISO-8601, generated by `append()` itself, not passed by the caller) | Present, matches |
| `actor_type` | `actor` (values: `HUMAN`/`AGENT`/`SYSTEM` — same three values this document's own §4 lists as core, though this document adds `TOOL` and `EXTERNAL` as a fourth/fifth actor type not yet used anywhere) | Present, narrower enum than §4 proposes |
| `actor_id` | `actorName` (defaults to `'owner'` for HUMAN, or the lowercased actor string for AGENT/SYSTEM — see `store.js`'s `transition()` function) | Present, different name |
| `action` | `action` (e.g., `APPROVE_OPPORTUNITY`, `MIGRATE_TO_STATE_MACHINE`) | Present, matches |
| `entity_type` | **Does not exist — implicitly always "opportunity."** No app-level audit entries exist independent of their opportunity record. | Missing |
| `entity_id` | `opportunityId` | Present, narrower name (assumes the entity is always an opportunity) |
| `previous_state` | `previousState` | Present, matches |
| `new_state` | `newState` | Present, matches |
| `result` | **Does not exist as a separate field** — a failed transition throws an error and is never written to the log at all (see `store.js`'s `transition()`: the write only happens after `stateMachine.validate()` succeeds). So there is no `result: FAILURE` entry ever recorded — rejected attempts leave no audit trace beyond whatever the caller (dashboard/CLI) does with the thrown error. **This is a real, concrete gap**: §2's own principle ("if an important action cannot be explained from recorded evidence, the factory did not adequately audit it") is not fully met, because a rejected human-approval attempt, an agent incorrectly trying to self-approve, or any other blocked transition attempt currently produces **no audit event at all** — only a runtime error visible in that moment's terminal/HTTP response, never persisted. | **Missing, and the most actionable finding in this document** |
| `reason` | `reason` (used for rejection reasons) | Present, matches |
| `evidence` | **Does not exist as a field** — no entry links to supporting evidence (e.g., a URL, a file path, a report reference). | Missing |
| `correlation_id` | **Does not exist.** All entries for one opportunity are correlated only by sharing the same `opportunityId` value — there is no separate `correlation_id` spanning, say, an opportunity's full research→approval→build→release chain if that chain ever involves more than one entity type. | Missing (but partially substitutable via `opportunityId` for now) |
| `metadata` | `note` (free-text only, not a structured object) | Present, much narrower than a free-form `metadata` object |

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §3/§4 Multiple audit sources, five actor types | **Three of five actor types are used** (`HUMAN`, `AGENT`, `SYSTEM` — the last used once, for the `MIGRATE_TO_STATE_MACHINE` entry). `TOOL` and `EXTERNAL` have never been used, because no tool-execution layer or external-service integration exists yet to generate them (`09-TOOL-ARCHITECTURE.md`'s reconciliation). |
| §6 Append-only, no rewrites | **Enforced by the code's shape, not by a technical guard against tampering.** `auditLog.js` exposes only `append()` and `readAll()` — no `update`/`delete` function exists in the module's public interface, so normal application code cannot rewrite history. A person with direct filesystem access could still hand-edit `audit-log.jsonl` — there is no checksum or hash-chaining (§13) to detect that, which this document explicitly says is acceptable at this stage ("proportional to the factory's risk and maturity"). One real precedent exists for the *correct* way to handle wanting to change history: when this project's dashboard development produced smoke-test noise in the log, the entries were removed by directly editing the file during pre-delivery cleanup — a manual, one-time, human-supervised action taken before any real decision had been recorded, not a runtime "edit history" feature, and it was disclosed as such at the time rather than silently done. |
| §7 State-transition auditing | **Fully implemented and working** — every real transition (the `household-help-wage-tracker` migration entry, and all transitions exercised during development testing) produced an entry with previous/new state, actor, and timestamp. |
| §8 Human decisions with reason | **Implemented** — `REJECT_OPPORTUNITY`-style actions accept and record a `reason`/`note`. |
| §9 Agent run auditing (model, prompt version, tool calls, cost) | **Does not exist** — no `AgentRun` concept exists to audit (per `07-AGENT-ARCHITECTURE.md`'s reconciliation). |
| §10 Tool execution auditing | **Does not exist** — no tool layer exists to audit (per `09-TOOL-ARCHITECTURE.md`'s reconciliation). The one external side effect that *has* happened repeatedly in this project — `git push` — has never produced an audit-log entry; it's visible only in git's own commit history, a separate, unlinked record. |
| §11 External side effects requiring stronger evidence | **Not applicable yet** — no publish, spend, or external resource creation has occurred. |
| §12 Correlation IDs | **Substitutable today by `opportunityId` alone**, since every entity in the factory so far is an opportunity or the app built from one sharing its ID — this coincidentally works for a single-entity-type factory but will not scale once builds/tests/releases become independently-audited entities with their own IDs, as `10-DATA-MODELS.md` anticipates. |
| §13 Integrity mechanisms (checksums, hash chaining) | **Not implemented**, consistent with this document's own instruction that this is proportional to current risk, not required now. |
| §14 Audit access, restricted write | **Read access exists via the dashboard's `/api/activity` endpoint and `appfactory status`; write access is technically restricted to whatever calls `auditLog.append()`**, which today is only `store.js`'s `transition()` function and the `cli.js` migration/discover paths — no other code path writes to the log. |
| §15 Retention policy | **No explicit policy exists** — nothing has ever been deleted from the log (aside from the one disclosed pre-delivery cleanup above), so retention has been "keep everything," by default rather than by written policy. |
| §16 Stop consequential operations if audit write fails | **Not explicitly handled, but the code's structure makes the opposite failure mode the more likely one.** `store.js`'s `transition()` writes the updated `opportunity.json` file *before* calling `auditLog.append()` — so if the audit write itself failed (e.g., disk full), the state change would already be persisted without its audit record, which is the reverse of what §16 wants (the audit record should gate the operation, not follow it unconditionally). This has never actually happened in practice, but it is a real, checkable ordering issue in the current code, not merely a hypothetical concern. |
| §17 Extend, don't replace | **Fully honored** — this document, and everything built in Batches 5–9, treats `factory/state/audit-log.jsonl` as authoritative and proposes no competing log. |
| §18 Non-goals | Consistent — no SIEM, blockchain, or enterprise logging has been built or claimed. |

### Summary

The audit log's happy path (successful transitions, human decisions with reasons) is real, working, and matches this document's core fields closely under different names. The two most concrete, actionable gaps found by this reconciliation: **(1) failed/rejected transition attempts currently produce no audit trail at all** — exactly the kind of event `03-PRINCIPLES.md` P-026 says a test suite should verify stays rejected, and it does get rejected, but silently as far as the audit log is concerned; and **(2) the state-file write happens before the audit-log write in `store.js`**, the opposite order from what a strict reading of §16 wants. Neither was changed while writing this document — both are named here for a future, deliberate pass.
