# User Flows — Hisaab

## Flow 1: First launch (empty state)
1. App opens directly to the Staff List screen (no login, no onboarding wizard — the value is obvious enough not to need one).
2. Empty state: illustration-free, text-only "No staff added yet" + a prominent "Add staff member" button (per UX empty-state guidance in `factory/ARCHITECTURE.md`/template).
3. User taps "Add staff member" → Add/Edit Staff screen.

## Flow 2: Add a staff member
1. Add/Edit Staff screen: Name (required), Wage type (Monthly / Daily — radio), Wage amount (required, numeric), Role label (optional free text, e.g. "Cook").
2. Save → returns to Staff List, new staff member shown with ₹0 owed (no attendance marked yet).
3. Invalid input (empty name, non-numeric/negative wage) shows inline field error; Save is disabled until valid.

## Flow 3: Mark daily attendance
1. From Staff List, tap a staff member → Staff Detail screen (running balance at top, attendance calendar below).
2. Tap today's date (or any date in the current settlement period) → a 4-option chooser: Present / Absent / Half-day / Paid Leave.
3. Selecting an option immediately updates the calendar cell and the running balance at the top — no separate "save" step.
4. Re-tapping an already-marked date lets the user change or clear it.

## Flow 4: Record an advance
1. From Staff Detail, tap "Record advance" → small dialog: amount (required, positive), date (defaults to today), note (optional).
2. Save → advance appears in a chronological list on Staff Detail, running balance decreases immediately.

## Flow 5: Month-end settlement
1. From Staff Detail, tap "Settle this month" (only enabled once at least one attendance entry exists).
2. Settlement summary screen: days present/absent/half-day/leave, gross wage computed, total advances, net payable — all read-only, computed values.
3. "Confirm settlement" archives the current period (visible later under "Past settlements") and starts a new, empty attendance period for that staff member.
4. Cancel returns to Staff Detail without changes.

## Flow 6: Change language
1. Settings screen (reached from a gear icon on Staff List) → Language: English / हिंदी toggle.
2. Selecting applies immediately app-wide and persists across restarts (DataStore).

## Flow 7: Backup / restore
1. Settings → "Export backup" → Android share sheet opens with a single JSON file (`hisaab-backup-<date>.json`) the user can save/send anywhere they choose.
2. Settings → "Restore from backup" → system file picker → selecting a valid Hisaab backup file replaces current data after a confirmation dialog warning it's irreversible.
3. An invalid/corrupt file shows an error and makes no changes (fails closed).

## Flow 8: Empty / error / offline states
- Empty state: Flow 1 above (no staff yet) and "No advances recorded" text on a fresh Staff Detail screen.
- Error state: invalid form input (inline), invalid backup file (dialog with a clear message, no data loss).
- Offline: the entire app is offline by design — there is no network-dependent state to design for.
- Rotation/config change: all screen state (in-progress form input, selected date) survives rotation via ViewModel + `rememberSaveable` where appropriate.
- App restart: all persisted data (staff, attendance, advances, language) survives via Room + DataStore.
