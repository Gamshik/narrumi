---
phase: 01-bubble-foundation
plan: 04
subsystem: ui
tags: [react-native, expo, bubble-sorbet, motion, settings, dictionary-sheet]
requires:
  - phase: 01-bubble-foundation
    provides: Bubble/Sorbet theme tokens, JellyPressable, Bubble primitives, BubbleSheet, and shared app barrel exports from Plans 01-03.
provides:
  - Stronger shared Bubble/Sorbet press feedback tokens and JellyPressable spring usage.
  - Custom themed BubbleToggle primitive for Settings appearance control.
  - Content-sized dictionary word detail sheet content for native formSheet fitToContents.
affects: [01-bubble-foundation, settings-screen, dictionary-screen, shared-primitives, mobile-presentation]
tech-stack:
  added: []
  patterns:
    - Shared motion tokens drive both transform scale and pressed opacity.
    - Custom presentation-only switch controls expose native switch accessibility state.
    - Native formSheet fitToContents consumers avoid flex-expanding sheet content wrappers.
key-files:
  created:
    - apps/mobile/src/presentation/theme/tokens.test.ts
    - apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx
    - apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts
  modified:
    - apps/mobile/src/presentation/theme/tokens.ts
    - apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx
    - apps/mobile/src/presentation/app/MobileApp.styles.ts
    - apps/mobile/src/presentation/app/shared/index.ts
    - apps/mobile/src/presentation/app/screens/SettingsScreen.tsx
    - apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx
key-decisions:
  - "Use shared motion.pressScale and motion.pressedOpacity as the single stronger press feedback contract instead of per-screen magic values."
  - "Replace Settings native Switch with a reusable BubbleToggle that receives existing ThemeProvider state and semantic colors without adding persistence or app logic."
  - "Keep the dictionary route-owned native formSheet configuration unchanged and fix fitToContents by removing flex expansion from the dictionary sheet content path."
patterns-established:
  - "Bubble/Sorbet toggles live in focused shared component folders with a public index.ts export."
  - "Dictionary detail sheet content uses a dedicated non-flex style when native sheet height must measure intrinsic content."
requirements-completed: [VIS-01, VIS-02, VIS-03, VIS-04, MOT-01, MOT-02, QUAL-01]
coverage:
  - id: D1
    description: "Shared Bubble/Sorbet press feedback is stronger through tokenized scale and opacity values used by JellyPressable consumers."
    requirement: MOT-01
    verification:
      - kind: unit
        ref: "src/presentation/theme/tokens.test.ts#motion press feedback stays visible for Bubble controls"
        status: pass
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Automated checks prove stronger token wiring, but perceived tactile visibility across controls still requires device or simulator review."
  - id: D2
    description: "Settings Appearance uses a custom BubbleToggle instead of a native React Native Switch while preserving ThemeProvider state behavior."
    requirement: VIS-03
    verification:
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: other
        ref: "static acceptance: no SettingsScreen native Switch reference and BubbleToggle barrel export exists"
        status: pass
    human_judgment: true
    rationale: "Visibility, theme readability, and no-native-appearance confirmation require light/dark device or simulator inspection."
  - id: D3
    description: "Dictionary word details use non-flex content so the existing native formSheet fitToContents route can measure intrinsic height."
    requirement: MOT-02
    verification:
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: other
        ref: "static acceptance: DictionaryWordDetailsSheet no longer references styles.sheetContent"
        status: pass
    human_judgment: true
    rationale: "Native iOS sheet height and readability must be confirmed in Expo Go or simulator."
  - id: D4
    description: "Gap fixes remain presentation-only with no native, persistence, sync, AI, Supabase, domain, Oxford data, or package changes."
    requirement: QUAL-01
    verification:
      - kind: other
        ref: "git diff --name-only 6350104^..HEAD"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
duration: 6 min
completed: 2026-07-03
status: complete
---

# Phase 01 Plan 04: Bubble Foundation Gap Closure Summary

**Stronger shared press feedback, a reusable Bubble/Sorbet Settings toggle, and content-sized dictionary detail sheets.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-03T15:21:29Z
- **Completed:** 2026-07-03T15:27:18Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Strengthened shared press feedback with `motion.pressScale: 0.93`, `motion.pressedOpacity: 0.84`, and `JellyPressable` spring settings routed through motion tokens.
- Added `BubbleToggle` as a themed, accessible custom switch primitive and wired Settings Appearance to it instead of React Native `Switch`.
- Restored dictionary word detail sheet content sizing by moving dictionary details to a non-flex content wrapper while preserving the existing native `formSheet` route.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add press feedback token contract** - `6350104` (`test`)
2. **Task 1 GREEN: Strengthen shared press feedback** - `aba73b1` (`feat`)
3. **Task 2: Replace settings native Switch with BubbleToggle** - `cf26f69` (`feat`)
4. **Task 3: Restore content-sized dictionary detail sheet** - `0afef47` (`fix`)

