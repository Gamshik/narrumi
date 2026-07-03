---
phase: 01-bubble-foundation
verified: 2026-07-03T15:33:40Z
status: human_needed
next_action: "Complete the three manual device/simulator checks, then mark verification passed if they match expected behavior."
next_command: ""
score: 9/12 must-haves verified
behavior_unverified: 3
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/10
  gaps_closed:
    - "Shared press feedback is stronger through tokenized scale/opacity and JellyPressable now consumes the shared spring values."
    - "Settings Appearance no longer imports or renders the native React Native Switch; it uses exported BubbleToggle with the existing ThemeProvider state path."
    - "Dictionary word details use non-flex dictionarySheetContent while the route preserves native formSheet fitToContents."
  gaps_remaining: []
  regressions: []
behavior_unverified_items:
  - truth: "Primary buttons, chips, tab items, list rows, and story choices have a reusable spring-like press response that is visibly noticeable and layout-stable."
    test: "On Expo Go or an iOS simulator, press at least one primary button, chip/pill, list row, tab item, and story choice."
    expected: "Each control visibly scales/softens on touch down, releases cleanly, registers taps, and does not jump, resize layout, or leave stale selected state."
    why_human: "Automated checks prove stronger token values and JellyPressable wiring, but perceived tactile visibility and layout feel require runtime device/simulator review."
  - truth: "Settings Appearance uses a custom Bubble/Sorbet dark-mode toggle that remains visible and functional in light and dark themes."
    test: "Open Settings in light theme and dark theme, then tap the Dark Mode toggle."
    expected: "The toggle has custom Bubble/Sorbet styling with no native switch appearance, remains readable in both themes, and toggles the app theme through the existing ThemeProvider state."
    why_human: "Static checks prove BubbleToggle wiring and no native Switch import, but visibility and theme transition behavior need rendered app confirmation."
  - truth: "Dictionary word details open as a readable content-sized iOS form sheet."
    test: "Open Dictionary on iOS through Expo Go or simulator, tap a word, and inspect the word detail sheet."
    expected: "The sheet height follows its content, does not stretch to the top of the screen, visible content is readable, close works, and longer examples remain reachable without clipped text."
    why_human: "Code checks prove the flex-expanding content wrapper was replaced, but native formSheet fitToContents behavior must be confirmed on iOS."
human_verification:
  - test: "Tactile Bubble/Sorbet press response"
    expected: "Primary buttons, chips/pills, list rows, tab items, and story choices visibly scale/soften and release without layout jump, stale selected state, or missed taps."
    why_human: "Press animation is a runtime visual/touch behavior; tests only prove token thresholds and JellyPressable wiring."
  - test: "Settings custom BubbleToggle in both themes"
    expected: "Dark Mode uses the custom Bubble/Sorbet toggle, remains visible/readable in light and dark themes, has no native switch appearance, and toggles the app theme."
    why_human: "Rendered theme contrast and the actual theme transition require device/simulator inspection."
  - test: "iOS dictionary details form sheet sizing"
    expected: "The dictionary word detail sheet is content-sized, readable, closable, and does not stretch to the top of the screen."
    why_human: "Native iOS formSheet sizing cannot be proven by grep or Node tests."
---

# Phase 1: Bubble Foundation Verification Report

