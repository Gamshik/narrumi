---
phase: 01-bubble-foundation
verified: 2026-07-02T00:52:07Z
status: human_needed
next_action: "Human verification required. Complete the manual tests in the phase's *-UAT.md, then re-run the verify step until status is passed."
next_command: ""
score: 8/10 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "Primary buttons, chips, tab items, list rows, and story choices have reusable spring-like press response."
    test: "On a mobile device or Expo simulator, press primary buttons, chips, dictionary/series rows, tab items, and story choices."
    expected: "Each pressed item visibly scales/softens and releases without layout jump, stale selected state, or missed tap behavior."
    why_human: "Static code checks prove JellyPressable wiring, but cannot verify the perceived runtime animation and touch feel."
  - truth: "Sheets, active tabs, selected pills, and safe-area tab spacing feel soft and do not cover final scroll content."
    test: "Open the app in light and dark themes on small and safe-area mobile viewports, visit Home, Dictionary, Reader, Settings, and dictionary details."
    expected: "Sorbet background is visible, floating tab bar clears the safe area, final scroll content remains reachable, active/selected states are readable, and the sheet frame appears correctly."
    why_human: "Automated checks verify helper math and component wiring, but not rendered React Native layout, safe-area appearance, or visual quality on a device."
human_verification:
  - test: "Tactile Bubble/Sorbet press response"
    expected: "Primary buttons, chips, dictionary/series rows, tab items, and story choices visibly scale/soften and release without layout jump or missed tap behavior."
    why_human: "Press animation is a runtime visual behavior; grep and typecheck only prove JellyPressable is wired."
  - test: "Mobile visual/safe-area pass"
    expected: "Top-level screens show the Sorbet backdrop, floating tab bar clears safe areas, final scroll content is reachable, and sheet/selected states remain readable in light and dark themes."
    why_human: "The verifier can inspect tokens, helper math, imports, and build output, but cannot prove rendered mobile visual quality without device/simulator review."
---

# Phase 1: Bubble Foundation Verification Report

**Phase Goal:** Make the Bubble/Sorbet style a reusable presentation system rather than scattered screen-specific styles.
**Verified:** 2026-07-02T00:52:07Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Top-level screens can share the same Sorbet background and safe-area/tab-bar spacing without per-screen hacks. | VERIFIED | `RouteScreen` renders `SorbetBackground`; Expo routes wrap tab and modal screens in `RouteScreen`; `SorbetTabBar` uses `floatingTabBarMetrics`; `MobileApp.styles.ts` uses `getFloatingTabBarContentPadding(0)` for `screenContent`, `readerContent`, and `wordList`. |
| 2 | Primary buttons, chips, tab items, list rows, and story choices have a reusable spring-like press response. | PRESENT_BEHAVIOR_UNVERIFIED | `BubbleButton`, pressable `BubblePill`, `SorbetTabBar`, and existing screen rows/choices use `JellyPressable`; no runtime animation/simulator test exercises tactile behavior. |
| 3 | Bubble surfaces, pills, badges, and soft cards can be imported through public `index.ts` exports. | VERIFIED | `BubbleSurface`, `BubbleButton`, `BubblePill`, and `BubbleSheet` each have folder `index.ts` exports and are re-exported from `apps/mobile/src/presentation/app/shared/index.ts`. |
| 4 | Light and dark theme tokens avoid hardcoded one-theme UI colors in shared presentation primitives. | VERIFIED | `tokens.ts` defines matched `AppColorTokens` keys for light/dark; Bubble primitives accept `colors: AppColors` and resolve semantic tokens. |
| 5 | No application, infrastructure, persistence, AI, or sync logic is moved into shared UI components. | VERIFIED | Bubble primitive folders import only React Native, theme tokens, and local presentation primitives. `LevelBadge`/`DictionaryWordDetailsSheet` use domain types only for display data. |
| 6 | Shared Sorbet visual tokens expose light and dark semantic values for backgrounds, surfaces, pills, badges, sheets, tabs, and motion. | VERIFIED | `tokens.ts` includes `backgroundGradient`, blob, tab, bubble, sheet, pill, badge, `tabBarLayout`, and `motion` contracts with matching light/dark color objects. |
| 7 | Floating tab bar spacing is calculated from safe-area input through a reusable pure helper. | VERIFIED | `layout.ts` exports pure `floatingTabBarMetrics` and `getFloatingTabBarContentPadding`; `layout.test.ts` covers zero and large bottom insets. |
| 8 | Shared primitives render rounded bubble surfaces, pill controls, compact badges, soft cards, and sheet frames. | VERIFIED | `BubbleSurface`, `BubbleButton`, `BubblePill`, and `BubbleSheet` are substantive React Native components using shared radii, shadows, spacing, and semantic colors. |
| 9 | Existing badge and sheet consumers use the new Bubble/Sorbet primitives where practical. | VERIFIED | `LevelBadge` renders through `BubblePill`; `DictionaryWordDetailsSheet` wraps content in `BubbleSheet`. |
| 10 | Sheets, active tabs, selected pills, and safe-area tab spacing feel soft and do not cover final scroll content. | PRESENT_BEHAVIOR_UNVERIFIED | Code wiring and helper tests are present, but rendered mobile layout and visual/motion feel require human/device verification. |

