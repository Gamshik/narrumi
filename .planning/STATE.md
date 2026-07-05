---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Bubble/Sorbet UI refresh
current_phase: 2
current_phase_name: shell-and-series-screens
status: complete
stopped_at: Completed 02-shell-and-series-screens UAT
last_updated: "2026-07-05T14:43:00.000Z"
last_activity: 2026-07-05
last_activity_desc: Milestone v1.0 Bubble/Sorbet UI refresh completed
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Current Position

Phase: 02 (shell-and-series-screens) — COMPLETE
Plan: 5 of 5
Status: Milestone complete — all v1.0 phases finished
Last activity: 2026-07-05 — Milestone v1.0 Bubble/Sorbet UI refresh completed

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02)

**Core value:** The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.
**Current focus:** Phase 02 — shell-and-series-screens

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 01-bubble-foundation P01 | 3 min | 2 tasks | 4 files |
| Phase 01-bubble-foundation P02 | 7 min | 3 tasks | 8 files |
| Phase 01-bubble-foundation P03 | 18 min | 3 tasks | 5 files |
| Phase 01-bubble-foundation P04 | 6 min | 3 tasks | 9 files |
| Phase 02-shell-and-series-screens P02 | 25 min | 3 tasks | 2 files |
| Phase 02-shell-and-series-screens P04 | 20 min | 3 tasks | 2 files |

## Decisions

- [Phase 01-bubble-foundation]: Keep Bubble/Sorbet layout and motion values in the presentation theme layer so later primitives do not duplicate screen-local constants.
- [Phase 01-bubble-foundation]: Keep floating tab spacing pure and React Native-free so it remains testable with the existing tsx/node:test setup.
- [Phase 01-bubble-foundation]: Keep shared Bubble primitives presentation-only by accepting theme/display props and forwarding callbacks instead of importing app, domain, infrastructure, persistence, AI, or sync modules.
- [Phase 01-bubble-foundation]: Use JellyPressable as the single tactile press base for BubbleButton and pressable BubblePill controls.
- [Phase 01-bubble-foundation]: Use the existing pure floating tab layout helper as the single source for tab bottom offset and baseline route/list content clearance.
- [Phase 01-bubble-foundation]: Keep LevelBadge and DictionaryWordDetailsSheet as display-data consumers while using BubblePill and BubbleSheet for reusable visual chrome.
- [Phase 01-bubble-foundation]: Export Bubble primitives through the shared app barrel for later screen refresh phases without adding new dependencies or crossing presentation boundaries.
- [Phase 01-bubble-foundation]: Use shared motion.pressScale and motion.pressedOpacity as the single stronger press feedback contract instead of per-screen magic values.
- [Phase 01-bubble-foundation]: Replace Settings native Switch with a reusable BubbleToggle that receives existing ThemeProvider state and semantic colors without adding persistence or app logic.
- [Phase 01-bubble-foundation]: Keep the dictionary route-owned native formSheet configuration unchanged and fix fitToContents by removing flex expansion from the dictionary sheet content path.
- [Phase 02-shell-and-series-screens]: Used `useAppTheme` directly in `HomeScreen.tsx` to provide `colors` to Bubble shared components instead of rewriting `MobileApp.styles.ts` contract to bubble `colors` outward.
- [Phase 02-shell-and-series-screens]: ---

phase: 02-shell-and-series-screens
plan: 04
subsystem: ui
tags: [react-native, expo, UI, Bubble/Sorbet]

requires:

  - phase: 02-shell-and-series-screens
    provides: Series details mockups and navigation primitives
provides:

  - Series details layout matching design/bubble/series.png
  - Prioritized continue/prep card
  - Restyled conditional series memory card
  - Bubble/Sorbet episode history cards

affects: [02-shell-and-series-screens]

tech-stack:
  added: []
  patterns: [BubbleSurface for cards, shared primitives]

key-files:
  created: []
  modified:

    - apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx
    - apps/mobile/src/presentation/app/MobileApp.styles.ts

key-decisions:

  - "Used BubbleSurface for episode history rows instead of custom views."
  - "Used BubbleStatus for loading and error states."

patterns-established:

  - "Use BubbleSurface for lists containing soft cards."

requirements-completed:

  - SCR-04
  - MOT-03

coverage:

  - id: D1
    description: "Series details put the continue/prep-next-episode card immediately below the header as the strongest visual priority."
    requirement: "SCR-04"
    verification:

      - kind: automated_ui
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Requires visual confirmation of hierarchy."

  - id: D2
    description: "Series memory is hidden when empty and shown as a richer Bubble/Sorbet card only when memory content exists."
    requirement: "SCR-04"
    verification:

      - kind: automated_ui
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Requires visual check of conditional rendering."

  - id: D3
    description: "Setup editing stays as a small header action with clear disabled/read-only styling after the first episode."
    requirement: "SCR-04"
    verification:

      - kind: automated_ui
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Requires manual check of button state."

  - id: D4
    description: "Episode history uses soft episode cards with title, summary, status, and compact read/delete actions."
    requirement: "SCR-04"
    verification:

      - kind: automated_ui
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Requires visual check of styling."

  - id: D5
    description: "Details loading, error, deleting, disabled, read-only, and empty-history states use stable Bubble/Sorbet feedback."
    requirement: "MOT-03"
    verification:

      - kind: automated_ui
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Requires visual check of the BubbleStatus integration."

duration: 20min
completed: 2026-07-05
status: complete
---

# Phase 02 Plan 04: Execute series details screen styling Summary

**Restyled Series Details screen with prioritized continue/prep card, memory surface, and soft episode history cards.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-05T06:51:24Z
- **Completed:** 2026-07-05T06:53:35Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Restyled the series details header and primary action hierarchy to prioritize the continue/prep card.
- Implemented conditional rendering of the series memory section as a richer Bubble/Sorbet card.
- Restyled episode history as soft Bubble/Sorbet cards with title, summary, status, and compact actions.
- Replaced basic error and loading texts with `BubbleStatus` components.

## Task Commits

1. **Task 1: Promote continue/prep card and header hierarchy** - `9ef96ff` (feat)
2. **Task 2: Render memory only when content exists** - `9ef96ff` (feat)
3. **Task 3: Restyle episode history cards and deletion state** - `9ef96ff` (feat)

_Note: All 3 tasks were committed atomically in a single commit containing all related UI updates._

## Files Created/Modified

- `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` - Updated to use `BubbleSurface`, `BubbleStatus`, and new layout structures.
- `apps/mobile/src/presentation/app/MobileApp.styles.ts` - Added styles for episode cards and removed deprecated list styles.

## Decisions Made

- Used existing `BubbleSurface` primitive with `variant="card"` to create episode history rows, aligning with Bubble/Sorbet guidelines.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Ready for the final plan 05 of this phase to handle Settings screen styling.

---
*Phase: 02-shell-and-series-screens*
*Completed: 2026-07-05*

## Session

**Last session:** 2026-07-05T14:40:00.000Z
**Stopped at:** Phase 02 complete, ready to plan Phase 3
**Resume file:** None
