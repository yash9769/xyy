# Privacy — Hisaab

Verified against the actual `AndroidManifest.xml` and `app/build.gradle.kts` in
`SECURITY_REVIEW.md` (zero permissions declared, no third-party SDKs) — not just asserted here.
The one caveat: none of this was verified against a *compiled* APK (see
`factory/ANDROID_TOOLCHAIN.md`), only against source, so a build-time manifest merge surprise
cannot be fully ruled out until a real build runs.

## Data collected
- Staff member names, wage amounts, attendance records, and advance records — entered directly by the user, about people the user employs (not the user's own personal data, but personal data about third parties, handled with the same care).
- No name, email, phone number, or any identifier of the *app user* is collected.
- No device identifiers, no analytics events, no crash reports are collected.

## Where it's stored
100% on-device, in a local Room (SQLite) database and a local DataStore preferences file. Nothing is transmitted anywhere, because the app requests no `INTERNET` permission — confirmed directly against `AndroidManifest.xml` in `SECURITY_REVIEW.md`.

## Retention
Data persists until the user deletes it (removing a staff member) or uninstalls the app. No server-side retention exists because no server exists.

## Third parties
None. No ad SDK, no analytics SDK, no crash-reporting SDK, no cloud backup service.

## Permissions requested
- Storage-adjacent access only via the Android Storage Access Framework for export/import (no broad storage permission — SAF file picker/share-sheet intents don't require a manifest permission on modern Android).
- No `INTERNET`, no location, no contacts, no camera/microphone.

## Account requirement
None. No sign-up, no login, no linked Google/email account.

## Claims discipline
Every claim above is checked against source in `SECURITY_REVIEW.md` — none is asserted without evidence, per the factory's rule against unsupported privacy claims. This document should be re-verified against a compiled build once `factory/ANDROID_TOOLCHAIN.md`'s blocker is resolved, before any Play Store submission.
