# Requirements: Context-English

**Defined:** 2026-07-06
**Core Value:** The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## v1 Requirements

Requirements for the v1.1 milestone. Each maps to roadmap phases.

### Bootstrap

- [x] **BOOT-01**: User waits on a dedicated bootstrap loading state before settings-visible screens render user-specific preferences for the current session.
- [x] **BOOT-02**: User sees locally persisted settings and session data restored before the app falls back to server-backed values.
- [x] **BOOT-03**: User sees a Bubble/Sorbet loading experience that explains the app is preparing their session while bootstrap work is in progress.

### Settings

- [x] **SET-01**: User never sees placeholder default settings rendered as if they were their saved preferences while hydration is still in progress.
- [x] **SET-02**: User sees explicit loading, loaded, error, or offline-aware settings states instead of a layout jump when settings data changes source.

### Sync

- [x] **SYNC-01**: User gets a local/remote sync attempt during bootstrap whenever connectivity is available.
- [x] **SYNC-02**: User can enter the app offline without bootstrap hanging because the remote sync step is treated as complete when no internet connection exists.
- [x] **SYNC-03**: User sees locally available data even if remote sync fails, with the failure surfaced through explicit state rather than silent fallback defaults.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Learning Screens

- **LEARN-01**: User can read the episode reader, Story Words flow, dictionary, and translation surfaces fully aligned with the Bubble/Sorbet mockups.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New learning mechanics or review systems | The milestone fixes startup hydration and sync UX, not product scope |
| Reworking the full reader or Story Words visual refresh | Deferred from the placeholder roadmap into a later milestone |
| Blocking startup on mandatory remote availability | Conflicts with the local-first and offline-friendly architecture |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | Phase 3 | Complete |
| BOOT-02 | Phase 3 | Complete |
| BOOT-03 | Phase 3 | Complete |
| SET-01 | Phase 3 | Complete |
| SET-02 | Phase 3 | Complete |
| SYNC-01 | Phase 3 | Complete |
| SYNC-02 | Phase 3 | Complete |
| SYNC-03 | Phase 3 | Complete |

**Coverage:**

- v1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after initial definition*
