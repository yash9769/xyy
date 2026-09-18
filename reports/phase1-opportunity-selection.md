# Phase 1 — Opportunity Selection

Date: 2026-09-18
Research method: WebSearch (see sources cited inline). No download/revenue/review-count figures are invented; where a number could not be verified it is marked ESTIMATE or omitted.

## Opportunity considered and rejected first: offline bill-splitting

Initial candidate was "split a shared bill/expense offline without an account" (the category Splitwise dominates). Research found genuine Splitwise complaints — daily transaction caps on the free tier, 10-second interstitial ads, mandatory accounts for every participant, and paywalled features ([Finny Blog](https://getfinny.app/blog/best-splitwise-alternatives-2026), [Kimola feedback report](https://kimola.com/reports/splitwise-app-feedback-report-uncover-user-insights-google-play-en-144452)) — but a second search for exactly this differentiation ("offline, no account, no ads, free") turned up at least seven live Google Play competitors already occupying it: Splital (100,000+ installs), Splitter, Splid, Tricount, Expense Splitter, Bill Splitter: Share Expenses ([Google Play search results](https://play.google.com/store/apps/details?id=com.splital.project)). **Rejected**: the specific gap is already filled by multiple established, free competitors. Building a near-identical entrant here would be "copy + 3 random features," not a validated gap — rejected per the factory's own decision framework, not chosen.

## Selected opportunity: household-help attendance & wage tracking

### PROBLEM
Many Indian households pay part-time domestic help (maid/cook/driver) on a per-day or per-month basis with irregular attendance, occasional advances ("udhari"), and leave days. This is currently tracked manually (notebooks, memory, or WhatsApp messages), leading to disputes over how many days were worked and how much is owed at month-end.

### TARGET USER
Urban/semi-urban Indian households employing one or more part-time domestic staff (maid, cook, driver, gardener), typically the person in the household who manages the household budget.

### EXISTING SOLUTIONS (VERIFIED via Google Play search results)
- **ServiceBook — "Maid, Staff & Milk Attendance"** (`com.lokeshjain.servicebook`): free, tracks attendance ("Hajiri"), advances ("Udhari"), auto-calculates salary, WhatsApp PDF export, marketed as fully offline — but its own listing states version 3.1.3 added "Smart Cloud Backup" via **Google Sign-In**, i.e. it now asks for an account/cloud tie-in it didn't originally have.
- **MaidExpense** (`com.imars.maidexpense`): expense/attendance tracking, multi-user support.
- **Homemaid** (`com.homemaid.app`): labor management — overtime, days worked, absences, monthly pay.
- **MaidCircle** (iOS only, per its App Store listing): attendance → salary auto-calc, advances/loans, digital payment history — "limited reviews" noted by search results, suggesting low traction even in its own niche.
- Several employee-attendance/payroll apps (SalaryBox, Employee Attendance Management) exist but target small businesses, not households, and are noticeably heavier (multi-employee, invoicing, PDF reports) than what one household needs.

Source: [Google Play search results for "maid/domestic help salary attendance calculator app Android"](https://play.google.com/store/apps/details?id=com.lokeshjain.servicebook&hl=en_IN).

### USER PAINS (from the above listings and general category knowledge; each labeled by confidence)
- INFERRED: Disputes at month-end over exact days worked/owed, because tracking is informal (notebook/memory) where no app is used at all — this is the app category's entire premise, corroborated by every competitor independently building the same "attendance → auto salary" feature.
- VERIFIED_FACT: The most visible incumbent (ServiceBook) is moving from "100% offline, no cloud" toward requiring Google Sign-In for its newer backup feature — a direct precedent for the exact trust erosion this factory's principles (data minimization, no account unless required) are meant to avoid.
- ESTIMATE: Existing apps in this niche appear to be small, single-developer, low-review-count products (MaidCircle explicitly noted as having "limited reviews"; none of the found apps show mainstream download counts comparable to Splitwise-tier apps) — suggesting quality/design bar is low and an attentive, well-designed entrant has room to differentiate on polish alone. This is an estimate, not a verified download/rating figure.
- OPINION (from competitor marketing copy, not independently verified): all claim "offline" and "auto-calculate salary" as their core hooks, confirming this is the expected minimum feature set for the category.

### GAPS
1. No found competitor advertises regional-language UI (Hindi and other Indian languages) despite the target user base being Hindi/regional-language-first in many households — a plausible, testable localization gap.
2. The one clear market leader is drifting toward a cloud account, leaving room for a strictly-local, zero-account, zero-network-permission alternative as an explicit trust differentiator.
3. None of the found listings mention a pre-month-end "settlement preview" (a running "amount owed so far this month" view) — most seem to calculate salary only at explicit month-end, not continuously, which is a concrete UX improvement, not a copy of any specific competitor's screen.

### PROPOSED SOLUTION
A small, offline-only Android app ("Hisaab") that lets a household track one or more staff members' daily attendance (present/absent/half-day/leave), record advances, and see a running, always-up-to-date wage balance — with zero account, zero network permission, and a Hindi/English toggle.

### DIFFERENTIATION
- **No account, ever — enforced by not requesting the `INTERNET` permission at all** (not just a policy promise; a verifiable technical fact reviewers/users can check). Directly answers the trust gap opened by ServiceBook's move to Google Sign-In.
- **Running mid-month balance view**, not just an end-of-month calculation — reduces the dispute-at-payday problem the whole category exists to solve.
- **Hindi + English UI toggle** from day one — addresses the localization gap none of the found competitors advertise.
- Local-only backup/restore via a single exportable file (share sheet), so users keep the "backup my data" convenience without trading away the no-account claim.

This is a genuine differentiation set (trust/privacy posture, a workflow improvement, and localization), not a reskin of ServiceBook's UI or feature copy — no competitor code, art, or text is used; only the problem and feature *category* (attendance→wage calculation) is shared, which is the level of similarity every competitor in this space already shares with each other.

### MONETIZATION
`free` for v1 (no ads, no IAP) — the goal of Phase 1 is to validate the factory pipeline and get real usage signal, not monetize immediately. Monetization (e.g. a one-time "support the developer" IAP, or a Pro tier with multiple households) is a Phase 6 iteration decision made after real usage data, per `factory/config/kill-criteria.yaml`'s minimum-observation-window principle.

### TECHNICAL COMPLEXITY
Low. Single-user, single-device, local storage only (Room database). No backend, no auth, no network calls. Core logic (attendance → wage calculation) is simple arithmetic over a small local dataset — ideal for a small, well-tested MVP.

### MAINTENANCE COMPLEXITY
Low. No server to operate, no third-party SDKs beyond AndroidX/Compose, no API to keep compatible with a backend that could change under it.

### IP RISK
Low. "Attendance-based wage tracking" is a functional problem category, not a proprietary invention (multiple independent apps already implement it); no code, art, text, or branding is copied from any competitor.

### POLICY RISK
Low. No sensitive permissions beyond local storage; no ads, no tracking SDKs, no personal data leaves the device — straightforward Play Console Data Safety declaration (see `apps/<id>/PRIVACY.md`, Phase 1 §14).

### ESTIMATED MVP SCOPE
MUST HAVE: add/edit staff member, mark daily attendance, record advances, running balance view, month-end settlement view, Hindi/English toggle, local export/import backup.
SHOULD HAVE: multiple staff members, per-staff notes.
NOT NOW: multi-device sync, cloud backup, payment collection/UPI integration, invoicing/PDF export, push notifications.

### WHY THIS SHOULD BE TESTED
It is a real, evidenced pain (multiple independent apps solving the same problem, one incumbent visibly drifting from the exact trust posture this factory wants to default to), it is small enough to build and fully test within Phase 1's scope, it requires zero backend/infra (matching the $0-cost target), and its "no account, ever" claim is independently verifiable by any reviewer or user — a strong, honest differentiation story rather than a marketing claim.
