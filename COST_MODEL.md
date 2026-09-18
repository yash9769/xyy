# Cost Model

Principle (§27): prefer free/local solutions; every paid service needs a stated reason. This is reviewed and updated as the factory grows — treat numbers as current estimates, not commitments.

## One-time costs

| Item | Cost | When | Required? |
|---|---|---|---|
| Google Play Developer account | $25 (one-time) | Before Phase 5 (any publish, even internal testing) | Yes — unavoidable to ship on Play |

## Recurring costs — Phase 0–4 (discovery through pre-release QA)

| Item | Cost | Notes |
|---|---|---|
| Compute (this container / local dev) | $0 | Already provisioned |
| GitHub repo hosting | $0 | Public/private repo on existing GitHub account |
| GitHub Actions CI minutes | $0 | Free tier (2,000 min/month private, unlimited public) — sufficient for JVM test/lint runs per app |
| WebSearch for research | $0 | Included in Claude Code, no separate API key |
| Security scanners (gitleaks, semgrep, Android Lint, Trivy) | $0 | All have free/OSS tiers, run via Docker |
| Claude Code usage itself | (existing subscription/plan cost) | Not counted here — it's the orchestration layer, already paid for independent of this project |

**Total Phase 0–4 recurring cost: $0.**

## Recurring costs — Phase 5+ (publishing and beyond)

| Item | Cost | Notes |
|---|---|---|
| Privacy policy hosting | $0 | Static page on GitHub Pages satisfies Play's requirement |
| Play Developer Reporting API access | $0 | Included with the developer account |
| Crash reporting (if added) | $0 | Prefer Play Console's built-in Android Vitals over adding Firebase Crashlytics, unless a specific app needs richer crash grouping |
| Analytics (if added) | $0 | Default to none for simple utilities (data minimization, §19); if genuinely needed, prefer Play Console's own install/retention stats before adding a third-party SDK |
| Ad monetization SDK (if a given app monetizes via ads) | $0 to integrate, revenue-share on earnings | AdMob is free to integrate; cost is the trust/privacy tradeoff, documented per-app in that app's `PRIVACY.md` |

**Total Phase 5+ recurring cost: effectively $0**, beyond the one-time $25 Play fee, as long as every app stays within free-tier CI minutes and avoids paid SDKs.

## Explicit non-goals (do not add without a specific, evidenced need)

- Paid app-intelligence platforms (Sensor Tower, App Annie/data.ai, AppFollow) — WebSearch + manual Play Store inspection is the default; revisit only if a specific opportunity's evidence quality is blocked without it.
- A hosted backend/database (Supabase, Firebase Firestore, custom server) — default to offline-first, local storage; add only when a specific app's core value proposition requires sync or multi-device state.
- A paid LLM API wired into the CLI — Claude Code (already paid for) is the AI layer; do not add a second metered API for tasks Claude Code already does interactively.
- Any subscription analytics/BI tool — Markdown reports in `reports/` are sufficient at this portfolio size.

## Review cadence

Re-check this file whenever: a new external dependency is proposed, before Phase 5 kickoff (real account costs start), and after the first app reaches production (to true-up assumptions with real Play Console billing/revenue data).
