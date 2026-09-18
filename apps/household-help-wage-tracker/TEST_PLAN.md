# Test plan — Hisaab

## Verification status (see factory/ANDROID_TOOLCHAIN.md for why)

Gradle could not run in this environment (AndroidX/Compose/Room/AGP are all served from the
blocked `dl.google.com`), so the full test suite below is written but **not run via Gradle**.
However, the two pure/near-pure-Kotlin logic units — `WageCalculator` and `BackupManager` — have
**zero AndroidX dependency** and were independently verified for real: a standalone Kotlin
compiler (2.0.21, fetched from `github.com/JetBrains/kotlin` releases — a different host than the
blocked one, and not an Android-specific artifact) plus JUnit 4 and `org.json` from Maven Central
were used to compile and actually execute `WageCalculatorTest` (8 tests) and `BackupManagerTest`
(5 tests) outside Gradle. **Result: 13/13 passed.** This is real evidence for the app's single
most important piece of logic (wage math) and its data-integrity-critical backup path, not a
Gradle-verified build of the whole app — the Compose UI, Room DAOs, and full build remain
unverified and are listed as the CRITICAL blocker in the release-candidate report.

## Unit tests (JVM, no Android dependency needed) — `WageCalculatorTest` — VERIFIED, 8/8 pass
- Monthly wage, all days present → gross wage == full monthly amount.
- Monthly wage, some absences → pro-rated correctly.
- Monthly wage, half-days → counted as 0.5 toward present days.
- Daily wage, N present days → `N * dailyRate`.
- Zero present days → gross wage == 0 (not a crash/NaN).
- Advances exceeding gross wage → net payable can go negative; verify it's not silently clamped to zero (a real, disclosed edge case, not hidden).
- Boundary: 0 total working days in period (e.g. settling on day 1) → no divide-by-zero.

## `BackupManagerTest` — VERIFIED, 5/5 pass (export/parse round-trip, null-optional-field round-trip, invalid JSON fails closed, wrong schema version fails closed, missing required field fails closed — not a crash)

## Unit tests — Room DAOs (Robolectric or in-memory Room DB) — NOT YET RUN (needs Gradle/AndroidX)
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