**Score:** 8/10 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `apps/mobile/src/presentation/theme/tokens.ts` | Extended Bubble/Sorbet color, radius, shadow, motion, and navigation token contracts. | VERIFIED | Exists, substantive, exported by theme barrel. |
| `apps/mobile/src/presentation/theme/layout.ts` | Pure safe-area/tab-bar spacing helper. | VERIFIED | Exports `floatingTabBarMetrics` and `getFloatingTabBarContentPadding`; consumed by tab bar/styles. |
| `apps/mobile/src/presentation/theme/layout.test.ts` | Helper behavior tests. | VERIFIED | Full `npm run test` includes three layout helper tests; all 40 tests passed. |
| `apps/mobile/src/presentation/theme/index.ts` | Public theme exports. | VERIFIED | Re-exports `tokens`, `fonts`, and `layout`. |
| `apps/mobile/src/presentation/app/shared/BubbleSurface/BubbleSurface.tsx` | Reusable rounded surface/card shell. | VERIFIED | Substantive component with variants and semantic token resolution. |
| `apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx` | JellyPressable-backed button/control shell. | VERIFIED | Uses `JellyPressable`, `motion.pressScale`, semantic variants, disabled/selected accessibility state. |
| `apps/mobile/src/presentation/app/shared/BubblePill/BubblePill.tsx` | Reusable pill/badge/chip visual primitive. | VERIFIED | Supports passive/pressable modes, selected/disabled state, semantic tones. |
| `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` | Reusable bottom-sheet frame. | VERIFIED | Renders scrim, handle, optional title/close control, caller-owned content. |
| `apps/mobile/src/presentation/app/shared/SorbetTabBar/SorbetTabBar.tsx` | Safe-area-aware floating tab bar using shared metrics. | VERIFIED | Uses `useSafeAreaInsets`, `floatingTabBarMetrics`, `JellyPressable`, and semantic tab tokens. |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | Theme styles aligned with shared tab-bar content padding. | VERIFIED | Uses helper-derived `floatingTabContentPadding` for route/reader/list content. |
| `apps/mobile/src/presentation/app/shared/LevelBadge.tsx` | Badge consumer aligned to BubblePill. | VERIFIED | Wraps CEFR badge display in `BubblePill`. |
| `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` | Sheet consumer aligned to BubbleSheet. | VERIFIED | Wraps unresolved and resolved dictionary details in `BubbleSheet`. |
| `apps/mobile/src/presentation/app/shared/index.ts` | Public exports for shared Bubble/Sorbet primitives. | VERIFIED | Re-exports all Bubble primitive folders. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `theme/layout.ts` | `SorbetTabBar.tsx` | Safe-area bottom offset calculation. | VERIFIED | `SorbetTabBar` imports and calls `floatingTabBarMetrics(insets)`. |
| `theme/layout.ts` | `MobileApp.styles.ts` | Scroll/list bottom padding. | VERIFIED | `MobileApp.styles.ts` imports `getFloatingTabBarContentPadding` and applies it to route, reader, and dictionary list content. |
| `BubbleButton.tsx` | `JellyPressable.tsx` | Press feedback base component. | VERIFIED | `BubbleButton` wraps `JellyPressable`. |
| `BubblePill.tsx` | `JellyPressable.tsx` | Optional pressable chip behavior. | VERIFIED | `BubblePill` uses `JellyPressable` when `onPress` is provided. |
| `shared/index.ts` | `Bubble*` folders | Public shared component exports. | VERIFIED | Barrel exports `BubbleButton`, `BubblePill`, `BubbleSheet`, and `BubbleSurface`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `LevelBadge.tsx` | `level` prop | Dictionary row passes `word.level` from local vocabulary browse results. | Yes | FLOWING |
| `DictionaryWordDetailsSheet.tsx` | `word` prop | `dictionary-word-details.tsx` resolves route-owned vocabulary item and passes it to the shared sheet consumer. | Yes | FLOWING |
| `SorbetTabBar.tsx` | `insets` | `useSafeAreaInsets()` runtime safe-area provider. | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Layout helper behavior is covered by tests. | `npm run test` | 40 tests passed, including the three `floatingTabBarMetrics`/padding tests. | PASS |
| Mobile lint gate. | `npm run lint` | ESLint exited 0. | PASS |
| Mobile type contract gate. | `npm run typecheck` | TypeScript exited 0. | PASS |
| Mobile bundle gate. | `npm run build` | Expo export completed web, iOS, and Android bundles. | PASS |