**Phase Goal:** Make the Bubble/Sorbet style a reusable presentation system rather than scattered screen-specific styles.  
**Verified:** 2026-07-03T15:33:40Z  
**Status:** human_needed  
**Re-verification:** Yes - after plan 01-04 gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Top-level screens can share the same Sorbet background and safe-area/tab-bar spacing without per-screen hacks. | VERIFIED | Expo route files wrap screens in `RouteScreen`; `RouteScreen` renders `SorbetBackground`; `SorbetTabBar` imports `floatingTabBarMetrics`; `MobileApp.styles.ts` derives bottom padding through `getFloatingTabBarContentPadding(0)`. |
| 2 | Primary buttons, chips, tab items, and list rows have a reusable spring-like press response. | PRESENT_BEHAVIOR_UNVERIFIED | `motion.pressScale` is `0.93`, `motion.pressedOpacity` is `0.84`, `tokens.test.ts` protects those thresholds, and `JellyPressable` consumes `motion.pressScale` plus spring tokens. Device confirmation is still needed for perceived press feel. |
| 3 | Bubble surfaces, pills, badges, and soft cards can be imported through public `index.ts` exports. | VERIFIED | `BubbleSurface`, `BubbleButton`, `BubblePill`, `BubbleSheet`, and `BubbleToggle` each have folder exports and are re-exported from `apps/mobile/src/presentation/app/shared/index.ts`. |
| 4 | Light and dark theme tokens avoid hardcoded one-theme UI colors in shared presentation primitives. | VERIFIED | `lightColors` and `darkColors` share the typed `AppColorTokens` contract; Bubble primitives accept `colors: AppColors` and use semantic tokens for surfaces, pills, sheets, toggle track, and control states. |
| 5 | No application, infrastructure, persistence, AI, or sync logic is moved into shared UI components. | VERIFIED | Shared Bubble primitives import only React Native, theme tokens, and local shared components. `LevelBadge` and `DictionaryWordDetailsSheet` keep existing domain type imports for display data only. No Supabase, storage, sync, AI, or service imports were found in shared primitives. |
| 6 | Shared Sorbet tokens expose semantic values for backgrounds, surfaces, pills, badges, sheets, tabs, safe-area layout, and motion. | VERIFIED | `tokens.ts` defines `backgroundGradient`, blob colors, tab tokens, bubble/sheet/pill/badge roles, `tabBarLayout`, and `motion` values. |
| 7 | Floating tab bar spacing is calculated from safe-area input through a reusable pure helper. | VERIFIED | `layout.ts` exports pure `floatingTabBarMetrics` and `getFloatingTabBarContentPadding`; `layout.test.ts` covers zero inset, large bottom inset, and padding-only behavior. |
| 8 | Existing badge and sheet consumers use Bubble/Sorbet primitives where practical. | VERIFIED | `LevelBadge` renders through `BubblePill`; `DictionaryWordDetailsSheet` wraps unresolved and resolved states in `BubbleSheet`. |
| 9 | Shared press feedback gap is closed in implementation, not only documented. | VERIFIED | Plan 01-04 added `tokens.test.ts`; `npm run test` passes the "motion press feedback stays visible for Bubble controls" test; `MobileApp.styles.ts` uses `motion.pressedOpacity`; `JellyPressable` defaults to `motion.pressScale`. |
| 10 | Settings Appearance replaces the native switch with a reusable Bubble/Sorbet control while preserving the existing theme state path. | PRESENT_BEHAVIOR_UNVERIFIED | `SettingsScreen.tsx` imports `BubbleToggle`, no longer imports `Switch`, and passes `isDark` plus `setDarkMode`. `BubbleToggle` is exported and declares `accessibilityRole="switch"` with checked/disabled state. Runtime visibility/toggling still needs device review. |
| 11 | Dictionary word detail sheet no longer uses the flex-expanding content wrapper that defeated `fitToContents`. | PRESENT_BEHAVIOR_UNVERIFIED | `DictionaryWordDetailsSheet.tsx` uses `styles.dictionarySheetContent` for unresolved and resolved content; `MobileApp.styles.ts` defines it without `flex: 1`; `_layout.tsx` keeps `presentation: 'formSheet'` and `sheetAllowedDetents: 'fitToContents'`. Native sizing must be checked on iOS. |
| 12 | Phase 1 gap closure stays within the presentation layer and Expo Managed Workflow. | VERIFIED | Changed Phase 1 source files are presentation/theme files; no native `ios/` or `android/` app directories, Supabase functions, AI gateways, persistence adapters, or domain rules were touched for the gap closure. Current unrelated uncommitted package/config/research/design files were preserved. |

