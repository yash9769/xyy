# Play Console "Data safety" section — draft inputs

Based on source-level verification in `SECURITY_REVIEW.md`. Re-confirm against the actual APK's
manifest (via `bundletool` or the Play Console's own manifest inspection) before submitting, since
this was not verified against a compiled build.

- **Does your app collect or share any of the required user data types?** No.
- **Is all user data encrypted in transit?** N/A — no data is transmitted (no INTERNET permission).
- **Do you provide a way for users to request that their data is deleted?** Yes — uninstalling the
  app deletes all local data; the app also allows deleting individual staff records in-app.
- **Data types collected:** None of the standard Play Data Safety categories apply — the app
  collects no data about the *device user*. (Staff attendance/wage records are data the user
  enters about third parties for the user's own local record-keeping, not data collected by the
  app about its user, and never leaves the device.)
- **Permissions declared:** none (verified against `AndroidManifest.xml` in `SECURITY_REVIEW.md`).

## Permissions explanation (for the store listing's permissions section)
Hisaab requests zero Android permissions. Backup export/import uses Android's built-in file
picker and share sheet (Storage Access Framework), which do not require a declared permission on
modern Android versions.