### Probe Execution

No phase probes were declared or discovered for this UI foundation phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| VIS-01 | 01-01, 01-03 | Sorbet gradient backgrounds and soft floating color fields consistently on top-level app screens. | SATISFIED, HUMAN VISUAL CHECK NEEDED | `RouteScreen` and `SorbetBackground` are wired through routes; rendered appearance still requires human verification. |
| VIS-02 | 01-02, 01-03 | Rounded bubble surfaces, pill controls, compact badges, and soft cards. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Bubble primitives exist and consumers use `BubblePill`/`BubbleSheet`; rendered visual quality still requires human verification. |
| VIS-03 | 01-01, 01-02, 01-03 | Light/dark readability without hardcoded one-theme colors. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Shared primitives use semantic light/dark tokens; actual contrast/readability needs device review. |
| VIS-04 | 01-01, 01-03 | Floating capsule tab bar clear of safe areas and final scroll content. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Helper tests pass and tab/list wiring exists; final rendered safe-area behavior needs device review. |
| MOT-01 | 01-01, 01-02, 01-03 | Spring-like scale response for buttons, chips, rows, tabs, and story choices. | SATISFIED, HUMAN MOTION CHECK NEEDED | `JellyPressable` is used across these controls; runtime tactile feel needs human verification. |
| MOT-02 | 01-01, 01-02, 01-03 | Minimal motion for sheets, active tabs, and selected states. | SATISFIED, HUMAN MOTION CHECK NEEDED | Motion/selected contracts exist; perceived motion and visual state transitions need human verification. |
| QUAL-01 | 01-01, 01-02, 01-03 | Reusable shared presentation primitives instead of duplicated per-screen styling. | SATISFIED | Focused primitive folders and public exports are present; existing badge/sheet consumers use them. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `apps/mobile/src/presentation/theme/tokens.ts` | 27 | `placeholder` | INFO | Legitimate `labelTertiary` documentation, not unfinished UI. |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | 858 | `placeholder` | INFO | Legitimate TextInput placeholder color style, not a stub. |
| `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` | 43-55 | Hardcoded spring `speed`/`bounciness` while motion tokens also define spring values. | INFO | Does not block Phase 1 because reusable press behavior is wired, but future cleanup could route these values through the motion token contract. |

### Human Verification Required

### 1. Tactile Bubble/Sorbet Press Response

**Test:** On a mobile device or Expo simulator, press primary buttons, chips, dictionary/series rows, tab items, and story choices.
**Expected:** Each pressed item visibly scales/softens and releases without layout jump, stale selected state, or missed tap behavior.
**Why human:** Press animation is a runtime visual behavior; grep and typecheck only prove `JellyPressable` is wired.

### 2. Mobile Visual/Safe-Area Pass

**Test:** Open Home, Dictionary, Reader, Settings, and dictionary details in light and dark themes on small and safe-area mobile viewports.
**Expected:** Sorbet background is visible, floating tab bar clears safe areas, final scroll content is reachable, active/selected states are readable, and the sheet frame appears correctly.
**Why human:** Automated checks verify helper math and component wiring, but not rendered React Native layout, safe-area appearance, or visual quality on a device.

### Gaps Summary

No blocking implementation gaps were found. Automated code, wiring, test, typecheck, lint, and build evidence supports the Phase 1 foundation. The phase remains `human_needed` because visual appearance and tactile motion require device/simulator verification before the GSD verifier can mark the phase fully passed.

---

_Verified: 2026-07-02T00:52:07Z_
_Verifier: the agent (gsd-verifier)_
