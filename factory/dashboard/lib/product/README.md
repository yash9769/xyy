# Product Factory (Phase 5)

Turns an **APPROVED** opportunity plus its research into a versioned, evidence-traceable
**ProductSpecification**, then submits it for human approval. Phase 5 ends at
`AWAITING_SPEC_APPROVAL`. It builds no app code, Gradle projects or artifacts; that is Phase 6.

```
APPROVED opportunity + latest ResearchRecord + matching OpportunityAnalysis
  -> ProductAgent (agent/agents/productAgent.js)
  -> ModelRouter task 'product_specification_generation'  (untrusted candidate)
  -> deterministic validation (validation.js)
  -> append-only, versioned persistence (persistence.js)
  -> START_SPEC -> SPEC_GENERATING -> SUBMIT_SPEC_FOR_APPROVAL -> AWAITING_SPEC_APPROVAL
```

A human then uses the existing dashboard buttons or `node factory/dashboard/lib/cli.js human-transition <id> APPROVE_SPEC|REJECT_SPEC`. No new UI or CLI command was needed.

## Files

| File | Role |
|---|---|
| `types.js` | Constants: claim types, data classifications, allowed `SYSTEM_CONSTRAINT` sources, limits, audit action names |
| `Claim.js` | The `Claim` model and its evidence and semantic rules |
| `ProductSpecification.js` | Field lists, final frozen construction, derived `supporting_evidence_ids` |
| `validation.js` | The staged validation pipeline |
| `schemaValidator.js` | Small JSON Schema subset validator for `schemas/product-specification.schema.json`. It throws on any keyword it does not implement. |
| `modelInput.js` | Builds the bounded, deterministic model input |
| `persistence.js` | Append-only JSONL store with version rules and query helpers |
| `index.js` | Public entry point: `createProductModelRouter()`, `createProductAgentRunner()` |
| `../agent/agents/productAgent.js` | The ProductAgent |

## Claim semantics

Every attributable statement is a `Claim`: `statement`, `claim_type`, `evidence_ids`,
`constraint_source`, `rationale`, `decided_by`.

| claim_type | Rule (a violation rejects the whole specification; nothing is downgraded) |
|---|---|
| `FACT` | Needs at least one `evidence_id`. Each id must exist in **this** ResearchRecord and have `confidence: VERIFIED_FACT`. |
| `INFERENCE` | Needs at least one `evidence_id` that exists in this ResearchRecord. Any confidence level is accepted. |
| `HYPOTHESIS` | Evidence is optional, but any cited id must exist. The claim stays typed `HYPOTHESIS`, and the spec's disclaimer says so. |
| `PRODUCT_DECISION` | Evidence is optional. `rationale` is required. `decided_by` is required and is **set from the runtime agent identity** (`AGENT:product-agent@<version>`). The model may never supply `decided_by`. |
| `SYSTEM_CONSTRAINT` | `constraint_source` must be one of the repository artifacts in `SYSTEM_CONSTRAINT_SOURCES`, optionally followed by `#section`. A test asserts that each path exists. |

`constraint_source` is rejected on claim types other than `SYSTEM_CONSTRAINT`. `supporting_evidence_ids` is derived from what claims and metrics actually cite, never taken from the model.

## Validation pipeline (deterministic, no LLM)

The pipeline stops at the first failing stage. Nothing is persisted and no transition happens after a failure.

1. **STRUCTURAL**: only plain JSON data. The pipeline enforces size and depth limits. It rejects unknown top-level fields, runtime fields (identity, evidence summaries, governance), authority fields (`actor`, `lifecycle_state`, `approved_by`, `approval`, …) and `__proto__`/`constructor`/`prototype` keys.
2. **SCHEMA**: the assembled draft is checked against `schemas/product-specification.schema.json`. Before the draft can be assembled, the input records must exist and the runtime identity must be a genuine `AGENT` identity.
3. **IDENTITY**: opportunity is `APPROVED`; research and analysis belong to it; the analysis was built from that research; research is complete and has evidence.
4. **EVIDENCE**: every cited id exists in this ResearchRecord, with no duplicates or malformed ids. FACT and INFERENCE claims must be supported as described above.
5. **CLAIM_SEMANTICS**: rationale and constraint_source rules.
6. **REFERENTIAL**: ids are unique across features, requirements and criteria. Feature↔requirement links are reciprocal. Every functional requirement is linked to a feature. Each MVP feature has requirements, and each MVP functional requirement has an acceptance criterion. Duplicate requirements are rejected, and scope limits are enforced.
7. **SECURITY_PRIVACY**: permissions and external services must be justified. Dangerous Android permissions must be classified as personal data. Personal or sensitive data requires privacy and security requirements. Credentials are never shared externally, and the spec may not contain secrets. An offline-only requirement contradicts network use.
8. **GOVERNANCE**: no authority keys anywhere in the candidate, including a model-authored `decided_by`.
9. **NORMALIZATION**: `decided_by` is applied from the runtime identity. Every object is rebuilt field by field, every Claim is re-checked, the schema is re-validated, and the result is deep-frozen and marked as validated.

