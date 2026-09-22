Marketing Architecture

1. Purpose

Marketing converts product value into understandable communication for potential users.

The App Factory should eventually be able to generate and evaluate marketing assets as part of the product lifecycle.

Marketing must remain connected to the actual product.

2. Core Principle

«Marketing may simplify the message, but must not invent the product.»

Every material claim should be traceable to:

- actual functionality;
- documented product behavior;
- measured evidence;
- or explicitly labeled hypothesis.

3. Marketing Inputs

Marketing generation should consume:

- ProductSpec;
- target audience;
- value proposition;
- differentiators;
- verified features;
- limitations;
- competitive research;
- distribution strategy;
- ASO research;
- historical campaign results.

4. Positioning

The factory should define:

Target User
Problem
Current Alternative
Product Solution
Primary Benefit
Differentiator
Reason to Believe

This becomes the foundation for downstream content.

5. Messaging Hierarchy

Marketing messages should operate at multiple levels.

Level 1 — One-Line Value Proposition

What the product does and for whom.

Level 2 — Core Benefits

Why the target user should care.

Level 3 — Feature Evidence

How the product delivers those benefits.

Level 4 — Supporting Proof

Examples:

- measured results;
- testimonials where legitimately obtained;
- product demonstrations;
- verified statistics.

6. Content Types

The target factory may generate:

- landing-page copy;
- blog articles;
- social posts;
- short-video scripts;
- video concepts;
- email campaigns;
- community posts;
- product announcements;
- referral messages;
- advertising copy.

7. Content Provenance

Every generated marketing asset should retain:

- application ID;
- campaign ID;
- content type;
- generation model;
- prompt/version;
- source inputs;
- creation timestamp;
- approval status.

8. Claim Validation

Before publication, claims should be checked.

Examples:

"Works offline"

must correspond to verified product behavior.

"Used by 100,000 people"

must have actual evidence.

If evidence does not exist, the claim should be removed or clearly presented as a future goal rather than a fact.

9. Audience Segmentation

Marketing may target different segments.

Examples:

- students;
- professionals;
- small businesses;
- families;
- developers.

Each segment may have different:

- problems;
- language;
- channels;
- messaging;
- acquisition costs.

The target audience must remain consistent with the product specification.

10. Content Distribution

Marketing assets should connect to the distribution system.

Example:

Marketing Asset
      ↓
Channel
      ↓
Campaign
      ↓
Landing / Store
      ↓
Install
      ↓
Activation

This allows the factory to determine whether content produces useful downstream outcomes.

11. Content Experiments

Marketing experiments should define:

- hypothesis;
- audience;
- channel;
- creative variant;
- success metric;
- budget where applicable;
- duration;
- result.

Avoid changing many variables simultaneously when the goal is causal learning.

12. Paid Advertising

Paid advertising should be treated as a controlled experiment.

Before spending:

- define objective;
- define target;
- define budget;
- define success criteria;
- define stopping conditions.

Human approval should be required according to financial-risk policy.

13. Community Marketing

Community platforms require context-specific behavior.

The factory should not blindly publish promotional content everywhere.

Community-specific constraints may include:

- posting rules;
- disclosure requirements;
- frequency limits;
- audience expectations;
- moderation policies.

14. Spam Prevention

The factory must avoid:

- mass unsolicited messages;
- duplicate automated posts;
- fake engagement;
- fake accounts;
- deceptive endorsements;
- fabricated testimonials.

Automation should respect platform policies.

15. Marketing Feedback

Campaign results should feed back into:

- positioning;
- messaging;
- ASO;
- product onboarding;
- feature prioritization.

Example:

Strong click-through
+
weak activation
        ↓
investigate product/onboarding

Marketing should not be used to conceal product problems.

16. Content Approval

Approval requirements depend on the side effect.

Examples:

Low Risk

Drafting internal copy.

Medium Risk

Publishing organic content automatically.

High Risk

Spending money or making material public claims.

The approval policy should be explicit.

17. Brand Consistency

Applications may have different brands.

The factory should support reusable:

- tone guidelines;
- visual systems;
- messaging rules;
- prohibited claims;
- asset templates.

Brand rules should be machine-readable where practical.

18. Current Implementation

The current factory does not need to execute marketing automation yet.

The architecture should establish the contracts required for later integration with:

- distribution;
- ASO;
- analytics;
- monitoring;
- experimentation.

19. Non-Goals

This document does not promise:

- viral growth;
- guaranteed conversion;
- automatic influencer success;
- guaranteed advertising ROI.

Marketing remains an evidence-driven optimization process.

---

## Reconciliation with current implementation (as of 2026-09-22)

**No marketing automation, content generation pipeline, or campaign infrastructure exists.** As with `19-DISTRIBUTION.md`, the one real artifact to check this against is Hisaab's store listing copy (`apps/household-help-wage-tracker/store/listing.md`) — the only marketing-adjacent content this project has produced — checked here specifically against this document's §2/§4/§5/§8 (positioning, messaging hierarchy, claim validation), which is a different lens than `20-ASO.md`'s §15 policy-compliance check of the same text.

### Positioning (§4), reconstructed from the actual listing

This document's positioning template (`Target User / Problem / Current Alternative / Product Solution / Primary Benefit / Differentiator / Reason to Believe`) was never explicitly filled out as a named artifact, but every field is answerable from existing documents without inventing anything:

