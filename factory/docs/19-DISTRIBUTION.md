Distribution Architecture

1. Purpose

Building an application does not create users.

Distribution is therefore a first-class stage of the App Factory lifecycle.

The factory should be capable of preparing, launching, measuring, and iterating distribution across multiple channels.

2. Core Principle

«Distribution must be measurable, controlled, and connected to product outcomes.»

The factory should not optimize for:

- impressions alone;
- follower count;
- downloads alone;
- arbitrary social engagement.

The objective is to determine whether distribution produces the intended user behavior.

3. Distribution Lifecycle

Target lifecycle:

RELEASE
  ↓
DISTRIBUTION PLAN
  ↓
CHANNEL SELECTION
  ↓
CONTENT / CAMPAIGN CREATION
  ↓
HUMAN APPROVAL WHERE REQUIRED
  ↓
LAUNCH
  ↓
MEASURE
  ↓
ANALYZE
  ↓
ITERATE / PAUSE / STOP

4. Distribution Channels

Potential channels include:

App Stores

- Google Play;
- alternative Android stores where relevant.

Organic Search

- app-store search;
- web search;
- landing pages;
- SEO content.

Social

- Instagram;
- YouTube;
- LinkedIn;
- Reddit;
- other relevant communities.

Direct Distribution

- WhatsApp;
- email;
- referrals;
- communities;
- partnerships.

Paid Acquisition

- Meta Ads;
- Google Ads;
- other advertising platforms.

The factory should select channels based on the application's target audience rather than automatically using every channel.

5. Distribution Hypothesis

Every application should have a documented distribution hypothesis.

Example:

Target user:
college students

Problem:
tracking shared expenses

Primary channel:
Instagram + WhatsApp

Hypothesis:
short-form practical finance content generates installs

The hypothesis should be testable.

6. Channel Selection

Channel selection should consider:

- target audience;
- geographic market;
- product category;
- acquisition cost;
- organic potential;
- content requirements;
- platform restrictions;
- available evidence.

The factory should not spend money on a channel merely because it is available.

7. Distribution Assets

The factory should eventually generate or manage:

- store listing;
- screenshots;
- promotional graphics;
- landing page;
- social posts;
- short-video scripts;
- video concepts;
- community posts;
- email copy;
- referral messaging;
- campaign configurations.

Generated assets remain subject to the applicable approval policy.

8. Campaign Model

A distribution campaign should record:

campaign_id
application_id
channel
objective
audience
creative
landing_destination
budget
start_time
end_time
status
metrics

9. Paid Campaigns

Paid advertising is an external financial side effect.

The factory may prepare:

- campaign plans;
- audience suggestions;
- creative;
- budget estimates;
- experiment designs.

Actual spending should require explicit authorization according to configured policy.

10. Organic Distribution

Organic channels should be treated as experiments rather than assumed free growth.

Track:

- content published;
- impressions;
- engagement;
- clicks;
- store visits;
- installs;
- activation;
- retention where available.

11. Attribution

Where technically possible, distribution should be attributable.

Possible dimensions:

channel
campaign
creative
content
landing_page
referral

Attribution should avoid claiming certainty when tracking is incomplete.

12. Distribution Funnel

The factory should measure the funnel:

Reach
 ↓
Engagement
 ↓
Click
 ↓
Store Visit
 ↓
Install
 ↓
Activation
 ↓
Retention
 ↓
Conversion

A high number at one stage does not imply success at downstream stages.

13. Launch Strategy

A new application should normally begin with a controlled launch rather than unrestricted scaling.

Possible sequence:

Small launch
 ↓
Collect evidence
 ↓
Identify bottleneck
 ↓
Improve
 ↓
Expand

The exact scale depends on budget and product risk.

14. Experimentation

Distribution experiments should change identifiable variables.

Examples:

- headline;
- screenshot order;
- creative;
- audience;
- channel;
- landing page;
- call to action.

Each experiment should define:

- hypothesis;
- variable;
- expected outcome;
- measurement;
- duration/sample requirement;
- decision rule.

15. Distribution Status

Campaigns should support states such as:

DRAFT
READY
AWAITING_APPROVAL
RUNNING
PAUSED
COMPLETED
FAILED

No campaign should silently move from planning to paid execution.

16. Distribution Budget

Distribution spending must integrate with "14-COST-CONTROL.md".

At minimum:

- planned budget;
- approved budget;
- actual spend;
- remaining budget;
- cost per acquisition where measurable.

17. Failure Handling

Distribution failures should be classified.

Examples:

- platform rejection;
- authentication failure;
- policy violation;
- content failure;
- tracking failure;
- API failure;
- budget exhaustion.

A failed channel should not automatically trigger unlimited retries.

18. Product-Distribution Feedback

Distribution data should feed back into product decisions.

Example:

Many store visits
+
low installs
        ↓
Investigate store listing / positioning

Another:

Many installs
+
low activation
        ↓
Investigate onboarding / product experience

The factory should propose hypotheses rather than automatically assuming the cause.

19. Current Implementation

The existing factory may not yet execute distribution campaigns.

It should nevertheless be architected so distribution can later become a controlled service rather than ad-hoc manual work.

No fake campaign results should appear in the dashboard.

20. Non-Goals

