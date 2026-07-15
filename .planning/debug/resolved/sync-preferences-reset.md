---
status: resolved
trigger: "Sync reports Failed and Settings jumps back to B1 and 6 words after local changes."
created: 2026-07-16
updated: 2026-07-16
---

# Debug Session: Sync Preferences Reset

## Symptoms
- Expected: locally saved CEFR and Story Word values remain visible during manual sync.
- Actual: manual sync reports `Failed` and Settings returns to the bootstrap values `B1` and `6`.
- Error: only the generic `Failed` status is visible.
- Timeline: reported against the current Settings implementation.
- Reproduction: change CEFR or Story Word goal, then press Sync Now.

## Resolution
- root_cause: Settings persisted changes locally but BootstrapProvider retained the startup snapshot. Any sync-status update changed the ready-state object and caused Settings to copy stale preferences again. BootstrapProvider also discarded the safe sync error message.
- fix: BootstrapProvider now owns preference updates, refreshes preferences from local storage after reconciliation, and retains the safe sync diagnostic. Settings reacts only to actual preference changes.
- verification: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed in `apps/mobile`.
- files_changed: Bootstrap provider/state, Settings state/screen, and regression tests.

## Evidence
- timestamp: 2026-07-16
  finding: Settings copied `readyState.preferences` whenever the complete ready-state object changed.
- timestamp: 2026-07-16
  finding: Bootstrap updated only `syncStatus` after local preference writes and discarded `SyncLocalChangesResult.errorMessage`.
- timestamp: 2026-07-16
  finding: all 108 project tests and Expo exports for Web, iOS, and Android passed after the fix.

## Eliminated
- hypothesis: the remote database is missing migrations.
  evidence: all local migrations are applied remotely and linked database lint reports no schema errors.
