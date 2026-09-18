# PRD — Hisaab (household-help-wage-tracker)

Opportunity record: `approved/household-help-wage-tracker/opportunity.json`. Research: `reports/phase1-opportunity-selection.md`.

## One core problem, one core user, one clear value proposition

- **Problem**: households tracking part-time domestic help attendance/wages informally have month-end disputes over days worked and amount owed.
- **User**: the household member who manages the budget and pays domestic staff.
- **Value proposition**: always know exactly what you owe each staff member, today — with zero account, zero cloud, and a language you're comfortable in.

## App identity

- Name: **Hisaab** (Hindi/Urdu for "ledger/accounts" — a common, non-trademarked descriptive word already used generically by apps in this space, e.g. competitor terms "Hajiri"/"Udhari"; not copied from any specific competitor's branding).
- Package ID: `com.appfactory.hisaab`
- Category: Finance / Productivity (household utility)

## Scope (MoSCoW)

### MUST HAVE (Phase 1 MVP)
1. Add/edit/remove a staff member (name, monthly or daily wage rate, optional role label).
2. Mark daily attendance per staff member: Present / Absent / Half-day / Paid Leave.
3. Record an advance (amount + date + optional note) against a staff member.
4. Running balance: at any time, show "amount owed so far this month" per staff member, computed continuously from attendance + wage rate − advances.
5. Month-end settlement view: total days present/absent/half-day/leave, gross wage, advances deducted, net payable, with a "mark as settled" action that archives the month and starts a fresh one.
6. Hindi / English UI language toggle in Settings, applied app-wide, persisted locally.
7. Local backup: export all data to a single file via the Android share sheet; import/restore from that file.
8. Zero account, zero login, zero network permission.

### SHOULD HAVE (documented, not built in Phase 1 unless time allows)
- Multiple households / staff-type grouping (cook vs. maid vs. driver) shown as separate sections.
- Per-staff free-text notes field.
- Simple bar/line view of attendance history for the current month.

### NOT NOW (explicitly out of scope for v1)
- Multi-device sync or cloud backup of any kind.
- UPI/payment collection integration.
- PDF/WhatsApp export of settlement summaries (a v2 candidate if users ask, but adds surface area not needed to validate the core loop).
- Push notifications/reminders.
- Multi-user (e.g. two family members editing the same data) — single-device, single-user only.
- Any advertising or analytics SDK.

Any scope addition during implementation must be recorded here with a reason before being built — no silent scope creep.

## Success criteria for Phase 1

The app installs, lets a user add a staff member, mark a week of attendance, record an advance, see a correct running balance, and settle the month — end to end, with automated tests covering the wage-calculation logic (the one piece of business logic in the app that must never be wrong).
