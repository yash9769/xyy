# Android toolchain — Phase 1 status: BLOCKED (network policy)

## What was determined

Minimum toolchain needed to compile Kotlin + Jetpack Compose, run JVM tests, and produce a
release AAB:
- JDK 17+ (have: OpenJDK 21.0.10 — sufficient)
- Gradle 8.7+ for AGP 8.5.x (have: system Gradle 8.14.3 — sufficient)
- Android Gradle Plugin 8.5.2 + Kotlin Gradle plugin 2.0.21 (resolved from Google's Maven repo — **blocked**, see below)
- Android SDK platform `android-34` (`android.jar`) + `build-tools;34.0.0` (from the SDK repository — **blocked**, see below)
- No emulator required for Phase 1: JVM unit tests + Robolectric-backed Compose UI tests are the default test layer (see `templates/android/README.md` "Testing without a local emulator"), so `adb`/emulator absence is not a blocker for this phase.

## What is actually blocked, and why

This session's egress proxy denies `dl.google.com` under organization policy (confirmed via
`curl -sS http://127.0.0.1:<proxy-port>/__agentproxy/status`, which logs `connect_rejected` /
`403` for that host). Two independent attempts to work around this were investigated and both
lead back to the same blocked host:

1. **Ubuntu's `google-android-*-installer` apt packages** (`google-android-platform-34-installer`,
   `google-android-cmdline-tools-13.0-installer`, etc. — present in `apt-cache search android-`)
   are thin wrappers: their `postinst` script (`dpkg-deb -e` inspected directly) runs a `make
   install` that downloads the real SDK component from `dl.google.com` by default. Their debconf
   template does offer one alternate mirror, `http://mirrors.neusoft.edu.cn` — **not used**: it is
   an unofficial third-party mirror for security-sensitive SDK binaries, which is a supply-chain
   risk this factory's principles explicitly guard against, and using it would also just be
   routing around the same organization policy rather than resolving it.
2. **`maven.google.com`** (the "modern" alias for Google's Maven repository, which Gradle's
   `google()` repository shorthand is often assumed to use) was independently reachable
   (`curl` returned `301`) — but following the redirect shows it 301s straight to
   `https://dl.google.com/dl/android/maven2/...` for every artifact tested (confirmed against the
   Android Gradle Plugin's own POM). **This means the block is not limited to SDK platform
   downloads** — it covers the entire Google-hosted Maven repository that AndroidX, Jetpack
   Compose, Room, and the Android Gradle Plugin itself are published from. Running `gradle
   wrapper` against the template's `build.gradle.kts` reproduced this exactly: plugin resolution
   for `com.android.application:8.5.2` failed with the same `dl.google.com` connection rejected
   in the proxy's failure log.

Docker (installed, `docker --version` succeeds) cannot help either: there is no running daemon in
this container (`docker info` / `docker pull` fail with "cannot connect to the Docker daemon"), so
a pre-built Android build image is not an available workaround here.

No pre-existing Android SDK, `android.jar`, or cached AndroidX/Compose artifacts were found
anywhere on disk (`find / -iname "android-*.jar"` and `find / -path "*/platforms/android-*"` both
empty).

## What this means for Phase 1

**No Gradle build of the app or the template could be executed or verified in this environment.**
This is reported honestly rather than worked around, per this repository's own rule (`CLAUDE.md`,
`factory/ROADMAP.md` §32 "do not claim success without verification") and per the general
instruction not to retry or route around an organization policy denial.

What *was* still produced despite this: complete, carefully-written Kotlin + Gradle Kotlin DSL
source for both `templates/android/` and `apps/household-help-wage-tracker/`, following current
AGP/Compose/Room conventions as precisely as possible without a compiler to check them against.
This is explicitly flagged as **unverified** everywhere it matters — most importantly in
`reports/household-help-wage-tracker-release-candidate.md`, where it is recorded as a CRITICAL
release blocker, not glossed over.

## What unblocking requires

The organization's egress policy for this session needs `dl.google.com:443` allowed (not just
`maven.google.com`, since that redirects to the same host). Once that is done, from
`templates/android/` or `apps/<app-id>/`, the intended one-time setup is:

```bash
# Install just the SDK components this factory needs, not the full Android Studio bundle:
sdkmanager --sdk_root=/opt/android-sdk "platform-tools" "platforms;android-34" "build-tools;34.0.0"
export ANDROID_HOME=/opt/android-sdk
echo "sdk.dir=$ANDROID_HOME" > local.properties

# Verify:
java -version
gradle --version
sdkmanager --sdk_root=$ANDROID_HOME --list | head -20

# Then the real build/test/verify commands documented in templates/android/README.md and
# apps/household-help-wage-tracker/TEST_PLAN.md.
```

No emulator/`sdkmanager "system-images;..."` package is planned to be installed even once
unblocked — JVM/Robolectric tests remain the default per this factory's testing strategy, with
instrumented tests deferred to CI (which has real emulator support) as noted in
`factory/ROADMAP.md` Phase 4.
