# Environment Report

Generated: 2026-09-18
Host: Linux container (x86_64), 4 vCPU, 15Gi RAM, ~30G free disk on `/`.

## Discovered tooling

| Tool | Status | Version | Notes |
|---|---|---|---|
| Node.js | ✅ | v22.22.2 | fine for orchestration scripts, CLI, or web dashboards later |
| npm / pnpm / yarn | ✅ | 10.9.7 / 10.33.0 / 1.22.22 | all present |
| Python | ✅ | 3.11.15 | chosen as the factory orchestration/scripting language |
| Java (JDK) | ✅ | OpenJDK 21.0.10 | required for Android/Gradle builds |
| Gradle | ✅ | 8.14.3 (Kotlin 2.0.21) | compatible with current Android Gradle Plugin |
| Git | ✅ | 2.43.0 | repo already initialized, remote `origin` → `github.com/yash9769/xyy` |
| Docker | ✅ | 29.3.1 | can run Android build images, Semgrep, Gitleaks, Trivy without local installs |
| Flutter / Dart | ❌ | — | not installed |
| Android SDK / `adb` / emulator | ❌ | — | not installed, no `ANDROID_HOME`/`ANDROID_SDK_ROOT` set |
| GitHub CLI (`gh`) | ❌ | — | not installed, but GitHub MCP tools (`mcp__github__*`) are available and preferred |
| Browser automation | ✅ (implicit) | Chromium via Playwright pre-installed at `/opt/pw-browsers` | usable for scraping public Play Store listing pages if ever needed, subject to ToS |
| Web search | ✅ | `WebSearch` tool available (deferred, loaded via ToolSearch) | primary tool for market/competitor research — no paid search API needed |
| MCP servers | ✅ | GitHub, Claude Docs, Google Drive, Canva, Gamma, Alloy (connecting) | GitHub MCP used for all repo/PR operations |
| Secrets present | Only generic session/cloud plumbing (`GH_TOKEN`, `GITHUB_TOKEN`, `AWS_*`, `CLOUDSDK_*`) — none are app-factory API keys | Do not assume any product API key exists; every external dependency must be explicitly provisioned later |

## What's missing and what to do about it

- **Android SDK / Gradle Android plugin / `adb` / emulator**: not installed. Not needed for Phase 0–2 (architecture, discovery, research). Required starting Phase 3 (app generation) and Phase 4 (on-device/emulator testing). **Recommendation: install command-line Android SDK tools + platform + build-tools inside a Docker image used only for build/test steps**, rather than polluting this container — keeps the environment reproducible and disposable. Do NOT install a full Android Studio GUI (no display, unnecessary weight).
- **Flutter/Dart**: intentionally not installed yet. The default stack decision (see ARCHITECTURE.md) is Kotlin + Jetpack Compose, so Flutter is not required unless a future opportunity specifically needs cross-platform (iOS) reach.
- **`gh` CLI**: not installed and not needed — GitHub MCP tools already cover repo, PR, issue, and Actions operations from inside this session.
- **Emulator**: real device testing / emulator boot needs KVM and a display-less config (`-no-window`); this container's virtualization support is unverified. **Recommendation: prefer Robolectric + JVM unit tests + Compose UI tests as the default automated test layer; treat instrumented/emulator tests as a Phase 4 stretch goal run in CI (GitHub Actions has emulator support), not required locally.**

## What should NOT be installed yet

- Flutter/Dart SDK — no confirmed need.
- Android Studio — no GUI, unnecessary.
- A database server (Postgres/MySQL/Mongo) — the factory's data model is small, versioned JSON is sufficient at this scale.
- Any paid research/analytics API (App Annie, Sensor Tower, etc.) — WebSearch + manual Play Store inspection covers Phase 0–2 needs at zero cost.
- Fastlane / Play publishing tooling — deferred to Phase 5, added only when the first app reaches release-candidate stage.

## Compatibility notes

- Gradle 8.14.3 + JDK 21 is compatible with recent Android Gradle Plugin (AGP 8.x) and Kotlin 2.0.x — no upgrade needed when Phase 3 starts.
- Docker is available, so all heavyweight/version-sensitive tools (Android SDK, Semgrep, Gitleaks, Trivy) can be pinned to container images instead of host installs, keeping this environment lightweight and reproducible across sessions.

## Assumptions

- No Google Play Developer account credentials exist yet in this environment; publishing automation (Phase 5) will need a service-account JSON supplied out-of-band by the owner, never committed to git.
- No production secrets should be assumed available; every generated app must read secrets from environment variables / CI secrets, never hardcoded.
- This is a fresh, empty repository (no prior commits) — the structure and docs in this commit constitute the actual first history of the project.
