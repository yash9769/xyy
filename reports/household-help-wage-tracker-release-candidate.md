# Release-candidate report — Hisaab (household-help-wage-tracker)

Date: 2026-09-18

## BUILD STATUS: NOT BUILT — CRITICAL BLOCKER

No `./gradlew assembleDebug` or `bundleRelease` could be run in this environment. Root cause is
fully documented in `factory/ANDROID_TOOLCHAIN.md`: this session's egress policy blocks
`dl.google.com`, and `maven.google.com` (Gradle's usual `google()` repository) 301-redirects every
artifact request to that same blocked host — so the Android Gradle Plugin, AndroidX, Jetpack
Compose, and Room can none of them be resolved by Gradle here, not just the SDK platform. This was
reproduced directly: running `gradle wrapper` against the template failed resolving
`com.android.application:8.5.2` with the identical blocked-host error. **No debug APK and no
release AAB exist on disk. This is not a claim of a failed build — no build was possible.**

## TEST STATUS: PARTIAL — the parts that could run for real, did, and passed

- `WageCalculator` (zero AndroidX dependency): compiled and executed standalone with a Kotlin
  compiler fetched from `github.com/JetBrains/kotlin` (a different, non-Google host) plus JUnit4
  from Maven Central. **8/8 tests passed.**
- `BackupManager` (only depends on `org.json`, available as a real Maven Central artifact):
  same method. **5/5 tests passed.**
- Compose UI tests, Room DAO tests, `./gradlew lint`: **not run** — all require the blocked
  toolchain.
- Manual/exploratory checks from `TEST_PLAN.md` (rotation, force-close/restart, backup round-trip
  on a real device, TalkBack pass): **not run** — no installable build exists to test them on.

## SECURITY STATUS: source-level review complete, see SECURITY_REVIEW.md

No secrets (gitleaks, real scan, clean). Zero permissions declared, confirmed directly against
`AndroidManifest.xml` — including no `INTERNET` permission, the app's core differentiator. No
WebView, no logging, no exported attack surface beyond the required launcher activity. Two open
gaps, both process gaps rather than code defects: no live dependency-CVE scan (Trivy unavailable
here), and no compiled-build verification (same root cause as BUILD STATUS above).

## PRIVACY STATUS: verified against source, not yet against a compiled build

`PRIVACY.md` claims are checked against actual manifest/dependency-list content, not asserted —
see `SECURITY_REVIEW.md`. Remaining caveat: a manifest-merge surprise from a dependency (unlikely
given the dependency list, but not something source review alone can rule out) can only be
excluded by inspecting the actual merged manifest from a real build.

## MVP FEATURES — implemented (source complete, unbuilt)

Add/edit staff member, mark daily attendance (Present/Absent/Half-day/Leave), record advances,
continuous running mid-month balance, month-end settlement with period archiving, Hindi/English
language toggle (DataStore + `AppCompatDelegate` per-app locale), local JSON export/import backup
via FileProvider + Storage Access Framework, zero permissions.

## KNOWN BUGS

None found in the parts that could be tested (`WageCalculator`, `BackupManager` — 13/13 passing).
The Compose UI/Room layer is unverified, so latent bugs there cannot be ruled out — this is a
known limitation, not a claim of correctness.

## KNOWN LIMITATIONS

1. **No compiled build exists** (CRITICAL — see BUILD STATUS).
2. Most in-app UI strings are hardcoded in Kotlin rather than externalized to `strings.xml`/
   `values-hi/strings.xml` — the language-toggle *mechanism* is wired up and demonstrated via
   `app_name`, but full UI translation is scoped as a fast-follow, not done in this MVP (flagged
   in `values-hi/strings.xml`'s own comment).
3. Placeholder launcher icon (a plain checkmark glyph) — must be replaced with a real designed
   icon before any store submission (`templates/android/README.md` and `store/listing.md` both
   flag this).
4. No live dependency-CVE scan performed.
5. `AppCompatDelegate.setApplicationLocales`'s behavior on API <33 without an `AppCompatActivity`
   base class was written per current documented conventions but could not be verified to actually
   trigger a locale-resource reload at runtime without a real build/device.

## PACKAGE ID
`com.appfactory.hisaab` (debug variant: `com.appfactory.hisaab.debug`)

## VERSION
`versionCode 1`, `versionName "0.1.0"`

## APK/AAB PATH
**None — does not exist.** No path to report.

## AAB SIZE
**N/A — no AAB exists.**

## STORE READINESS
Listing copy, privacy policy draft, and Data Safety draft inputs are written (`store/`) but
explicitly marked unverified against a real build; screenshots cannot be captured without an
installable app. Store submission is blocked on the same toolchain issue as BUILD STATUS.

## RELEASE BLOCKERS

| Blocker | Severity |
|---|---|
| No Android SDK/AndroidX/Compose/AGP toolchain reachable in this environment (`dl.google.com` blocked) — no build possible | **CRITICAL** |
| Full UI string externalization for Hindi not complete | MEDIUM |
| Placeholder launcher icon needs real design | MEDIUM |
| No live dependency-CVE scan performed | MEDIUM |
| `AppCompatDelegate` locale-switch behavior unverified at runtime | LOW (mechanism follows documented convention; only verification is missing, not a known defect) |

**This release candidate is NOT ready to build a release, let alone publish**, until the CRITICAL
blocker is resolved (an environment with `dl.google.com` reachable, or an equivalent SDK/Maven
mirror the organization is willing to allow). Once unblocked, the immediate next steps are exactly
those listed in `factory/ANDROID_TOOLCHAIN.md`'s "What unblocking requires" section, followed by
the full `TEST_PLAN.md` suite and a re-verification pass on this report before Gate 3 (release
candidate approval) can honestly be requested.
