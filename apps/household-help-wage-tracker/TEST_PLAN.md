# Test plan — Hisaab

## Unit tests (JVM, no Android dependency needed) — `WageCalculatorTest`
- Monthly wage, all days present → gross wage == full monthly amount.
- Monthly wage, some absences → pro-rated correctly.
- Monthly wage, half-days → counted as 0.5 toward present days.
- Daily wage, N present days → `N * dailyRate`.
- Zero present days → gross wage == 0 (not a crash/NaN).
- Advances exceeding gross wage → net payable can go negative; verify it's not silently clamped to zero (a real, disclosed edge case, not hidden).
- Boundary: 0 total working days in period (e.g. settling on day 1) → no divide-by-zero.

## Unit tests — Room DAOs (Robolectric or in-memory Room DB)
- Insert/query staff member round-trip.
- Attendance entry upsert (marking the same date twice updates, doesn't duplicate).
- Sum of advances for a staff member within a date range.

## Compose UI tests (Robolectric + `compose-ui-test`, no emulator required)
- Staff List empty state shows "No staff added yet" and an Add button.
- Adding a staff member with invalid input (empty name) keeps Save disabled and shows the field error.
- Marking an attendance date updates the visible running balance text.
- Settlement screen shows correct totals for a fixed fixture (3 present, 1 half-day, 1 absent, 1 advance).

## Manual/exploratory checks (documented, run once, not automated in Phase 1)
- Rotate device mid-form-entry on Add Staff screen → input preserved.
- Force-close and reopen app → previously entered staff/attendance/advances still present.
- Export backup, uninstall, reinstall, import backup → data restored exactly.
- Import a corrupted/non-Hisaab JSON file → app shows an error, makes no partial changes.
- TalkBack pass over Staff List and Add Staff screens → all interactive elements have content descriptions, focus order is logical.

## Static analysis / build verification
- `./gradlew lint` — must pass with no new suppressions.
- `./gradlew assembleDebug` — debug APK builds.
- `./gradlew bundleRelease` — release AAB builds.
- `./gradlew test` — all unit tests pass.
- `./gradlew testDebugUnitTest` (Robolectric/Compose UI tests) — pass.

## What "done" means for Phase 1
All unit tests and Compose UI tests above pass, lint passes, debug APK and release AAB both physically exist on disk with their paths/sizes recorded in the release-candidate report. Manual/exploratory checks are executed once and their results recorded, not left unverified.