This document does not require immediate:

- automated advertising;
- influencer outreach;
- social-media automation;
- attribution infrastructure;
- viral-growth mechanisms.

These are later implementation capabilities.

---

## Reconciliation with current implementation (as of 2026-09-22)

**No distribution capability exists at all, and none has been claimed to exist.** This is the first document in the series describing a lifecycle stage that hasn't even been reached conceptually in this project — Hisaab has never left `RELEASE_CANDIDATE` (and, per `06-STATE-MACHINE.md`/`15-QUALITY-GATES.md`, hasn't legitimately earned that state either), so `PUBLISHED`, the prerequisite this document's own §3 lifecycle starts from ("RELEASE ↓ DISTRIBUTION PLAN"), has never occurred.

### Section-by-section status

| § | Requirement | Status |
|---|---|---|
| §3 Distribution lifecycle (plan → channel → content → approval → launch → measure → analyze → iterate) | **Not started at any point.** No application has published, so this lifecycle has no entry condition satisfied yet. |
| §4 Channel catalog | **Not evaluated for Hisaab.** No channel selection has been attempted. |
| §5 Documented distribution hypothesis | **Does not exist for Hisaab.** `apps/household-help-wage-tracker/PRD.md` and `store/listing.md` describe *who the app is for* (household budget-keepers managing domestic staff) but never state a distribution hypothesis in this document's specific shape (target user + problem + primary channel + testable hypothesis). This is a genuine, fillable gap, not a contradiction — nothing wrong exists, something useful is just missing. |
| §6 Channel selection criteria | **Not applicable — no selection has occurred.** |
| §7 Distribution assets | **Partially present, for store listing only.** `apps/household-help-wage-tracker/store/listing.md` has a title, short/full description, category recommendation, screenshot *plan*, and feature-graphic *plan* — but this is Play Store listing copy (covered more directly by `20-ASO.md`), not the broader asset set this document lists (landing page, social posts, video scripts, email copy, referral messaging, campaign configs) — none of which exist for Hisaab. |
| §8 Campaign data model | **Does not exist.** No `DistributionCampaign` schema exists (confirmed already in `10-DATA-MODELS.md`'s reconciliation), and no campaign of any kind has ever been created, planned, or drafted. |
| §9 Paid campaigns require explicit authorization | **Consistent by absence — nothing has been spent, planned, or authorized.** `apps/household-help-wage-tracker/MONETIZATION.md` explicitly defers all monetization *and* by extension all paid-acquisition decisions to a future, evidence-based iteration; this is the same "don't spend before there's evidence" discipline this document asks for, arrived at independently for a different (product monetization) reason. |
| §10 Organic distribution tracked as experiments | **Not applicable — no organic content has been created or published for Hisaab.** |
| §11 Attribution | **Not applicable — nothing to attribute.** |
| §12 Distribution funnel measurement | **Not applicable — no funnel stage past "release candidate" has been reached.** |
| §13 Controlled launch strategy (small → evidence → improve → expand) | **Not applicable yet**, though this document's instinct matches this project's own general approach: Hisaab itself was scoped as a small, single-opportunity MVP specifically to validate the factory process before scaling to more apps (`factory/ROADMAP.md`'s "minimum viable version of the factory" principle) — the same "validate small before expanding" logic this document applies to distribution, applied instead to the whole factory. |
| §14 Distribution experiments with defined variables/hypothesis/decision rule | **Does not exist — no experiment has run.** |
| §15 Campaign status enum (DRAFT/READY/AWAITING_APPROVAL/RUNNING/PAUSED/COMPLETED/FAILED) | **Does not exist.** No campaign object exists to be in any of these states. |
| §16 Distribution budget integrated with cost control | **Not applicable — `14-COST-CONTROL.md`'s reconciliation already established that no runtime budget tracking exists for anything, distribution included.** |
| §17 Distribution failure classification | **Not applicable — no distribution attempt has occurred to fail.** |
| §18 Product-distribution feedback loop | **Not applicable — no distribution data exists to feed back.** The closest analogue in this project is the *opposite* direction: competitor research fed into product differentiation (`reports/phase1-opportunity-selection.md`), not distribution data feeding into product decisions. |
| §19 No fake campaign results in the dashboard | **Verified true by inspection.** The dashboard's `/published` route renders an explicit stub (`renderStub('Published', 'No app has been published yet...')`, confirmed by reading `factory/dashboard/public/app.js` directly during the previous batch's reconciliation) and there is no `/distribution` or `/campaigns` route at all — not a stub, not a placeholder, simply absent, which is the correct way to represent a capability that hasn't been built rather than implying it exists in a minimal form. |
| §20 Non-goals | Consistent — no advertising, influencer, social, or attribution automation has been attempted or claimed. |

### Summary

This is the most straightforward reconciliation in the series so far: there is genuinely nothing to reconcile against, because distribution has not been reached. The one actionable, low-cost gap worth naming for whenever this becomes relevant: **Hisaab has no documented distribution hypothesis (§5)**, and writing one (target user, problem, primary channel, testable hypothesis) would be cheap, evidence-consistent work that doesn't require building any of this document's infrastructure — it would just be another paragraph in `PRD.md` or a new file alongside it. No distribution code, schema, or campaign was created while writing this document.
