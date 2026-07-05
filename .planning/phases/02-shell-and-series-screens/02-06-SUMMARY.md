---
phase: 02-shell-and-series-screens
plan: 06
subsystem: ui
tags: [react-native, expo, bubble-sorbet, auth, home]

requires:
  - phase: 02-shell-and-series-screens
    provides: Auth and Home Bubble/Sorbet refresh from plans 02-01 and 02-02
provides:
  - Stable auth keyboard layout for SCR-01
  - Shorter create-first Home hero for SCR-02
  - Compact saved-series mini-cards for SCR-02
  - Mini-card compactness regression guard for VIS-04 tab clearance context
affects: [02-shell-and-series-screens, phase-03-learning-screens]

tech-stack:
  added: []
  patterns:
    - Stable auth scroll container with local keyboard-aware form region
    - Compact Bubble/Sorbet Home mini-cards with preserved callbacks

key-files:
  created: []
  modified:
    - apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx
    - apps/mobile/src/presentation/app/screens/HomeScreen.tsx
    - apps/mobile/src/presentation/app/MobileApp.styles.ts
    - apps/mobile/src/presentation/theme/layout.test.ts

key-decisions:
  - "Kept authentication behind useAuthSession while moving keyboard avoidance off the full-screen centered container."
  - "Kept Home create action in the hero only and folded no-series guidance into short hero copy."
  - "Removed premise body copy from saved-series cards to make them compact mini-cards while preserving Continue and Delete actions."

patterns-established:
  - "Use source-inspection tests for StyleSheet value guards when pure node tests cannot import React Native modules."

requirements-completed:
  - SCR-01
  - SCR-02
  - MOT-03

coverage:
  - id: D1
    description: "Authentication screen uses a stable scroll container and local keyboard-aware form region so typing does not recenter the whole auth panel."
    requirement: "SCR-01"
    verification:
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Keyboard stability requires simulator or device typing confirmation."
  - id: D2
    description: "Home create hero is shorter, create-first, and keeps empty guidance inside the hero."
    requirement: "SCR-02"
    verification:
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Visual compactness against design/bubble/home.png requires manual comparison."
  - id: D3
    description: "Saved series render as compact Bubble/Sorbet mini-cards with clear Continue and Delete actions."
    requirement: "SCR-02"
    verification:
      - kind: unit
        ref: "npm run test -- src/presentation/theme/layout.test.ts#home saved-series mini-card spacing remains compact"
        status: pass
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Card size and scan quality still require visual UAT with populated series."
  - id: D4
    description: "Home deleting and disabled states remain visible and accessible while the affected mini-card is deleting."
    requirement: "MOT-03"
    verification:
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "The visible deleting state requires manual interaction confirmation."

duration: 5 min
completed: 2026-07-05
status: complete
---

# Phase 02 Plan 06: Auth and Home Gap Closure Summary

**Stable auth keyboard behavior with a shorter Home create hero and compact saved-series mini-cards.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-05T08:41:46Z
- **Completed:** 2026-07-05T08:46:23Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Stabilized auth typing by moving full-screen centering into a stable scroll container and narrowing keyboard avoidance to the form panel.
- Shortened the Home create hero copy and spacing while keeping the only create action wired to `CreateSeriesModal`.
- Compressed saved series cards by removing oversized premise copy, tightening spacing, and preserving Continue/Delete actions plus deleting feedback.
- Added a targeted compactness guard alongside the existing floating-tab clearance tests.

## Task Commits

1. **Task 1: Stabilize authentication keyboard behavior** - `29ce242` (fix)
2. **Task 2: Shorten the Home create story panel** - `76e2647` (feat)
3. **Task 3 RED: Add failing mini-card compactness guard** - `c70bcb0` (test)
4. **Task 3 GREEN: Compress saved series mini-cards** - `02e828f` (feat)

## Files Created/Modified

- `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx` - Uses a stable scroll wrapper and local keyboard-aware form region.
- `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` - Shortens hero copy and renders compact saved-series mini-cards.
- `apps/mobile/src/presentation/app/MobileApp.styles.ts` - Adds auth keyboard stabilization styles and tightens Home hero/card spacing.
- `apps/mobile/src/presentation/theme/layout.test.ts` - Adds a mini-card compactness regression guard while preserving tab clearance tests.

## Decisions Made

- Kept authentication session work behind `useAuthSession`; no Supabase SDK or auth flow changes were introduced.
- Kept Home presentation-only: local create/open/delete service wiring and route callbacks were preserved.
- Kept tab-safe `screenContent.paddingBottom` unchanged and protected existing layout tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted RED test away from React Native StyleSheet import**
- **Found during:** Task 3 (Compress saved series mini-cards)
- **Issue:** The first RED test imported `MobileApp.styles.ts`, which pulled `react-native` into the pure `tsx --test` path and failed before reaching the intended assertion.
- **Fix:** Reworked the test to inspect `MobileApp.styles.ts` source text for the compact spacing contract.
- **Files modified:** `apps/mobile/src/presentation/theme/layout.test.ts`
- **Verification:** `npm run test -- src/presentation/theme/layout.test.ts` failed for the intended compactness assertion before GREEN and passed after implementation.
- **Committed in:** `c70bcb0`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** No product or architecture scope change; the fix kept the TDD guard executable in the existing test environment.

## Issues Encountered

- Manual visual UAT was not run in this environment. The summary coverage marks auth keyboard stability, Home compactness, light/dark comparison, and populated-series scroll clearance for human verification.

## Known Stubs

None. Existing `TextInput` placeholder examples remain intentional UI hints and do not feed UI rendering as mock data.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. Changes stayed in presentation components/styles/tests and did not add network endpoints, auth paths, file access patterns, or schema changes.

## Verification

- `npm run test -- src/presentation/theme/layout.test.ts` - passed
- `npm run lint` - passed
- `npm run typecheck` - passed

## Self-Check: PASSED

- Found all modified source and test files.
- Found task commits: `29ce242`, `76e2647`, `c70bcb0`, `02e828f`.
- No tracked file deletions were introduced by task commits.

## Next Phase Readiness

Plan 02-06 is complete. Remaining Phase 2 gap-closure plans can continue with setup/settings gaps without rediscovering auth and Home compactness fixes.

---
*Phase: 02-shell-and-series-screens*
*Completed: 2026-07-05*