**Score:** 9/12 truths verified (3 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `apps/mobile/src/presentation/theme/tokens.ts` | Bubble/Sorbet color, layout, and motion token contract. | VERIFIED | Exists, substantive, exports stronger `motion.pressScale` and `motion.pressedOpacity`. |
| `apps/mobile/src/presentation/theme/tokens.test.ts` | Pure test protecting visible press feedback thresholds. | VERIFIED | `npm run test` includes and passes the motion press feedback test. |
| `apps/mobile/src/presentation/theme/layout.ts` | Pure safe-area/floating-tab spacing helper. | VERIFIED | Exports `floatingTabBarMetrics` and `getFloatingTabBarContentPadding`. |
| `apps/mobile/src/presentation/theme/layout.test.ts` | Helper behavior tests. | VERIFIED | Three floating-tab helper tests passed in `npm run test`. |
| `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` | Shared tactile press primitive. | VERIFIED | Uses shared motion tokens and forwards Pressable semantics. |
| `apps/mobile/src/presentation/app/shared/BubbleSurface/BubbleSurface.tsx` | Reusable rounded surface/card shell. | VERIFIED | Substantive token-driven presentation component. |
| `apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx` | Reusable JellyPressable-backed control shell. | VERIFIED | Uses `JellyPressable`, semantic variants, disabled/selected accessibility state. |
| `apps/mobile/src/presentation/app/shared/BubblePill/BubblePill.tsx` | Reusable pill/badge/chip primitive. | VERIFIED | Supports passive and pressable modes with semantic tones. |
| `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` | Reusable bottom-sheet frame. | VERIFIED | Provides sheet chrome while caller owns content and route behavior. |
| `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx` | Custom themed Settings switch primitive. | VERIFIED | Uses `JellyPressable`, semantic colors, switch accessibility role, checked/disabled state. |
| `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts` | Folder public export. | VERIFIED | Exports `BubbleToggle`. |
| `apps/mobile/src/presentation/app/shared/SorbetTabBar/SorbetTabBar.tsx` | Safe-area-aware floating tab bar. | VERIFIED | Consumes `floatingTabBarMetrics` and `JellyPressable`. |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | Shared themed styles aligned with foundation tokens. | VERIFIED | Uses helper-derived tab padding, `motion.pressedOpacity`, `settingToggle`, and non-flex `dictionarySheetContent`. |
| `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` | Settings Appearance wired to BubbleToggle. | VERIFIED | Imports `BubbleToggle`; no native `Switch` import or JSX usage remains. |
| `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` | BubbleSheet consumer with content-sized dictionary details. | VERIFIED | Uses `dictionarySheetContent` for both missing and resolved word states. |
| `apps/mobile/src/presentation/app/shared/index.ts` | Public shared primitive barrel. | VERIFIED | Re-exports Bubble primitives including `BubbleToggle`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `theme/layout.ts` | `SorbetTabBar.tsx` | Safe-area bottom offset calculation. | VERIFIED | `SorbetTabBar` imports and calls `floatingTabBarMetrics(insets)`. |
| `theme/layout.ts` | `MobileApp.styles.ts` | Scroll/list bottom padding. | VERIFIED | `MobileApp.styles.ts` imports `getFloatingTabBarContentPadding` and uses the derived padding for scroll endings. |
| `theme/tokens.ts` | `JellyPressable.tsx` | Shared motion scale and spring constants. | VERIFIED | `JellyPressable` imports `motion`, defaults `scaleTo` to `motion.pressScale`, and uses `motion.springSpeed`/`springBounciness`. |
| `theme/tokens.ts` | `MobileApp.styles.ts` | Shared pressed opacity. | VERIFIED | `pressed` style uses `motion.pressedOpacity`. |
| `BubbleToggle.tsx` | `SettingsScreen.tsx` | Custom switch presentation for ThemeProvider state. | VERIFIED | `SettingsScreen` renders `BubbleToggle` with `value={isDark}` and `onValueChange={setDarkMode}`. |
| `DictionaryWordDetailsSheet.tsx` | `_layout.tsx` | Content-sized formSheet path. | VERIFIED | Route keeps `sheetAllowedDetents: 'fitToContents'`; sheet content uses non-flex `dictionarySheetContent`. |
| `shared/index.ts` | `Bubble*` folders | Public shared component exports. | VERIFIED | Barrel exports `BubbleSurface`, `BubbleButton`, `BubblePill`, `BubbleSheet`, and `BubbleToggle`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `SorbetTabBar.tsx` | `insets` | `useSafeAreaInsets()` runtime provider. | Yes | FLOWING |
| `SettingsScreen.tsx` | `isDark`, `setDarkMode` | `useAppTheme()` existing ThemeProvider state. | Yes | FLOWING |
| `BubbleToggle.tsx` | `value`, `onValueChange` | Caller-owned Settings Appearance state path. | Yes | FLOWING |
| `DictionaryWordDetailsSheet.tsx` | `word` | Route-owned dictionary lookup passes `VocabularyItem | undefined`. | Yes | FLOWING |
| `LevelBadge.tsx` | `level` | Dictionary row passes `word.level` from local Oxford vocabulary results. | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Mobile lint gate. | `npm run lint` from `apps/mobile` | ESLint exited 0. | PASS |
| Mobile type contract gate. | `npm run typecheck` from `apps/mobile` | TypeScript exited 0. | PASS |
| Mobile unit/contract tests. | `npm run test` from `apps/mobile` | 41 tests passed, including floating tab layout tests and the motion press feedback token test. | PASS |
| Mobile bundle gate. | `npm run build` from `apps/mobile` | Expo export completed web, iOS, and Android bundles. | PASS |

### Probe Execution

No phase probes were declared or discovered for this UI foundation phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| VIS-01 | 01-01, 01-03, 01-04 | Sorbet gradient backgrounds and soft floating color fields consistently on top-level app screens. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Route wrappers render `RouteScreen`/`SorbetBackground`; device pass still needs visual confirmation. |
| VIS-02 | 01-02, 01-03, 01-04 | Rounded bubble surfaces, pill controls, compact badges, soft cards, and sheet frames. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Bubble primitives and consumers exist; `BubbleToggle` closes the Settings native-control gap; sheet visual sizing still needs device confirmation. |
| VIS-03 | 01-01, 01-02, 01-03, 01-04 | Light/dark readability without hardcoded one-theme colors. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Semantic light/dark tokens and BubbleToggle wiring are present; rendered contrast/readability needs light/dark device review. |
| VIS-04 | 01-01, 01-03, 01-04 | Floating capsule tab bar clear of safe areas and final scroll content. | SATISFIED, HUMAN VISUAL CHECK NEEDED | Pure helper tests pass and tab/list wiring exists; final rendered safe-area behavior remains a manual check. |
| MOT-01 | 01-01, 01-02, 01-03, 01-04 | Spring-like scale response for buttons, chips, rows, tabs, and story choices. | SATISFIED, HUMAN MOTION CHECK NEEDED | Stronger motion tokens are tested and wired; perceived tactile response requires simulator/device confirmation. |
| MOT-02 | 01-01, 01-02, 01-03, 01-04 | Minimal soft motion for sheets, active tabs, and selected states. | SATISFIED, HUMAN MOTION CHECK NEEDED | Sheet/toggle/selected-state contracts exist; native sheet sizing and visual feel need human review. |
| QUAL-01 | 01-01, 01-02, 01-03, 01-04 | Reusable shared presentation primitives instead of duplicated per-screen styling. | SATISFIED | Focused primitive folders, public barrels, shared motion/layout helpers, and presentation-only boundaries are verified. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `apps/mobile/src/presentation/theme/tokens.ts` | 27 | `placeholder` | INFO | Legitimate `labelTertiary` token documentation, not unfinished UI. |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | 862 | `placeholder` | INFO | Legitimate TextInput placeholder style key, not a stub. |
| `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` | 74 | `initial-preferences-placeholder` | INFO | Pre-existing initial preference sentinel, not user-visible placeholder UI. |

### Human Verification Required

### 1. Tactile Bubble/Sorbet Press Response

**Test:** On Expo Go or an iOS simulator, press at least one primary button, chip/pill, list row, tab item, and story choice.  
**Expected:** Each control visibly scales/softens on touch down, releases cleanly, registers taps, and does not jump, resize layout, or leave stale selected state.  
**Why human:** Automated checks prove stronger token values and JellyPressable wiring, but perceived tactile visibility and layout feel require runtime device/simulator review.

### 2. Settings Custom BubbleToggle In Both Themes

**Test:** Open Settings in light theme and dark theme, then tap the Dark Mode toggle.  
**Expected:** The toggle has custom Bubble/Sorbet styling with no native switch appearance, remains readable in both themes, and toggles the app theme through the existing ThemeProvider state.  
**Why human:** Static checks prove BubbleToggle wiring and no native Switch import, but visibility and theme transition behavior need rendered app confirmation.

### 3. iOS Dictionary Details Form Sheet Sizing

**Test:** Open Dictionary on iOS through Expo Go or simulator, tap a word, and inspect the word detail sheet.  
**Expected:** The sheet height follows its content, does not stretch to the top of the screen, visible content is readable, close works, and longer examples remain reachable without clipped text.  
**Why human:** Code checks prove the flex-expanding content wrapper was replaced, but native formSheet fitToContents behavior must be confirmed on iOS.

### Gaps Summary

No blocking implementation gaps were found after plan 01-04 gap closure. The previous UAT-reported issues have code-level fixes, public exports, wiring, and passing lint/typecheck/test/build evidence. The phase remains `human_needed` because the remaining assertions depend on rendered mobile behavior and native iOS sheet presentation.

---

_Verified: 2026-07-03T15:33:40Z_  
_Verifier: the agent (gsd-verifier)_
