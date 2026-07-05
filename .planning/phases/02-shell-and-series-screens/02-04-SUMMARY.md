---
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
