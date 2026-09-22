App Store Optimization

1. Purpose

App Store Optimization (ASO) improves an application's discoverability and conversion within app stores.

ASO should be treated as an evidence-driven optimization process rather than keyword stuffing.

2. ASO Objectives

The factory should optimize two primary outcomes:

1. discoverability;
2. store-page conversion.

These are different problems.

A listing can receive visibility without generating installs.

3. ASO Components

The target ASO system should manage:

- application title;
- short description;
- full description;
- keywords where supported;
- screenshots;
- icon;
- feature graphics;
- category;
- localization;
- ratings/reviews;
- conversion metrics.

4. Keyword Research

Keyword research should identify:

- search intent;
- relevance;
- competition;
- estimated demand where data exists;
- related terms;
- user language;
- geographic differences.

The factory must distinguish:

OBSERVED DATA
ESTIMATE
MODEL INFERENCE
HYPOTHESIS

A model-generated keyword-volume estimate must not be presented as measured search volume unless an actual data source supports it.

5. Search Intent

Keywords should be classified by intent.

Examples:

problem intent
solution intent
feature intent
brand intent
comparison intent

The listing should prioritize terms relevant to the actual product.

6. Listing Structure

The factory should maintain structured listing metadata.

Example:

title
short_description
full_description
keywords
category
audience
value_proposition
primary_use_case

This allows listing variants to be generated and tested systematically.

7. Screenshot Strategy

Screenshots should communicate:

1. what the application does;
2. who it helps;
3. the primary benefit;
4. important differentiators;
5. major workflows.

Screenshots should not merely display UI without context.

8. Creative Testing

Possible variables include:

- first screenshot;
- headline;
- visual hierarchy;
- benefit statement;
- ordering;
- localization.

Changes should be tracked as experiments.

9. Localization

Localization should consider:

- language;
- cultural context;
- search terminology;
- screenshots;
- descriptions;
- user expectations.

Translation alone does not guarantee effective localization.

10. Ratings and Reviews

Ratings and reviews are valuable product/distribution signals.

The factory may analyze:

- rating trends;
- review themes;
- recurring complaints;
- feature requests;
- sentiment where appropriate.

The factory must not fabricate reviews or manipulate ratings.

11. Review Mining

Review analysis should categorize feedback such as:

BUG
UX_PROBLEM
FEATURE_REQUEST
PERFORMANCE
PRICING
CONFUSION
PRAISE
OTHER

Repeated themes can become inputs to the iteration pipeline.

12. ASO Experiment Model

An ASO experiment should record:

experiment_id
application_id
element_changed
variant
hypothesis
start_time
end_time
baseline
result
evidence
decision

13. Conversion Funnel

ASO should be evaluated through:

Search Visibility
 ↓
Store Listing Visit
 ↓
Install
 ↓
Activation

The factory should avoid optimizing impressions if downstream conversion deteriorates.

14. Competitive Research

Competitive listing analysis may examine:

- titles;
- positioning;
- screenshots;
- descriptions;
- categories;
- visible user feedback;
- feature emphasis.

Competitor information should be sourced and timestamped.

15. Policy Compliance

ASO assets must comply with platform rules.

The factory must avoid:

- deceptive claims;
- misleading screenshots;
- fake awards;
- fabricated user numbers;
- keyword spam;
- impersonation;
- prohibited content.

16. Automation Boundary

The factory may generate ASO recommendations automatically.

Changes with external consequences should follow the configured approval policy.

17. Current Implementation

The current factory may not yet have automated ASO research or store experimentation.

Future ASO capabilities should integrate with the distribution, analytics, and monitoring systems.

18. Non-Goals

This document does not require:

- guaranteed ranking improvements;
- fabricated keyword metrics;
- automatic review manipulation;
- guaranteed install growth.

ASO is an optimization process based on measurable evidence.

---

## Reconciliation with current implementation (as of 2026-09-22)

