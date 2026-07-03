---
status: diagnosed
phase: 01-bubble-foundation
source: [01-VERIFICATION.md]
started: 2026-07-02T00:52:07Z
updated: 2026-07-03T15:02:33Z
---

## Current Test

[testing complete]

## Tests

### 1. Tactile Bubble/Sorbet press response

expected: Primary buttons, chips, dictionary/series rows, tab items, and story choices visibly scale/soften and release without layout jump or missed tap behavior.
result: issue
reported: "нет, я особо не знамечаю этих эффектов, хотелось бы более заметными их сделать"
severity: cosmetic

### 2. Mobile visual/safe-area pass

expected: Top-level screens show the Sorbet backdrop, floating tab bar clears safe areas, final scroll content is reachable, and sheet/selected states remain readable in light and dark themes.
result: issue
reported: "- в светлой теме не видно переключателя на dark mode, я бы их тоже сделал кастомными под стиль, чтобы нативных эл-ов вообще не было.
- прикрепил изображение с багом - вот так открывается слово в словаре, ни чего не видно, векчно до верха, не так же было - от контента зависела высота"
severity: major

## Summary

total: 2
passed: 0
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Primary buttons, chips, dictionary/series rows, tab items, and story choices visibly scale/soften and release without layout jump or missed tap behavior."
  status: failed
  reason: "User reported: нет, я особо не знамечаю этих эффектов, хотелось бы более заметными их сделать"
  severity: cosmetic
  test: 1
  root_cause: "Shared tactile feedback is implemented mostly as a subtle scale-only animation: JellyPressable defaults to scaleTo=0.95, shared motion.pressScale is 0.96, and the common pressed style only changes opacity to 0.92. Several controls rely on those values, so the Bubble/Sorbet press response exists technically but is too subtle for user-visible confirmation."
  artifacts:
    - path: "apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx"
      issue: "Default scale-only press target is subtle and has no stronger visual state."
    - path: "apps/mobile/src/presentation/theme/tokens.ts"
      issue: "motion.pressScale is 0.96, which is barely noticeable on larger rows and buttons."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "Shared pressed style only reduces opacity to 0.92."
  missing:
    - "Make Bubble/Sorbet press feedback more visible through stronger shared motion and/or themed pressed surface states."
    - "Keep the stronger feedback layout-stable across buttons, chips, rows, tabs, and story choices."

- truth: "Top-level screens show the Sorbet backdrop, floating tab bar clears safe areas, final scroll content is reachable, and sheet/selected states remain readable in light and dark themes."
  status: failed
  reason: "User reported: in light theme the dark mode switch is not visible and should be custom-styled instead of native; dictionary word sheet opens as an oversized top-reaching panel with unreadable or missing content instead of content-dependent height."
  severity: major
  test: 2
  root_cause: "Settings still uses the native React Native Switch without themed track/thumb colors or a custom Sorbet control, so it can disappear against the light Bubble/Sorbet card. The dictionary details route asks the native iOS form sheet to fit contents, but the rendered sheet content includes flex: 1 in styles.sheetContent, which makes the content expand instead of measuring to its intrinsic height; on the captured device the result is an oversized top-reaching sheet with unreadable content."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SettingsScreen.tsx"
      issue: "Appearance renders a native Switch directly instead of a custom Bubble/Sorbet toggle."
    - path: "apps/mobile/app/_layout.tsx"
      issue: "dictionary-word-details relies on native formSheet fitToContents for content height."
    - path: "apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx"
      issue: "Dictionary details render inside the shared sheet content frame without an override for content-sized layout."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "styles.sheetContent sets flex: 1, which conflicts with content-dependent form sheet height."
  missing:
    - "Replace the native dark-mode Switch with a custom themed Bubble/Sorbet toggle that remains visible in light and dark themes."
    - "Remove or override flex expansion for dictionary detail sheet content so native fitToContents can measure intrinsic height."
    - "Recheck dictionary sheet readability and height on iOS after the content sizing fix."
