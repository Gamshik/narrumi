---
status: diagnosed
phase: 01-bubble-foundation
source: [01-VERIFICATION.md]
started: 2026-07-02T00:52:07Z
updated: 2026-07-04T22:21:24Z
---

## Current Test

[testing complete]

## Tests

### 1. Tactile Bubble/Sorbet press response

expected: Primary buttons, chips/pills, list rows, tab items, and story choices visibly scale/soften and release without layout jump, stale selected state, or missed taps.
result: issue
reported: "уже лучше, но можно сделать чуть более тактильными кнопки"
severity: minor

### 2. Settings custom BubbleToggle in both themes

expected: Dark Mode uses the custom Bubble/Sorbet toggle, remains visible/readable in light and dark themes, has no native switch appearance, and toggles the app theme.
result: issue
reported: "Да, только нужно сделать анимацию при переключении, а то такое чувство, что лагает"
severity: minor

### 3. iOS dictionary details form sheet sizing

expected: The dictionary word detail sheet is content-sized, readable, closable, and does not stretch to the top of the screen.
result: issue
reported: "до сих пор не работает словарь, открываю слово и вижу баганное окно, как и в тот раз, ни чего не изменилось"
severity: major

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Primary buttons, chips/pills, list rows, tab items, and story choices visibly scale/soften and release without layout jump, stale selected state, or missed taps."
  status: failed
  reason: "User reported: уже лучше, но можно сделать чуть более тактильными кнопки"
  severity: minor
  test: 1
  root_cause: "The shared tactile contract is still mostly a single scale-down effect with conservative values and a hardcoded release spring, so JellyPressable-backed controls do not produce enough visible depth or rebound."
  artifacts:
    - path: "apps/mobile/src/presentation/theme/tokens.ts"
      issue: "motion.pressScale and pressedOpacity were strengthened but remain the only shared tactile signals."
    - path: "apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx"
      issue: "Press feedback animates scale only, and release spring settings are still hardcoded instead of fully token-driven."
  missing:
    - "Strengthen shared press depth/rebound through presentation motion tokens."
    - "Add an additional tactile cue such as small translateY, stronger opacity, or shadow/elevation response where compatible with existing controls."
  debug_session: ".planning/debug/phase-01-tactile-feedback.md"
- truth: "Dark Mode uses the custom Bubble/Sorbet toggle, remains visible/readable in light and dark themes, has no native switch appearance, and toggles the app theme."
  status: failed
  reason: "User reported: Да, только нужно сделать анимацию при переключении, а то такое чувство, что лагает"
  severity: minor
  test: 2
  root_cause: "BubbleToggle recomputes thumb position and track colors directly from the boolean value, so the checked visual state jumps after React updates instead of animating."
  artifacts:
    - path: "apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx"
      issue: "thumbStyle uses a static translateX value and the track style changes synchronously from value."
  missing:
    - "Add an internal animated progress value synchronized with the controlled value."
    - "Animate thumb translation and active/inactive visual transition while preserving switch accessibility semantics."
  debug_session: ".planning/debug/phase-01-toggle-animation.md"
- truth: "The dictionary word detail sheet is content-sized, readable, closable, and does not stretch to the top of the screen."
  status: failed
  reason: "User reported: до сих пор не работает словарь, открываю слово и вижу баганное окно, как и в тот раз, ни чего не изменилось"
  severity: major
  test: 3
  root_cause: "The dictionary content wrapper is non-flex now, but BubbleSheet still renders a full-screen absolute root; the native formSheet fitToContents route measures that wrapper instead of intrinsic dictionary content. The route also renders missing-word UI while the async local lookup is still unresolved."
  artifacts:
    - path: "apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx"
      issue: "root style is absolute and full-screen, with top/bottom/left/right pinned."
    - path: "apps/mobile/app/_layout.tsx"
      issue: "dictionary-word-details uses native formSheet fitToContents, which needs intrinsic content measurement."
    - path: "apps/mobile/app/dictionary-word-details.tsx"
      issue: "undefined word state is used for both loading and not-found states."
  missing:
    - "Add a content-sized BubbleSheet mode or native-form-sheet variant that does not render a full-screen absolute root."
    - "Use the full-screen root only for overlay sheets that need a scrim/backdrop."
    - "Add an explicit loading state before showing the not-found dictionary UI."
  debug_session: ".planning/debug/phase-01-dictionary-sheet.md"
