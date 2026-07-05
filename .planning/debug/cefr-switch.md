# Debug Session: CEFR Switch

## Symptoms
**Goal:** find_root_cause_only (UAT flow - plan-phase --gaps handles fixes)
**Truth:** CEFR level, default genre, and Story Word goal are combined into one section.
**Expected:** CEFR level, default genre, and Story Word goal are combined into one section.
**Actual:** Нужно заменить в CEFR на свой свитчер, а не айфоновский.
**Errors:** None reported
**Reproduction:** Test 13 in UAT
**Timeline:** Discovered during UAT

## Investigation Steps
1. Reviewed `02-UAT.md` to identify the issue: "Нужно заменить в CEFR на свой свитчер, а не айфоновский."
2. Read `.planning/STATE.md` to understand context.
3. Searched for `SettingsScreen` and CEFR level implementation.
4. Viewed `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` and found it imports `@react-native-segmented-control/segmented-control`.
5. Confirmed this is the native iOS control ("айфоновский") being used instead of a custom Bubble/Sorbet themed component.

## ROOT CAUSE FOUND
**Debug Session:** .planning/debug/cefr-switch.md
**Root Cause:** The Settings screen uses the native iOS `@react-native-segmented-control/segmented-control` for CEFR selection instead of a custom Bubble/Sorbet themed component.
**Evidence Summary:**
- `SettingsScreen.tsx` imports and renders `SegmentedControl` from `@react-native-segmented-control/segmented-control`.
- UAT feedback explicitly flags the "iPhone" switcher and requests a custom one.
**Files Involved:**
- `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`: Uses native `SegmentedControl` for CEFR levels.
**Suggested Fix Direction:** Create a custom `BubbleSegmentedControl` primitive in `shared/` (using `JellyPressable` or `BubblePill`) and replace the native control in `SettingsScreen.tsx`.
