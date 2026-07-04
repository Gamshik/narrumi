---
status: complete
phase: 01-bubble-foundation
source: [01-VERIFICATION.md]
started: 2026-07-02T00:52:07Z
updated: 2026-07-04T22:20:06Z
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
  artifacts: []
  missing: []
- truth: "Dark Mode uses the custom Bubble/Sorbet toggle, remains visible/readable in light and dark themes, has no native switch appearance, and toggles the app theme."
  status: failed
  reason: "User reported: Да, только нужно сделать анимацию при переключении, а то такое чувство, что лагает"
  severity: minor
  test: 2
  artifacts: []
  missing: []
- truth: "The dictionary word detail sheet is content-sized, readable, closable, and does not stretch to the top of the screen."
  status: failed
  reason: "User reported: до сих пор не работает словарь, открываю слово и вижу баганное окно, как и в тот раз, ни чего не изменилось"
  severity: major
  test: 3
  artifacts: []
  missing: []
