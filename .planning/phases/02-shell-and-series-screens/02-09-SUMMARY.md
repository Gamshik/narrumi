---
phase: 02-shell-and-series-screens
plan: 09
subsystem: ui
tags: [react-native, expo, UI, Bubble/Sorbet, gap-closure]
requires:
  - phase: 02-shell-and-series-screens
    provides: "Diagnosed Phase 02 UAT gaps"
provides:
  - "Compact unframed Home create action"
  - "Stable Bubble-style setup modal actions"
  - "Static Series Details continue/prep surface"
  - "Custom Bubble segmented CEFR control remains in Settings"
affects: [02-shell-and-series-screens, phase-2-uat]
tech-stack:
  added: []
  patterns:
    - "Presentation-only Bubble actions with fixed loading-safe dimensions"
key-files:
  created: []
  modified:
    - apps/mobile/src/presentation/app/MobileApp.styles.ts
    - apps/mobile/src/presentation/app/screens/HomeScreen.tsx
    - apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx
key-decisions:
  - "Kept the Home create action unframed so it reads as a compact CTA instead of a bordered hero card."
  - "Kept Generate text stable during loading and used the existing loading status row for busy feedback."
  - "Used BubbleButton and BubbleSurface primitives instead of new dependencies or custom service logic."
requirements-completed:
  - SCR-01
  - SCR-02
  - SCR-03
  - SCR-04
  - SCR-09
coverage:
  - id: D1
    description: "Auth keyboard structure remains corrected."
    requirement: "SCR-01"
    verification:
      - kind: static
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Keyboard flicker and panel stability require device visual UAT."
  - id: D2
    description: "Home create action is compact and no longer a bordered hero card."
    requirement: "SCR-02"
    verification:
      - kind: static
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Final compactness against design/bubble/home.png requires visual UAT."
  - id: D3
    description: "Create and edit setup modal headers use fixed Bubble actions that do not resize during generation."
    requirement: "SCR-03"
    verification:
      - kind: static
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Header stability while tapping Generate requires visual interaction UAT."
  - id: D4
    description: "Series Details continue/prep card is a static surface with an inner action button."
    requirement: "SCR-04"
    verification:
      - kind: static
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Visual hierarchy against design/bubble/series.png requires manual UAT."
  - id: D5
    description: "Settings keeps the custom BubbleSegmentedControl for CEFR selection."
    requirement: "SCR-09"
    verification:
      - kind: static
        ref: "npm run lint && npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Native-control absence and visual parity require manual Settings inspection."
duration: 12min
completed: 2026-07-05
status: complete
---

# Phase 02 Plan 09: UAT Gap Closure Summary

**Closed the remaining automated Phase 02 gap-plan work for compact Home setup, stable setup modal actions, and Series Details action hierarchy.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T13:52:00+03:00
- **Completed:** 2026-07-05T14:04:23+03:00
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- Converted the Home create panel from a bordered hero card into a compact unframed action row while preserving the create-series action.
- Promoted Generate and Save in create/edit setup modals to fixed-size Bubble buttons so the header does not shift when generation starts.
- Changed the Series Details continue/prep callout to a static Bubble surface with a contained action button.
- Preserved the existing custom BubbleSegmentedControl Settings implementation and verified no native segmented-control path is used.

## Task Commits

1. **Task 1: Fix Auth Screen Layout** - already present before this execution pass.
2. **Task 2: Fix Home Screen Hero and Series Cards** - `ef4ea5c` (fix)
3. **Task 3: Fix Setup Modals and Series Details Card Layout** - `ef4ea5c` (fix)
4. **Task 4: Implement BubbleSegmentedControl for Settings** - already present before this execution pass.

## Files Created/Modified

- `apps/mobile/src/presentation/app/MobileApp.styles.ts` - Added fixed modal action sizing, compact CTA layout, and static banner sizing.
- `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` - Replaced the large create hero surface with a compact unframed action row.
- `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` - Used BubbleSurface and BubbleButton for the continue/prep callout and fixed setup modal actions.
- `.planning/phases/02-shell-and-series-screens/02-09-PLAN.md` - Marked the plan as `gap_closure: true` so `--gaps-only` can discover it.

## Verification

- `npm run lint` - passed.
- `npm run typecheck` - passed.
- `npm run test` - passed, 42 tests.
- `npm run build` - passed, Expo export completed web, Android, and iOS bundles.

## Decisions Made

- Left busy-state wording out of the Generate button to prevent layout reflow; the existing loading status row continues to provide the progress message.
- Kept Settings code unchanged because the custom Bubble segmented control was already implemented and verified by the current imports.
- Did not mark `02-UAT.md` gaps as passed because final screenshot/device visual UAT still requires human confirmation against the design images.

## Deviations from Plan

- **[Rule 3 - Existing partial implementation] Auth and Settings tasks were already present** - Found during: plan preflight | Issue: Plan 02-09 had already been partially applied, but the summary overstated modal and banner completion | Fix: completed only the remaining Home/modal/details gaps and rewrote the summary to match actual state | Files modified: `HomeScreen.tsx`, `SeriesDetailsScreen.tsx`, `MobileApp.styles.ts`, `02-09-PLAN.md`, `02-09-SUMMARY.md` | Verification: lint, typecheck, test, build all passed.

**Total deviations:** 1 auto-fixed. **Impact:** reduced scope to the missing gap work without undoing prior valid changes.

## Issues Encountered

- Final visual UAT was not performed in this environment. The remaining user-facing decision is whether the updated Home and setup modal visuals now satisfy `design/bubble/home.png` and `design/bubble/newseries.png`.

## Next Phase Readiness

Phase 02 automated gap closure is ready for manual visual UAT through `$gsd-verify-work 02`.

## Self-Check: PASSED

- Found all modified production files.
- Confirmed no new dependencies or native project files were introduced.
- Confirmed automated verification commands passed.
- Confirmed final visual UAT remains explicitly unclaimed.
