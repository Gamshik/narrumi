---
phase: 01-bubble-foundation
plan: 01
subsystem: ui
tags: [react-native, expo, theme, tokens, layout, motion]
requires: []
provides:
  - Bubble/Sorbet semantic presentation tokens for surfaces, sheets, pills, badges, tabs, and motion.
  - Pure floating tab bar layout helper with safe-area-aware scroll padding.
  - Public theme barrel exports for the new helper contract.
affects: [01-bubble-foundation, shell-navigation, shared-primitives, mobile-presentation]
tech-stack:
  added: []
  patterns:
    - Semantic light/dark presentation tokens with matching key contracts.
    - Pure theme layout helpers tested through Node test runner.
key-files:
  created:
    - apps/mobile/src/presentation/theme/layout.ts
    - apps/mobile/src/presentation/theme/layout.test.ts
  modified:
    - apps/mobile/src/presentation/theme/tokens.ts
    - apps/mobile/src/presentation/theme/index.ts
key-decisions:
  - "Keep Bubble/Sorbet layout and motion values in the presentation theme layer so later primitives do not duplicate screen-local constants."
  - "Keep floating tab spacing pure and React Native-free so it remains testable with the existing tsx/node:test setup."
patterns-established:
  - "Floating tab content padding is derived from safe-area input plus shared tab layout tokens."
  - "Bubble/Sorbet theme additions preserve matched light/dark semantic keys."
requirements-completed: [VIS-01, VIS-03, VIS-04, MOT-01, MOT-02, QUAL-01]
coverage:
  - id: D1
    description: "Bubble/Sorbet semantic theme tokens expose matched light and dark roles for surfaces, sheets, pills, badges, tabs, and motion consumers."
    requirement: VIS-03
    verification:
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: other
        ref: "npm run lint"
        status: pass
    human_judgment: false
  - id: D2
    description: "Floating tab bar metrics derive bottom offset, tab height, and scroll content padding from safe-area input and shared tokens."
    requirement: VIS-04
    verification:
      - kind: unit
        ref: "src/presentation/theme/layout.test.ts#floatingTabBarMetrics reserves tab clearance with no bottom inset"
        status: pass
      - kind: unit
        ref: "src/presentation/theme/layout.test.ts#floatingTabBarMetrics includes a large bottom safe-area inset"
        status: pass
      - kind: unit
        ref: "src/presentation/theme/layout.test.ts#getFloatingTabBarContentPadding returns only the scroll padding"
        status: pass
    human_judgment: false
  - id: D3
    description: "Theme barrel exports the new layout helper contract for later shared primitives and screens."
    requirement: QUAL-01
    verification:
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
duration: 3 min
completed: 2026-07-02
status: complete
---

# Phase 01 Plan 01: Bubble/Sorbet Theme Foundation Summary

**Shared Sorbet theme tokens and safe-area-aware floating tab layout helpers for the mobile presentation layer.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-02T00:23:01Z
- **Completed:** 2026-07-02T00:26:03Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Extended `tokens.ts` with matched light/dark Bubble/Sorbet color roles for reusable surfaces, sheets, scrims, pills, badges, and tab surfaces.
- Added shared `tabBarLayout` and `motion` contracts for floating tab sizing, content clearance, press scale, selected scale, and spring constants.
- Added pure `floatingTabBarMetrics` and `getFloatingTabBarContentPadding` helpers with Node test coverage for zero and large bottom insets.
- Exported the layout helper from the public presentation theme barrel.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Bubble/Sorbet theme contracts** - `d86fd6f` (`feat`)
2. **Task 2 RED: Add failing floating tab layout helper coverage** - `b5bf32e` (`test`)
3. **Task 2 GREEN: Add floating tab layout helpers** - `9ca67f0` (`feat`)

_Note: Task 2 followed the TDD RED/GREEN gate. Task 1 added token constants and was verified by the plan's `npm run typecheck` command._

## Files Created/Modified

- `apps/mobile/src/presentation/theme/tokens.ts` - Adds semantic Bubble/Sorbet surface, sheet, pill, badge, tab layout, and motion token contracts.
- `apps/mobile/src/presentation/theme/layout.ts` - Adds pure safe-area-aware floating tab metrics and content-padding helpers.
- `apps/mobile/src/presentation/theme/layout.test.ts` - Tests zero inset, large iPhone-style inset, and padding-only helper behavior.
- `apps/mobile/src/presentation/theme/index.ts` - Re-exports the layout helper contract from the public theme barrel.

## Verification

- `cd apps/mobile; npm run test -- src/presentation/theme/layout.test.ts` - passed, 40 tests passed.
- `cd apps/mobile; npm run lint` - passed.
- `cd apps/mobile; npm run typecheck` - passed.
- `cd apps/mobile; npm run build` - passed, Expo export completed.

## Decisions Made

- Kept new Bubble/Sorbet roles in the existing `AppColorTokens` contract so light and dark themes must stay key-compatible at typecheck time.
- Derived floating tab content padding from `tabBarLayout` instead of duplicating numeric constants in later screens.
- Kept `layout.ts` free of React Native imports so spacing behavior can be tested with the existing `tsx --test` command.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The planned focused test command runs the full existing `src/**/*.test.ts` glob plus the provided file argument because of the package script shape. This did not block execution; all tests passed.
- `roadmap.update-plan-progress` rewrote the Phase 1 roadmap row using a compact progress schema that did not match this project's roadmap table. The malformed row was repaired to preserve the original schema with a 1/3 progress note.

## Known Stubs

None in files created or modified by this plan.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can consume the shared Bubble/Sorbet token roles and motion constants. Plan 03 can wire the floating tab helper into `SorbetTabBar` and scrollable route content without inventing another spacing formula.

## Self-Check: PASSED

- Found `apps/mobile/src/presentation/theme/layout.ts`.
- Found `apps/mobile/src/presentation/theme/layout.test.ts`.
- Found task commit `d86fd6f`.
- Found task commit `b5bf32e`.
- Found task commit `9ca67f0`.
- Confirmed no tracked files were deleted by task commits.

---
*Phase: 01-bubble-foundation*
*Completed: 2026-07-02*
