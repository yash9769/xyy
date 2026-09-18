# Privacy — Hisaab (preliminary, verified against implementation in the privacy review step)

## Data collected
- Staff member names, wage amounts, attendance records, and advance records — entered directly by the user, about people the user employs (not the user's own personal data, but personal data about third parties, handled with the same care).
- No name, email, phone number, or any identifier of the *app user* is collected.
- No device identifiers, no analytics events, no crash reports are collected.

## Where it's stored
100% on-device, in a local Room (SQLite) database and a local DataStore preferences file. Nothing is transmitted anywhere, because the app requests no `INTERNET` permission — a claim that will be verified directly against the built `AndroidManifest.xml` in `SECURITY_REVIEW.md`, not just asserted here.

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
This document will be re-checked against the actual built manifest and dependency list before being finalized (see `SECURITY_REVIEW.md`) — no privacy claim here is allowed to outlive verification against real code, per the factory's rule against unsupported privacy claims.
