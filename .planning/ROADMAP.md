# Roadmap: Context-English

## Milestones

- ✅ **v1.0 Bubble/Sorbet UI refresh** — Phases 1-2 (shipped 2026-07-05)
- 🚧 **v1.1 App Bootstrap Loading** — Phase 3 (planned)

## Phases

<details>
<summary>✅ v1.0 Bubble/Sorbet UI refresh (Phases 1-2) — SHIPPED 2026-07-05</summary>

- [x] Phase 1: Bubble Foundation (5/5 plans) — completed 2026-07-04
- [x] Phase 2: Shell And Series Screens (10/9 plans) — completed 2026-07-05

</details>

### 🚧 v1.1 App Bootstrap Loading (Planned)

- [ ] Phase 3: Bootstrap Hydration And Sync (0 plans)

#### Phase 3: Bootstrap Hydration And Sync

**Goal:** Restore local user state before settings-visible screens render, reconcile remote data during the same startup window when online, and replace the current default-settings flicker with explicit Bubble/Sorbet loading states.

**Requirements:** BOOT-01, BOOT-02, BOOT-03, SET-01, SET-02, SYNC-01, SYNC-02, SYNC-03

**Success criteria:**
1. App startup restores local settings and other persisted session data before settings-visible screens present user-specific values.
2. Startup shows a dedicated Bubble/Sorbet loading experience instead of rendering default settings that later jump to hydrated values.
3. Bootstrap kicks off local/remote sync when connectivity exists without delaying offline entry when no network is available.
4. Settings and adjacent user-data surfaces use explicit loading, loaded, error, and offline-aware states rather than silent fallback defaults.
5. Automated verification covers the bootstrap and sync behavior that changed, and the milestone still passes documented lint, typecheck, build, and relevant tests.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 1. Bubble Foundation | v1.0 | 5/5 | Complete | 2026-07-04 |
| 2. Shell And Series Screens | v1.0 | 10/9 | Complete | 2026-07-05 |
| 3. Bootstrap Hydration And Sync | v1.1 | 0/0 | Not started | - |
