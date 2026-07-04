---
status: diagnosed
trigger: "UAT Test 1: кнопки можно сделать чуть более тактильными"
created: 2026-07-04T22:21:24Z
updated: 2026-07-04T22:21:24Z
---

# Phase 01 Tactile Feedback Diagnosis

## Symptoms

- Expected: Primary buttons, chips/pills, list rows, tab items, and story choices visibly scale/soften and release without layout jump, stale selected state, or missed taps.
- Actual: Feedback is improved, but buttons still do not feel tactile enough.
- Reproduction: Phase 01 UAT Test 1.

## Evidence

- `apps/mobile/src/presentation/theme/tokens.ts` sets `motion.pressScale` to `0.93` and `motion.pressedOpacity` to `0.84`.
- `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` applies only scale during press through `Animated.spring`.
- The release spring in `JellyPressable` still uses hardcoded `speed: 18` and `bounciness: 14`, so the release behavior does not follow the shared motion token contract from Plan 04.
- Several tactile expectations depend on perceived depth, but the shared press wrapper has no tokenized translate, shadow, or release-pop behavior.

## Root Cause

The Plan 04 feedback change strengthened the existing scale and opacity values, but the shared tactile contract is still a single scale-down effect with partly hardcoded release settings. It does not provide enough visible depth or rebound for the Bubble/Sorbet design target across all JellyPressable-backed controls.

## Suggested Fix Direction

- Strengthen the shared motion contract with a slightly deeper press target and tokenized release spring values.
- Consider adding a small translateY or shadow/elevation pressed state where supported by existing component style contracts.
- Keep the change in shared presentation primitives and theme tokens so buttons, pills, rows, tabs, and story choices improve together.
