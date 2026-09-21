App Factory — Schema Strategy
1. Purpose
This document defines how structured data is validated throughout the App Factory.
LLM output, external APIs, files, CLI input, and workflow payloads are all untrusted inputs.
Schemas provide the first deterministic validation boundary.
2. Schema Principle
Every structured boundary should have an explicit schema.
Conceptually:

```text
INPUT
 ↓
PARSE
 ↓
SCHEMA VALIDATE
 ↓
SEMANTIC VALIDATE
 ↓
ACCEPT
```

Invalid data must be rejected or explicitly marked incomplete.
3. Schema Categories
The factory should maintain schemas for:

```text
Opportunity
Research
Evidence
OpportunityAnalysis
ProductSpec
Application
Build
TestRun
SecurityReview
ReleaseCandidate
Release
DistributionCampaign
MetricSnapshot
AgentRun
ToolExecution
AuditEvent
Configuration
```

4. JSON Schema
JSON Schema should be the preferred format for machine-readable records unless a strong reason exists to use another format.
Schemas should be stored under:

```text
schemas/
```

or the repository's established schema location.
5. Required vs Optional
Fields must be intentionally classified.
Do not make a field optional merely to make an LLM response pass validation.
If a field is required for correctness, it must be required.
6. Enum Constraints
Finite values should use explicit enums.
Example:

```json
{
  "type": "string",
  "enum": [
    "HUMAN",
    "AGENT",
    "SYSTEM"
  ]
}
```

This prevents arbitrary lifecycle/actor values.
7. Numeric Validation
Numbers should define appropriate:

* minimum
* maximum
* integer/decimal type
* units

For example:

```text
confidence:
  type: number
  minimum: 0
  maximum: 1
```

8. Dates and Times
Timestamps should use ISO-8601 representations.
All timestamps should be unambiguous.
9. IDs
Stable IDs should have explicit formats where practical.
Do not use human-readable names as the primary identity of resources.
Names may change.
IDs should not.
10. Semantic Validation
Schema validation is not enough.
Example:
A ReleaseCandidate may satisfy its JSON schema but still be invalid if:

```text
build.status != SUCCESS
```

Therefore:

```text
Schema validation
+
Business-rule validation
```

are both required.
11. LLM Output Validation
LLM-generated structured output must pass:

```text
JSON parsing
 ↓
schema validation
 ↓
semantic validation
```

If validation fails:

```text
DO NOT execute
DO NOT advance lifecycle
DO NOT silently repair
```

The agent may be given a bounded opportunity to correct the output.
12. Schema Repair Loop
A bounded schema repair loop may be used:

```text
LLM output
 ↓
invalid
 ↓
provide validation errors
 ↓
LLM correction
 ↓
validate
 ↓
success OR stop
```

This loop must have a maximum number of attempts.
13. Schema Versioning
Every persisted record should identify its schema version.
Example:

```json
{
  "schema_version": "1.0"
}
```

Breaking changes require a new version.
14. Backward Compatibility
When possible, newer code should be able to read older valid records.
If migration is required:

```text
old schema
 ↓
migration
 ↓
new schema
```

The migration should be deterministic and tested.
15. External API Validation
External API responses must be validated before being treated as trusted application data.
An API returning HTTP 200 does not guarantee that its payload is correct.
16. Configuration Validation
Factory configuration should also have schemas.
Examples:

```text
model configuration
agent configuration
tool configuration
budget configuration
security policy
distribution configuration
```

Invalid configuration should prevent startup or the affected operation.
17. Cross-Record Validation
Some rules require multiple records.
Examples:

```text
ReleaseCandidate.build_id
    must reference
Build.status == SUCCESS
```

and:

```text
Release.application_id
    must match
ReleaseCandidate.application_id
```

Cross-record validation belongs in deterministic services.
18. Unknown Fields
The factory should decide explicitly whether unknown fields are:

```text
REJECTED
```

or:

```text
ALLOWED
```

For security-sensitive records, strict validation is preferred.
19. Validation Errors
Validation errors should be structured.
Example:

```json
{
  "code": "SCHEMA_VALIDATION_FAILED",
  "field": "package_name",
  "message": "Invalid Android package name"
}
```

Avoid returning only an unstructured text error.
20. Schema Testing
Schemas must have test fixtures for:

* valid records
* missing required fields
* invalid types
* invalid enums
* boundary values
* malformed IDs
* invalid references
* malicious/unexpected input

21. Schema Invariants