| Field | Answer, sourced from existing docs |
|---|---|
| Target User | "Urban/semi-urban Indian households employing part-time domestic staff" (`PRD.md`, `opportunity.json`) |
| Problem | Month-end disputes over attendance/wages when tracked informally (`opportunity.json`'s `problem` field) |
| Current Alternative | Notebook/memory, or ServiceBook/MaidExpense/Homemaid (named competitors, `reports/phase1-opportunity-selection.md`) |
| Product Solution | Offline attendance + continuous wage balance tracker (`PRD.md`) |
| Primary Benefit | "See exactly how much you owe, updated continuously" (`listing.md`) |
| Differentiator | No INTERNET permission at all (technically verifiable), Hindi+English, continuous balance vs. month-end-only (`opportunity.json`'s `differentiation` array) |
| Reason to Believe | The permission claim is checkable by any reviewer against the actual manifest — this is the strongest "reason to believe" mechanism available, stronger than a testimonial, and it's already being used as one. |

This confirms the *substance* this document wants already exists, scattered across `PRD.md`/`opportunity.json`/`listing.md` — it has just never been assembled into one named "Positioning" artifact. That is a real, low-cost, unclaimed gap, not a contradiction.

### Messaging hierarchy (§5) mapped to the actual listing text

- **Level 1 (one-line value prop)**: the short description, "Track domestic staff attendance and wages. No account, no ads, works offline." — matches this document's Level 1 definition closely.
- **Level 2 (core benefits)**: the full description's bulleted "What Hisaab does" list.
- **Level 3 (feature evidence)**: "Why Hisaab is different" bullets, each benefit paired with a mechanism (e.g., "no permission to connect to the internet" as the evidence for the privacy claim).
- **Level 4 (supporting proof)**: **Does not exist, correctly.** No testimonials, user counts, or measured results are claimed anywhere in the listing — because none exist yet (the app has never been installed by anyone but this project). This is the right outcome per this document's own §8 ("if evidence does not exist, the claim should be removed"), not a gap to fill by inventing Level 4 content prematurely.

### Claim validation (§8) — already covered in detail in `20-ASO.md`'s reconciliation

`20-ASO.md`'s reconciliation performed a claim-by-claim check of the same listing text against `SECURITY_REVIEW.md`/`PRIVACY.md`/`BackupManagerTest.kt`, and found four of five checked claims directly verified and one (Hindi language availability) overstated relative to the actual MVP's incomplete string externalization. That finding applies identically here under this document's §8 "claims must correspond to verified product behavior" — it is not re-litigated in duplicate; see that document for the specific evidence trail.

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §3 Marketing inputs (ProductSpec, audience, differentiators, competitive research, ASO research, campaign history) | **Most inputs exist as separate documents** (PRD, opportunity record, competitor research) that were never assembled through a formal "marketing generation" step — the listing copy was written directly by reading them, informally. |
| §6 Content types | **Only one type exists: store listing copy.** No landing page, blog post, social post, video script, email campaign, or referral message has been created for Hisaab. |
| §7 Content provenance (app ID, campaign ID, model, prompt version, timestamp, approval status) | **Does not exist as structured metadata.** `listing.md` is a plain Markdown file with no provenance header beyond its own prose disclosure ("all copy below is original... see reports/phase1-opportunity-selection.md"). |
| §9 Audience segmentation | **Single segment only** ("households employing domestic staff") — no segment-specific messaging variants exist, and none are needed yet at this scale. |
| §10 Content-to-distribution linkage | **Not applicable — `19-DISTRIBUTION.md` already established that no distribution channel or campaign exists to link content to.** |
| §11 Content experiments | **Does not exist — no experiment has run, no A/B variant of the listing copy exists.** |
| §12 Paid advertising as controlled experiment | **Not applicable — no advertising has been planned, spent, or even estimated.** Consistent with `14-COST-CONTROL.md`'s reconciliation. |
| §13 Community marketing constraints | **Not applicable — no community posting has occurred.** |
| §14 Spam prevention | **Consistent by absence — no automated posting exists to risk becoming spam.** |
| §15 Marketing feedback into product/onboarding | **Not applicable — no campaign has run to generate feedback**, and the one relevant feedback loop that *did* happen in this project ran in the opposite direction (competitor review complaints → product differentiation decisions during opportunity research), which is this document's §15 pattern applied to a competitor's marketing/product gap rather than Hisaab's own campaign data. |
| §16 Risk-tiered content approval | **Never formally exercised**, but the one piece of content that exists (the listing) was reviewed by this session against `SECURITY_REVIEW.md`/`PRIVACY.md` before being treated as reconciled here — informally matching this document's "Medium Risk: publishing organic content" tier's spirit, since a Play Store listing is externally visible copy, even though it was never actually submitted. |
| §17 Brand consistency (tone, visual system, prohibited claims, machine-readable brand rules) | **Does not exist as a formal system.** The one brand decision made — the app name "Hisaab," chosen deliberately as a generic Hindi/Urdu word rather than anything evoking a competitor's branding (`CLAUDE.md`'s IP-policy ground rules) — was a one-off naming decision, not a reusable, machine-readable brand-rules artifact other future apps could inherit. |
| §18/§19 Current implementation honesty, non-goals | Consistent — no marketing automation exists or is claimed; this reconciliation does not promise growth outcomes. |

### Summary

The substance this document wants (an evidence-backed, honestly-labeled positioning and message hierarchy) already exists for Hisaab, scattered across `PRD.md`, `opportunity.json`, and `listing.md` rather than assembled as this document's named `Positioning`/`ProductSpec`-derived artifact — and the one weak point already found (`20-ASO.md`'s Hindi-claim finding) applies here identically under this document's own §8. No marketing content generation, experiment tooling, or brand-rules system was implemented while writing this document.
