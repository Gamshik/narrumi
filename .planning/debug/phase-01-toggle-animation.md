---
status: diagnosed
trigger: "UAT Test 2: BubbleToggle needs switching animation"
created: 2026-07-04T22:21:24Z
updated: 2026-07-04T22:21:24Z
---

# Phase 01 Toggle Animation Diagnosis

## Symptoms

- Expected: Dark Mode uses a custom Bubble/Sorbet toggle, remains readable in both themes, has no native switch appearance, and toggles the app theme.
- Actual: The custom toggle works, but the thumb/color change has no transition and feels laggy.
- Reproduction: Phase 01 UAT Test 2.

## Evidence

- `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx` computes `thumbStyle` directly from the boolean state: `transform: [{ translateX: value ? 22 : 0 }]`.
- The track background and border colors are also assigned synchronously from `value`.
- The component imports no `Animated` value for the on/off transition; only `JellyPressable` animates the press scale.

## Root Cause

`BubbleToggle` changes its checked visual state through static style recomputation after React state updates. The thumb jumps from one position to another and the track color changes instantly, so the control can look delayed or stuck even though the theme state changes.

## Suggested Fix Direction

- Add an internal animated progress value synchronized to `value`.
- Interpolate thumb translation and, if practical with React Native Animated constraints, track color or a layered active fill opacity.
- Preserve the caller-owned `value`/`onValueChange` contract and switch accessibility state.
