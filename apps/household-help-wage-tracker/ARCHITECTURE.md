# App architecture — Hisaab

Kept intentionally simple, per `CLAUDE.md`: no unnecessary abstraction layers, no DI framework, no repository-pattern ceremony beyond what the app's size justifies.

## Stack

- Kotlin, Jetpack Compose, Material 3 (inherited from `templates/android/`).
- Single Gradle module (`app`) — no multi-module split; the app is too small to justify one.
- **Persistence**: Room (staff, attendance entries, advances, settled periods) — chosen over DataStore because the data is relational (staff → attendance/advances) and needs simple queries (sum advances by staff/period).
- **Settings** (language choice): Jetpack DataStore (Preferences) — simple key-value, no need for Room here.
- **State management**: one `ViewModel` per screen (StaffListViewModel, StaffDetailViewModel, SettingsViewModel), exposing `StateFlow` to Compose via `collectAsStateWithLifecycle`. Manual constructor injection of the Room DAOs — no Hilt (per template guidance: add a DI framework only past ~5 screens; this app has 4).
- **Navigation**: Compose Navigation, single `NavHost` in `MainActivity`.
- **Localization**: Compose's built-in string resources (`strings.xml` + `values-hi/strings.xml`), switched via an in-app `AppCompatDelegate.setApplicationLocales` call driven by the DataStore preference — no custom i18n framework.

## Data model (Room entities)

- `StaffMember(id, name, wageType[MONTHLY|DAILY], wageAmount, roleLabel?, createdAt)`
- `AttendanceEntry(id, staffId, date, status[PRESENT|ABSENT|HALF_DAY|LEAVE])`
- `Advance(id, staffId, amount, date, note?)`
- `SettledPeriod(id, staffId, periodStart, periodEnd, grossWage, totalAdvances, netPayable, settledAt)`

## Core business logic (the one place correctness matters most)

`WageCalculator` (plain Kotlin, no Android dependencies — fully unit-testable in the JVM without Robolectric):
- `grossWage(wageType, wageAmount, presentDays, halfDays, totalDaysInPeriod): Double`
- `netPayable(grossWage, totalAdvances): Double`
- Monthly wage is pro-rated by `(presentDays + 0.5*halfDays) / totalWorkingDaysInPeriod` — a documented, testable assumption; daily wage is `(presentDays + 0.5*halfDays) * dailyRate`, no pro-ration needed.

## Why not more architecture

No repository interfaces wrapping Room DAOs (the DAOs already are the repository — adding an interface layer with one implementation is the unnecessary abstraction `CLAUDE.md` warns against). No use-case/interactor layer — ViewModels call DAOs/`WageCalculator` directly; the app has one real business rule, not enough complexity to justify a use-case layer.