## Versioning and persistence

- Specifications are written to `factory/state/product/product-specifications.jsonl`, one JSON record per line, append-only.
- `specification_id` is `<opportunity_id>-spec-v<version>`. `version` must be exactly the next version for that opportunity (1, 2, 3, …). Reusing an id, reusing a version or skipping a version is rejected.
- Only objects produced by `createProductSpecification()` can be appended. Loaded records are deep-frozen.
- `getLatestForOpportunity`, `getById`, `getByVersion` and `nextVersion` are deterministic.
- Reads fail closed: a malformed line throws `ProductPersistenceError` instead of being skipped, so a version number can never be silently reused.
- `specification_status` is always `DRAFT` inside the immutable record. The lifecycle authority is still `opportunity.json`. Human approval exists only as the `APPROVE_SPEC` transition recorded by `store.transition()`, and it applies to the specification version that was submitted.

## Approval boundary

- The agent requests only `START_SPEC` and `SUBMIT_SPEC_FOR_APPROVAL`, through `agent/lifecycle.js`, which hardcodes actor `AGENT`. `APPROVE_SPEC` and `REJECT_SPEC` are HUMAN-only in `stateMachine.js`.
- Both transitions happen **after** validation and persistence. The agent re-checks just before persisting that the opportunity is still `APPROVED`.
- The ProductAgent has no ToolRuntime and cannot invoke tools. It only reads research data and never writes it.

## Audit events

These are written through the existing `auditLog.append`, always with actor `AGENT` and actorName `product-agent`, and always include `run_id`:
`PRODUCT_SPECIFICATION_GENERATED` (a candidate was received),
`PRODUCT_SPECIFICATION_VALIDATED`, `PRODUCT_SPECIFICATION_REJECTED` (with the stage and violation codes),
`PRODUCT_SPECIFICATION_PERSISTED`.
They appear alongside the existing `MODEL_RUN`, `AGENT_RUN`, `START_SPEC` and `SUBMIT_SPEC_FOR_APPROVAL` entries.

## Failure behavior

| Failure | Result |
|---|---|
| Missing/unapproved opportunity, missing/incomplete/invalid research or analysis, research/analysis mismatch | `FAILED` before any model call |
| Model technical failure after the bounded fallback | `BLOCKED` (`SPEC_GENERATION_UNAVAILABLE`) |
| Model non-technical failure, malformed response, reserved keys | `FAILED` |
| Any validation stage fails | `FAILED` and a `PRODUCT_SPECIFICATION_REJECTED` audit entry |
| Specification log unreadable, or persistence fails | `FAILED` with no transition |
| Opportunity left `APPROVED` during generation | `FAILED`; nothing is persisted |
| Transition fails after persistence | `FAILED`. The result names the persisted specification and the opportunity's current state (see limitations). |

In every failure case, the opportunity stays `APPROVED` (except the last row) and no success is reported.

## Model Router

- Task type `product_specification_generation` with capabilities `text_generation` and `structured_output`, a `budget.maxCostUsd` of 0.01, and the router's existing single bounded fallback.
- No new provider abstraction and no API keys. `createProductModelRouter()` uses the existing offline `mock-provider`. That provider returns plain text, not a specification, so with the default router every run is rejected at STRUCTURAL and nothing is persisted. This is intentional: no fabricated specification can come out of the default setup. Tests use a provider built with the existing `defineProvider()`.
- The model must return exactly `{ "specification": { ... } }`; any other output field is rejected.

## Known limitations

- `REJECT_SPEC` is terminal, and no transition exists to revise a specification. In practice a new version can only arise if an earlier run persisted a specification but its transition failed. Adding a revision loop is a state-machine change and needs its own approval.
- If `START_SPEC` succeeds but `SUBMIT_SPEC_FOR_APPROVAL` then fails, the opportunity is left in `SPEC_GENERATING` with a persisted DRAFT, and the agent cannot resume it: it only starts from `APPROVED`. No automatic recovery exists.
- Contradiction detection is a small, explicit rule set (offline-only versus network use), not general reasoning.
- Version numbers are computed by reading the log and then appending. This assumes a single writer, which matches the rest of the factory; there is no file locking.