1. Persisted structured data is schema validated.
2. LLM output is schema validated.
3. External API data is schema validated.
4. Schema validation does not replace business validation.
5. Invalid data cannot silently advance lifecycle state.
6. Breaking schema changes are versioned.
7. Validation errors are observable.

---

## Reconciliation with current implementation (as of 2026-09-21)

**No automated schema validation runs anywhere in the factory today.** The schemas exist as files; nothing reads them at runtime to reject bad data. This is the single most important gap this document exposes, because it means every other document's "records must be schema validated" language (`10-DATA-MODELS.md` principle 6, this document's own principle 21.1–21.3) is currently aspirational, not true.

### What exists

- `schemas/opportunity.schema.json`, `schemas/research-record.schema.json`, `schemas/app-manifest.schema.json` — real JSON Schema (draft-07) files, well-formed, with `required`, `enum`, and `type` constraints matching this document's §5–§7 guidance reasonably closely already (e.g., `opportunity.schema.json`'s `lifecycle_state` is a closed enum per §6; `research-record.schema.json`'s `rating` field could use a §7-style `minimum`/`maximum` but does not have one today).
- No `Configuration`, `AgentRun`, `ToolExecution`, `Build`, `TestRun`, `SecurityReview`, `ReleaseCandidate`, `Release`, `DistributionCampaign`, or `MetricSnapshot` schema exists (§3's list — only 3 of ~16 named categories have a schema file).

### What was checked, concretely, and found missing

- **No JSON Schema validator library is installed or imported anywhere.** `factory/cli/appfactory.py`'s discover/approve/reject path (via the Node CLI bridge, `factory/dashboard/lib/cli.js`) writes and reads `opportunity.json` files without ever calling a validator against `schemas/opportunity.schema.json`. This was checked directly during earlier work on this project: when the Hisaab opportunity record was first created, this session validated it against the schema **by hand**, once, using a Python script that fell back to a manual required-field check specifically because the `jsonschema` package was not installed in this environment (`pip` has no `jsonschema` here) — that one-off script was never kept or wired into the pipeline.
- **`factory/dashboard/lib/store.js` performs zero schema validation.** It reads and writes `opportunity.json` via plain `JSON.parse`/`JSON.stringify`, trusting the file's shape entirely. A malformed `opportunity.json` (missing a required field, wrong enum value) would not be caught until something downstream broke on it.
- **`factory/dashboard/lib/stateMachine.js`'s `validate()` checks state-machine legality only** (is this action legal from this state, for this actor) — this is exactly this document's §10 "semantic validation" layer, but it has no §2 "schema validation" layer beneath it to build on, because nothing parses/validates the record's shape first.
- **No `schema_version` field exists anywhere** — not in the schema files themselves, and not in any actual record (`approved/household-help-wage-tracker/opportunity.json` has no `schema_version` key). §13's requirement is unmet across the board.
- **No schema repair loop (§12), no schema test fixtures (§20), no validation-error structure (§19) exist.** When this project's opportunity record was manually checked against the schema, a validation failure would have just been this session noticing a missing field while reading the file — not a structured `{code, field, message}` error.

### One relevant, real precedent worth noting

The Hisaab **application's own** backup format (`apps/household-help-wage-tracker/app/src/main/java/com/appfactory/hisaab/data/BackupManager.kt`) *does* implement something like this document's principles for its own narrow purpose: it has a `SCHEMA_VERSION` constant (§13), rejects an unparseable or wrong-version backup file with a structured `InvalidBackupException` rather than partially importing it (§11 "fails closed"), and was verified with real passing/failing test cases (`BackupManagerTest.kt`, 5/5 passing, covering exactly the categories §20 asks for: valid round-trip, null-optional-field round-trip, invalid JSON, wrong schema version, missing required field). **This is application-level code, not factory infrastructure** — it validates one Android app's own backup file format, not any factory-level `Opportunity`/`Build`/`TestRun` record — but it is evidence that the pattern this document wants (parse → validate → reject cleanly) is already understood and has been correctly implemented once in this codebase. It has just never been applied to the factory's own records.

### What this means going forward

No validator was installed and no validation code was written as part of this document — per this session's instructions, this is a specification of the target, not an implementation task. The most direct, low-risk first step toward closing this gap (not undertaken here) would be adding a `jsonschema`-based (or equivalent) validation call inside `factory/dashboard/lib/store.js`'s `transition()` function, since that is already the single place all opportunity-record writes pass through — no new architecture would be needed to wire it in, only the validation call itself.
