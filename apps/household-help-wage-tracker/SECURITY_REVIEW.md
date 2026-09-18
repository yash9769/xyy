# Security review — Hisaab

Date: 2026-09-18. Reviewed at the source-code level (see `factory/ANDROID_TOOLCHAIN.md` — no
compiled APK/AAB exists to scan in this environment; every finding below states exactly what was
checked and how, per this factory's rule against a generic checklist that pretends everything was
tested).

## What was actually checked, and how

| Check | Method | Result |
|---|---|---|
| Hardcoded secrets/API keys | `gitleaks detect` (v8.16.0, installed via apt) run against `apps/household-help-wage-tracker/` and the whole repo | **PASS** — "no leaks found" in both scans |
| Exported Android components | Manual read of `AndroidManifest.xml` | `MainActivity` is `exported="true"` (required — it's the launcher activity) with only a `MAIN`/`LAUNCHER` intent-filter, no deep link scheme. `FileProvider` is `exported="false"` with `grantUriPermissions="true"` scoped to a cache-only path (`file_provider_paths.xml`). No other components declared. **PASS** |
| WebViews | `grep -rn "WebView"` across app + template source | No matches — the app has no WebView. **N/A / PASS** |
| Deep links / intent handling | Manual manifest read | Only the launcher intent-filter exists; no custom scheme/host `<data>` elements, so there is no deep-link attack surface to review. **PASS** |
| Permissions | Manual manifest read + `grep "uses-permission"` | **Zero permissions declared**, including no `INTERNET` — this is the app's core, independently-verifiable differentiator (see `PRIVACY.md`), not just a claim. **PASS**, and the strongest finding in this review |
| Network configuration / plaintext HTTP | `grep -rn "http://"` across source | Only XML namespace URIs (`http://schemas.android.com/...`), which are not network calls. `network_security_config.xml` additionally sets `cleartextTrafficPermitted="false"` as defense in depth even though no network permission exists to make any request. **PASS** |
| Debug logging of sensitive data | `grep -rn "Log\.\|println("` across app source | No matches — the app performs no logging at all. **PASS** |
| Debug vs release build config | Read of `app/build.gradle.kts` | Release: `isMinifyEnabled = true`, `isShrinkResources = true`, ProGuard files applied. Debug: unminified, `.debug` applicationId suffix so both variants can coexist without clobbering each other. **PASS** |
| Backup/data-extraction configuration | Read of `AndroidManifest.xml` + `data_extraction_rules.xml` | `android:allowBackup="false"` — Android's automatic cloud backup never runs. The extraction-rules file additionally excludes `database`/`sharedpref` domains, so even if a future version turns `allowBackup` on, it would not silently start backing up the local database to the user's Google account without a deliberate decision. **PASS** |
| Authentication | N/A — app design read | No accounts, no login, no auth token of any kind exist in the app (see `PRD.md` scope). **N/A** |
| Cryptography | N/A — app design read | The app stores no data that is encrypted/decrypted (Room's default SQLite storage, app-private, not additionally encrypted). This is disclosed, not hidden: `PRIVACY.md` does not claim "encrypted storage," only "on-device, app-private storage." **Documented, not a false claim** |
| Excessive data collection | Manual review of what's persisted (`data/Entities.kt`) | Only what the user explicitly enters about staff they employ (name, wage, attendance, advances) — no device identifiers, no analytics events are collected anywhere in the codebase. **PASS** |
| Third-party/unnecessary SDKs | Read of `app/build.gradle.kts` dependency list | AndroidX/Compose/Room/DataStore/AppCompat only — no ad SDK, no analytics SDK, no crash-reporting SDK. **PASS** |
| Dependency CVE scanning (Trivy) | Attempted — not available via apt in this environment, and pulling the OCI-hosted vulnerability DB was not pursued given the time budget | **NOT PERFORMED** — recorded honestly as a gap, not skipped silently. See "Known limitations" below. |
| Android Lint | Not run — requires the same blocked AGP toolchain as the full build | **NOT PERFORMED**, see `factory/ANDROID_TOOLCHAIN.md` |

## Findings

| # | Finding | Severity | Evidence | Impact | Remediation | Status |
|---|---|---|---|---|---|---|
| 1 | Dependency versions (AGP 8.5.2, Compose BOM 2024.10.00, Room 2.6.1, etc.) were pinned in September 2026 against library releases current roughly a year+ earlier; no live CVE database check was performed against them (Trivy unavailable in this environment) | MEDIUM | `gradle/libs.versions.toml` | Unknown — no specific CVE identified, but currency was not verified | Before any real release, run `./gradlew dependencyCheckAnalyze` or Trivy's filesystem scan against `gradle/libs.versions.toml` on a machine with registry access, and bump any flagged dependency | OPEN |
| 2 | Room's default SQLite storage is not additionally encrypted (e.g. via SQLCipher) | LOW | `data/HisaabDatabase.kt` | Data about employed staff (names, wages) is protected only by standard Android app sandboxing, not at-rest encryption beyond the OS's own full-disk encryption | Acceptable for v1 given the data sensitivity is low (not financial-account credentials, no third party ever sees it) and matches what `PRIVACY.md` actually claims; revisit only if user feedback signals this matters | ACCEPTED for v1, documented |
| 3 | Full build/lint/instrumented verification could not run in this environment (see `factory/ANDROID_TOOLCHAIN.md`) | CRITICAL (for release, not for this code review) | dl.google.com blocked | Cannot confirm the app compiles or passes lint without this being fixed | Re-run `./gradlew lint assembleDebug bundleRelease test` once the toolchain is unblocked, before any release candidate is trusted | OPEN — tracked in `reports/household-help-wage-tracker-release-candidate.md` |

## Summary

No secrets, no unnecessary permissions (zero permissions declared at all), no exported attack
surface beyond the required launcher activity, no logging of sensitive data, no plaintext network
traffic possible. The two OPEN findings are process gaps (no live CVE scan, no compiled build to
verify) rather than code defects found in what could be reviewed.
