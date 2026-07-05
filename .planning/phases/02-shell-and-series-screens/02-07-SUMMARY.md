---
phase: 02-shell-and-series-screens
plan: 07
subsystem: ui
tags: [react-native, expo, bubble-sorbet, setup, series-details]

requires:
  - phase: 02-shell-and-series-screens
    provides: Auth and Home gap closure from 02-06 plus setup/details foundations from 02-03 and 02-04
provides:
  - Compact create setup modal composition closer to design/bubble/newseries.png
  - Compact edit setup modal composition with the existing read-only lock preserved
  - Lighter editable character setup rows
  - Shorter Series Details primary area aligned with design/bubble/series.png
  - Series Details screen with no visible Series Memory card while keeping loaded memory state intact
affects: [02-shell-and-series-screens, phase-03-learning-screens]

tech-stack:
  added: []
  patterns:
    - Presentation-only setup section cards with existing use-case callbacks
    - Compact details header metadata without premise or visible memory rendering

key-files:
  created:
    - .planning/phases/02-shell-and-series-screens/02-07-SUMMARY.md
  modified:
    - apps/mobile/src/presentation/app/screens/HomeScreen.tsx
    - apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx
    - apps/mobile/src/presentation/app/MobileApp.styles.ts

key-decisions:
  - "Kept Generate wired to localAppServices.generateSeriesSetupDraft.execute and only moved its visible placement into compact setup draft rows."
  - "Moved setup text fields into the target visual order while preserving validation helpers, selected list fields, and save behavior."
  - "Removed visible Series Memory rendering from Series Details without changing loadSeriesDetails or the SeriesDetailsState.memory contract."

patterns-established:
  - "Use setupSectionCard plus characterSectionCard for compact setup modal grouping."
  - "Keep Series Details orientation metadata short and do not show full premise or memory in the primary area."

requirements-completed:
  - SCR-03
  - SCR-04
  - MOT-03

coverage:
  - id: D1
    description: "Create and edit setup modals use tighter segmented controls, rounded setup sections, and compact Generate placement while preserving existing setup draft behavior."
    requirement: "SCR-03"
    verification:
      - kind: integration
        ref: "npm run test -- src/application/useCases/generateSeriesSetupDraft.test.ts src/application/useCases/createSeries.test.ts src/application/useCases/updateSeriesSetup.test.ts"
        status: pass
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Visual parity with design/bubble/newseries.png requires device or simulator comparison."
  - id: D2
    description: "Character setup rows are lighter while keeping editable name and description controls plus add/remove behavior."
    requirement: "SCR-03"
    verification:
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Visual row weight and add/remove interaction require manual UI confirmation."
  - id: D3
    description: "Series Details primary area is shorter and no visible Series Memory card or equivalent memory section remains."
    requirement: "SCR-04"
    verification:
      - kind: automated_ui
        ref: "rg \"Series Memory|state\\.memory|lastEpisodeSummary|unresolvedCliffhanger\" apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
        status: pass
      - kind: automated_ui
        ref: "npm run lint"
        status: pass
      - kind: automated_ui
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "The final scan quality against design/bubble/series.png requires manual visual UAT."

duration: 25 min
completed: 2026-07-05
status: complete
---

# Phase 02 Plan 07: Setup and Series Details Gap Closure Summary

**Compact setup modals, lighter character rows, and shorter Series Details with visible memory removed.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-05T08:28:00Z
- **Completed:** 2026-07-05T08:53:28Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Retuned create and edit setup modal composition with compact setup cards, tighter controls, title-first field order, and one Generate action near setup text fields.
- Lightened character setup rows while preserving controlled name and description inputs, add/remove behavior, and read-only edit-state behavior.
- Shortened Series Details by removing full premise copy from the primary area, reducing continue/prep copy, and removing visible memory rendering.
- Preserved existing validation helpers, setup generation boundary, save/update use cases, edit lock, episode actions, and loaded memory state.

## Task Commits

1. **Task 1: Retune create and edit setup modal composition** - `ae6d599` (feat)
2. **Task 2: Lighten character setup rows without removing edit controls** - `ae6d599` (feat)
3. **Task 3: Shorten Series Details and remove visible memory card** - `ae6d599` (feat)

_Note: The JSX and style hunks for Tasks 1 and 2 overlap in the same setup form blocks, so the implementation was committed as one coherent UI gap-closure commit._

## Files Created/Modified

- `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` - Groups create setup fields into compact setup and character sections and moves Generate near setup text fields.
- `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` - Applies the same edit setup treatment, shortens details hierarchy, and removes visible memory rendering.
- `apps/mobile/src/presentation/app/MobileApp.styles.ts` - Adds compact setup/character style keys and tightens details/banner/form spacing.
- `.planning/phases/02-shell-and-series-screens/02-07-SUMMARY.md` - Records plan execution and verification.

## Decisions Made

- Kept Generate as exactly one visible action per modal and preserved the existing `buildSetupDraftRequest` behavior so CEFR level, genre, tone, and participation mode remain selected constraints.
- Kept character description fields visible instead of collapsing characters into a comma-only input.
- Hid Series Memory from the screen rather than changing memory loading, storage, sync, or AI context contracts.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Manual visual UAT was not run in this environment. The summary coverage marks setup modal parity, character row visual weight, and Series Details hierarchy for human verification against `design/bubble/newseries.png` and `design/bubble/series.png`.

## Known Stubs

None. Existing `TextInput` placeholders remain intentional UI examples and do not feed mock data into rendering.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. Changes stayed in presentation components and styles, and no network endpoints, auth paths, file access patterns, schema changes, SDK calls, persistence logic, or AI prompt logic were added.

## Verification

- `npm run test -- src/application/useCases/generateSeriesSetupDraft.test.ts src/application/useCases/createSeries.test.ts src/application/useCases/updateSeriesSetup.test.ts` - passed
- `npm run lint` - passed
- `npm run typecheck` - passed
- `rg "Series Memory|state\\.memory|lastEpisodeSummary|unresolvedCliffhanger" apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` - passed with no matches
- `git diff --check -- apps/mobile/src/presentation/app/screens/HomeScreen.tsx apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx apps/mobile/src/presentation/app/MobileApp.styles.ts` - passed

## Self-Check: PASSED

- Found modified source files: `HomeScreen.tsx`, `SeriesDetailsScreen.tsx`, and `MobileApp.styles.ts`.
- Found task commit: `ae6d599`.
- No tracked file deletions were introduced by the task commit.
- Pre-existing dirty `.planning/STATE.md`, `.planning/ROADMAP.md`, and untracked `.planning/phases/02-shell-and-series-screens/SUMMARY.md` were not modified by this plan.

## Next Phase Readiness

Plan 02-07 is complete. Remaining visual verification should focus on create setup, edit setup, character rows, Generate placement, read-only setup, shortened Series Details, no visible memory card, and preserved episode history actions on device or simulator.

---
*Phase: 02-shell-and-series-screens*
*Completed: 2026-07-05*