## Files Created/Modified

- `apps/mobile/src/presentation/theme/tokens.test.ts` - Adds the focused press-feedback contract test.
- `apps/mobile/src/presentation/theme/tokens.ts` - Strengthens shared press scale and adds shared pressed opacity.
- `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` - Uses shared motion spring values and stronger default press scale.
- `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx` - Adds the custom themed switch primitive.
- `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts` - Adds the folder public export.
- `apps/mobile/src/presentation/app/shared/index.ts` - Exports `BubbleToggle` from the shared barrel.
- `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` - Replaces native `Switch` usage with `BubbleToggle`.
- `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` - Uses non-flex dictionary sheet content for missing and resolved words.
- `apps/mobile/src/presentation/app/MobileApp.styles.ts` - Adds shared pressed opacity usage, Settings toggle placement, and dictionary sheet content sizing style.

## Verification

- `cd apps/mobile; npm run test -- src/presentation/theme/tokens.test.ts` - failed before implementation as expected, then passed after GREEN changes.
- `cd apps/mobile; npm run lint` - passed.
- `cd apps/mobile; npm run typecheck` - passed.
- `cd apps/mobile; npm run test` - passed, 41 tests passed.
- `cd apps/mobile; npm run build` - passed, Expo export completed for web, iOS, and Android bundles.
- Static acceptance checks passed: Settings no longer references native `Switch`; `BubbleToggle` folder and barrel exports exist; dictionary details no longer use `styles.sheetContent`.

## Decisions Made

- Used one shared motion contract for stronger scale and opacity so the UAT fix affects JellyPressable-backed controls without screen-local values.
- Kept `BubbleToggle` presentation-only: callers provide theme colors, checked state, and `onValueChange`; the primitive owns only visual chrome and accessibility semantics.
- Fixed dictionary sheet height through content sizing instead of changing `apps/mobile/app/_layout.tsx`, preserving `presentation: 'formSheet'` and `sheetAllowedDetents: 'fitToContents'`.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- Task 1 followed RED/GREEN with a failing `tokens.test.ts` commit and a later implementation commit.
- Task 2 was marked `tdd="true"`, but this project has no React Native component test renderer and Phase 1 research explicitly avoids adding one for presentation primitives. Verification used lint, typecheck, static acceptance checks, full tests, build, and manual UAT routing.

## Issues Encountered

- The task 2 acceptance grep initially found the word "Switch" only in Settings helper copy, not in imports or rendered native components. The copy was adjusted to avoid reinforcing native switch language.

## Known Stubs

None. Stub-pattern scan matches only legitimate placeholder terminology in existing style/input contracts and a pre-existing initial preferences sentinel; no new placeholder UI or unwired data source was added.

## Threat Flags

None. The plan introduced no network endpoints, auth paths, persistence, file access patterns, schema changes, Supabase access, AI calls, sync behavior, native project changes, or package changes.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Manual UAT Remaining

1. Press primary buttons, chips/pills, list rows, tab items, and story choices on Expo Go or an iOS simulator. Expected: feedback is clearly visible, spring-like, layout-stable, and taps still register.
2. Open Settings in light and dark themes. Expected: Dark Mode uses the custom Bubble/Sorbet toggle, remains readable, and toggles the theme.
3. Open Dictionary and tap a word on iOS. Expected: the word detail sheet follows content height, stays readable, and does not stretch to the top of the screen.

## Next Phase Readiness

Phase 1 gap closure is automated-verification complete. Device UAT should confirm the visual/tactile improvements before treating Phase 1 verification as fully human-approved.

## Self-Check: PASSED

- Found `apps/mobile/src/presentation/theme/tokens.test.ts`.
- Found `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx`.
- Found `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts`.
- Found task commit `6350104`.
- Found task commit `aba73b1`.
- Found task commit `cf26f69`.
- Found task commit `0afef47`.
- Confirmed no tracked files were deleted by task commits.

---
*Phase: 01-bubble-foundation*
*Completed: 2026-07-03*