**One real listing draft exists (Hisaab's), written by hand, with no keyword research, no experimentation, and no automation behind it.** This document's target system does not exist; what exists is a single, carefully-worded piece of original copy that happens to already satisfy this document's §15 policy-compliance bar, checked directly against its actual text below.

### What exists: `apps/household-help-wage-tracker/store/listing.md`

- **Title, short description, full description, category recommendation, screenshot plan, feature-graphic plan** — all present, all original (its own header states "None of it is copied or adapted from any competitor's listing," with a cross-reference to `reports/phase1-opportunity-selection.md` for the competitor research it's differentiated against).
- **No keyword list, no keyword research, no search-intent classification (§4/§5) of any kind exists.** The listing was written for clarity and honesty, not for search optimization — this is a real, nameable gap against this document's core purpose (discoverability), not just an unstarted nice-to-have.
- **No structured listing metadata object (§6)** — it's a Markdown document with headings, not a `{title, short_description, keywords, audience, value_proposition, primary_use_case}` record a service could generate variants from or validate.

### Claim-by-claim check against §15 (the check this document cares most about)

Every material claim in the actual listing text was re-checked directly against this project's own verification documents while writing this reconciliation, not assumed:

| Claim in `listing.md` | Verified against | Status |
|---|---|---|
| "No account, no ads, works offline" (short description) | `SECURITY_REVIEW.md`: zero permissions declared, confirmed against the actual `AndroidManifest.xml`; no ad SDK in `app/build.gradle.kts`'s dependency list | **Supported by evidence that exists**, though that evidence is source-level only — no compiled build exists to give a final, fully-conclusive check (the same caveat `PRIVACY.md` itself states). |
| "Hisaab does not request internet access at all... the app literally has no permission to connect to the internet" | `SECURITY_REVIEW.md`'s manifest review: confirmed zero `<uses-permission>` entries, including no `INTERNET` | **Directly verified**, and phrased as a checkable technical fact rather than a vague promise — exactly this document's §15 standard ("avoid deceptive claims"). |
| "Available in English and Hindi" | `apps/household-help-wage-tracker/app/src/main/res/values-hi/strings.xml` exists, but its own code comment (quoted in the release-candidate report) admits "most UI strings in this MVP are still hardcoded in Kotlin," not fully externalized to the Hindi resource file | **This is the one claim in the listing that is weaker than the underlying implementation.** The mechanism (locale switching, `app_name` translated) is real, but "available in Hindi" implies more complete localization than the MVP actually delivers. This was already flagged as a MEDIUM known limitation in the release-candidate report — but the store listing copy was written *before* cross-checking it against that specific limitation, and this reconciliation is the first time the two have been compared directly. **This is a real, actionable finding**: the listing claim should either be softened (e.g., "Hindi app name and growing language support") or the localization work should be completed before submission — not decided here, since this pass only documents architecture. |
| "Back up your data to a file you control" | `BackupManager.kt` + `BackupManagerTest.kt` (5/5 real tests, including fail-closed behavior on invalid/wrong-version backups) | **Directly verified**, including the failure-mode honesty this document's §15 implicitly wants ("fake awards/fabricated numbers" are the named bad example, but "claims that don't hold up under failure" is the same category of risk). |
| "No ads. No tracking. No unnecessary permissions." | Dependency list has no analytics/ads SDK; manifest has zero permissions | **Directly verified.** |
| Category recommendation "Finance (secondary: Productivity)... matches how the closest competitors... are categorized" | `reports/phase1-opportunity-selection.md` names ServiceBook/MaidExpense as competitors, but their actual Play Store category was not independently re-confirmed while writing the listing — this is an **inference from research notes, not a freshly re-verified fact**, and is labeled here as such rather than left ambiguous. | **Reasonable inference, not independently re-verified at listing-writing time.** |

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §2 Discoverability vs. conversion as separate objectives | **Not distinguished in practice** — the listing was optimized for conversion/trust (clear, honest copy) with zero attention to discoverability (no keyword work at all). |
| §3/§6 Structured ASO component management | **Does not exist** — one Markdown file, not a managed record set. |
| §4/§5 Keyword research, search intent | **Not done.** No keyword list exists for Hisaab at all. |
| §7 Screenshot strategy | **Planned, not executed.** `listing.md`'s screenshot plan names five specific screens and what each should communicate (mirroring this document's §7 five-point list almost exactly: what it does, who it helps, benefit, differentiator, workflow) — genuinely well-matched to this document's intent, but explicitly caveated as unexecuted: "screenshots must be captured from an actual running build... never mocked up," and no build exists. |
| §8 Creative testing | **Not applicable — nothing has been tested, because nothing has been published.** |
| §9 Localization | **Partially real, partially overclaimed** — see the Hindi finding above. |
| §10/§11 Review mining | **Not applicable — no reviews exist for an unpublished app.** The *pattern* this section describes (categorizing feedback into BUG/UX_PROBLEM/FEATURE_REQUEST/etc.) was actually already practiced once in this project, but on *competitor* reviews during opportunity research (`reports/phase1-opportunity-selection.md`'s complaints/requested-features sections), not Hisaab's own reviews — a related but distinct activity from what this section describes. |
| §12 ASO experiment model | **Does not exist** — no experiment has run. |
| §13 Conversion funnel | **Not measurable — no app is live.** |
| §14 Competitive research, sourced and timestamped | **Done, and done reasonably well, for the opportunity-research phase** — `reports/phase1-opportunity-selection.md` cites Play Store URLs with a capture date, matching this section's intent, though for market validation rather than specifically for ASO positioning. |
| §15 Policy compliance (no deceptive claims, no fake numbers, no keyword spam) | **Verified true for four of five checked claims above; one claim (Hindi availability) is overstated relative to the actual MVP** — the first concrete, actionable finding in this reconciliation, not a hypothetical risk. |
| §16 Automation boundary | **Not applicable — nothing is automated.** All copy was written by hand, once. |
| §17/§18 Current implementation honesty, non-goals | Consistent with this reconciliation itself. |

### Summary

The one real ASO artifact in this project — Hisaab's store listing — is honest on four of five checked claims and overstated on one (Hindi language support), found by directly cross-referencing the listing text against the release-candidate report's own known-limitations list rather than assumed clean. No keyword research, structured metadata, or experimentation infrastructure exists. No ASO tooling was implemented while writing this document; the Hindi-claim finding is reported here for whoever next touches the store listing, not corrected in this pass.
