# Monetization — Hisaab

## v1 (Phase 1): free, no ads, no IAP

Rationale: the app's core differentiation is trust (no account, no cloud, no INTERNET permission at all). Adding an ad SDK in v1 would require network permission and third-party code, directly contradicting the value proposition being tested. The goal of Phase 1 is to validate the factory pipeline and get real usage signal, not extract revenue from an unvalidated MVP.

## Future options (Phase 6 iteration decision, not decided now)

- **One-time "support the developer" purchase** (Play Billing, no subscription) — lowest friction, doesn't compromise the offline/no-account claim, no new permissions needed (Play Billing doesn't require INTERNET permission declared by the app itself in the same way ad SDKs do — this would need re-verification against Play Billing's actual manifest requirements before implementing).
- **Pro tier**: multiple households, PDF export — only if user feedback specifically requests it (see `PRD.md` NOT NOW list).
- Explicitly ruled out: ad-supported free tier (contradicts the trust differentiation), subscription model (adds recurring-payment friction disproportionate to a small utility).

Any monetization change is a scope decision made against real usage data per `factory/config/kill-criteria.yaml`'s minimum-observation-window principle — not before.
