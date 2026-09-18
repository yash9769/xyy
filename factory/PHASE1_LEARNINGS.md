# Phase 1 learnings

Written from direct experience building the first vertical slice (household-help-wage-tracker /
Hisaab), not from theory. See `reports/household-help-wage-tracker-release-candidate.md` for the
concrete outcome.

## What worked

- **The file-based contract between pipeline stages** (opportunity.json → approved/ → apps/<id>/)
  held up exactly as designed — no stage needed to know about another stage's internals, and the
  whole trail is readable straight out of git history.
- **Rejecting the first opportunity idea on evidence** (offline bill-splitting was already crowded)
  before building anything is exactly what the factory's scoring/research philosophy is for. The
  second idea (household-help wage tracking) had a much cleaner differentiation story because it
  was chosen *after* real competitive research, not before.
- **Escalating a genuine environment blocker instead of working around it** produced a better
  outcome than silently degrading scope would have: the two workarounds investigated (an
  unofficial third-party SDK mirror, and routing around the org policy) were both correctly
  rejected, and the user got an accurate picture of what's actually blocked.
- **Testing what could be tested, honestly labeled.** `WageCalculator` and `BackupManager` have
  zero AndroidX dependency, so fetching a standalone Kotlin compiler from GitHub (not a Google
  host) plus JUnit4/`org.json` from Maven Central gave real, run test results (13/13 passing) for
  the app's two most correctness-critical pieces, instead of leaving 100% of the test plan
  unverified. This is a reusable pattern (see "Opportunities for Phase 2" below).
- **The template's "why not more architecture" discipline** (no DI framework, no repository
  interfaces over Room DAOs) kept the app small enough to write and reason about in one pass, with
  a single clear place for business logic (`domain/WageCalculator.kt`).

## What failed / was fragile

- **Assuming `google()`/`maven.google.com` reachability meant AGP/AndroidX were reachable was
  wrong** — it took an actual `gradle wrapper` failure to discover that `maven.google.com` just
  redirects to the blocked `dl.google.com` for every artifact. A `curl` HEAD/301 check alone was
  misleading; only following the redirect (or actually invoking Gradle) revealed the real state.
- **The Gate 1 approval flow was manual/ad-hoc** (a Python one-liner printing a summary, then an
  `AskUserQuestion` call) rather than a first-class CLI command. `appfactory approve <id>` moves
  the files but doesn't itself render the approval summary — that logic lived in a throwaway shell
  command this time.
- **Writing ~2,500 lines of Kotlin without a compiler in the loop is inherently risky** — several
  real bugs were caught only by careful manual re-reading (a `createdAt` overwrite bug on staff
  edit, a `null.toString()` bug in JSON parsing, a FileProvider authority mismatch between debug
  and release build variants). A compiler would have caught none of these either, but a linter or
  even `kotlinc -d /dev/null` type-checking pass would have caught some. This is the strongest
  argument for fixing the toolchain blocker before Phase 2 does this again at scale.

## Manual steps that were repetitive

- Copying `templates/android/{settings.gradle.kts,build.gradle.kts,gradle.properties,gradle/libs.versions.toml,lint.xml}` into the app directory and adjusting `rootProject.name`/`namespace`/`applicationId` by hand.
- Manually re-deriving the package rename across every Kotlin file's `package` declaration and
  import statements (done here with `sed`, but ad hoc, not a repeatable script).
- Re-typing near-identical `AndroidManifest.xml`, `data_extraction_rules.xml`, and
  `network_security_config.xml` boilerplate between the template and the app, with only the
  application/activity class names differing.

## Fragile steps

- The mid-month "running balance" period-derivation logic (finding the most recent settled
  period, defaulting to month-start otherwise) is the single most complex piece of app-specific
  logic and has no automated test yet (it lives in `StaffDetailViewModel`, which does depend on
  Android/Room and so could not be verified standalone this session) — this is the highest-value
  target for the first Robolectric test once the toolchain is unblocked.
- `AppCompatDelegate.setApplicationLocales` was implemented per current documented convention but
  its actual runtime behavior (whether Compose recomposition alone suffices vs. requiring activity
  recreation on older API levels) could not be verified at all — flagged as a LOW-severity unknown
  in the release-candidate report rather than asserted to work.

## Missing automation (concrete Phase 2/3 candidates)

- **A real `appfactory build <id>` command** that does the copy-and-rename template step
  mechanically (Phase 3 is exactly this — this session did it by hand and it was error-prone
  exactly where automation would help: package renaming, manifest boilerplate).
- **A `appfactory approve <id>` that renders the Gate 1 summary itself**, rather than a one-off
  script, so every future opportunity gets the same approval-summary format for free.
- **A standalone-compiler pre-check step** (`appfactory precheck <id>` or similar) that runs any
  zero-Android-dependency Kotlin modules (`domain/`, pure data-transform code) through a fast
  Kotlin-compiler-only pass as a cheap correctness gate *before* a full Gradle build is attempted —
  this session's manual version of that (fetching kotlinc + JUnit + Maven Central `org.json`) is
  worth turning into a reusable script in `factory/testing/`.

## Useful reusable components produced

- `templates/android/` itself — theme, navigation scaffold, state components, settings foundation,
  manifest/lint/ProGuard defaults — ready to be copied for app #2.
- The "zero permissions by default, add deliberately" manifest pattern and matching
  `network_security_config.xml`/`data_extraction_rules.xml` pair.
- The pattern of testing pure-Kotlin business logic (`domain/` package with zero AndroidX imports)
  standalone, independent of whatever Android toolchain state the environment is in.

## Architecture problems discovered

None that require revisiting `factory/ARCHITECTURE.md`'s decisions (Kotlin+Compose stack, no DI
framework, file-based pipeline contract all held up). The one real gap was environmental
(toolchain reachability), not architectural.

## Opportunities for Phase 2

- Build the "standalone Kotlin compiler pre-check" into `factory/testing/` as a real, reusable
  script, since it proved valuable and will keep being valuable in any environment where the full
  Android toolchain is unavailable or slow to set up.
- Automate the research → opportunity-record pipeline a bit further: this session's research was
  entirely manual `WebSearch` calls synthesized by hand into `opportunity.json`; a script that at
  least scaffolds the evidence array from search results would reduce transcription risk.
- Turn the Gate 1 approval-summary printout into a real `pipeline.py` function so it's consistent
  across every future opportunity, not reconstructed each time.
