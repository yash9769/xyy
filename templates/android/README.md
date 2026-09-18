# App Factory — Android base template

Kotlin + Jetpack Compose + Material 3. This is the reusable starting point for every app in
`apps/`. See `factory/ARCHITECTURE.md` §3 for why this stack was chosen over Flutter/React Native.

## What's included

- Gradle Kotlin DSL, version catalog (`gradle/libs.versions.toml`) — bump versions in one place.
- Material 3 theme with light/dark color schemes (`ui/theme/`) — dark mode follows the system
  setting by default (`isSystemInDarkTheme()`), no per-app work needed.
- Compose Navigation scaffold (`navigation/`) — add destinations to `Destinations.kt` and
  `AppNavHost.kt`.
- Reusable `LoadingState`, `EmptyState`, `ErrorState` composables (`ui/components/StateComponents.kt`)
  — every screen in every app should reuse these instead of hand-rolled equivalents.
- A `SettingsScreen` foundation (`settings/`) to extend, not replace.
- Accessibility defaults: lint's `ContentDescription` check is set to `error` (see `lint.xml`),
  loading indicators carry a semantic content description.
- Release build type with R8 minification + resource shrinking enabled; debug build type
  distinguishable via `.debug` applicationId suffix.
- `network_security_config.xml` blocking cleartext traffic by default; `data_extraction_rules.xml`
  set up for when `allowBackup` is deliberately turned on (off by default).
- Zero permissions declared by default — every generated app starts from "no permissions" and
  adds only what it specifically needs.
- Test structure: JVM unit test example (`src/test/`) and Compose UI test example
  (`src/androidTest/`).

## What's deliberately NOT included

- No dependency injection framework (Hilt/Koin) — manual constructor injection until an app
  genuinely grows past ~5 screens (see `CLAUDE.md`).
- No networking library (Retrofit/OkHttp) — add only when a specific app needs network access;
  most factory apps should be offline-first and need none.
- No analytics/ads SDK — add only per-app, with a documented reason in that app's `PRIVACY.md`.
- No custom font — system default font family, to avoid bundling/licensing decisions per app.
- No app icon beyond a placeholder circle — every app MUST replace `ic_launcher_foreground.xml`
  (and the `app_name` string, package name, applicationId) with its own original identity before
  any store submission. Never copy a competitor's icon or name.

## Using this template for a new app

1. Copy `templates/android/` into `apps/<app-id>/`.
2. Rename the package (`com.appfactory.template` → `com.appfactory.<app-id>`) in
   `app/build.gradle.kts` (`namespace`, `applicationId`) and move the Kotlin source tree to match.
3. Replace `app_name` in `strings.xml`, the launcher icon, and `TemplateApplication`/`MainActivity`
   class names/content with the app's own.
4. Add the app's real screens under a new package (e.g. `staff/`, `settings/`), wiring them into
   `AppNavHost.kt`.
5. Add only the dependencies the app actually needs (Room, DataStore are already in the version
   catalog since most factory apps need local persistence; remove what's unused).

## Building

```
cd apps/<app-id>
gradle assembleDebug     # or ./gradlew once a wrapper is generated
gradle bundleRelease
gradle test              # JVM unit tests
gradle lint
```

Requires: JDK 17+, Android SDK with `platforms;android-34` and `build-tools;34.0.0` installed,
`ANDROID_HOME`/`local.properties` pointing at it. See `factory/ANDROID_TOOLCHAIN.md` for this
factory's toolchain setup and any environment-specific blockers.

## Testing without a local emulator

Prefer JVM-only tests (`src/test/`, using Robolectric where a test needs Android classes) over
instrumented tests (`src/androidTest/`) for anything that can be expressed that way — they run in
seconds with no emulator/device needed, which matters in CI environments and sandboxes without
KVM/display access. Reserve `src/androidTest/` for the few things that genuinely need a real
device/emulator or a CI-hosted Gradle Managed Device.
