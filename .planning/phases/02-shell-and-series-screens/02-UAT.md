---
status: diagnosed
phase: 02-shell-and-series-screens
source:
  - .planning/phases/02-shell-and-series-screens/02-01-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-02-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-03-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-04-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-05-SUMMARY.md
started: 2026-07-05T10:59:33.0044285+03:00
updated: 2026-07-05T13:33:49.5397246+03:00
---

## Current Test

[testing complete]

## Tests

### 1. Restyled authentication panel
expected: The authentication screen uses the soft centered Bubble/Sorbet panel.
result: issue
reported: "При открытии клавиатуры поля перекрываются, при вводе gmail клавиатура мерцает."
severity: major

### 2. Home create-first Bubble layout
expected: The Home screen header and hero read as a create-first Bubble/Sorbet layout.
result: issue
reported: "Очень большая панелька для создания серии, нужен минимализм, как в дизайне."
severity: cosmetic

### 3. Saved series Bubble mini-cards
expected: Saved series appear as compact Bubble/Sorbet mini-cards.
result: issue
reported: "Очень большие кнопки у карточек серий, нужен минимализм."
severity: cosmetic

### 4. Create and edit setup modal behavior
expected: The create series and edit setup modals match design/bubble/newseries.png.
result: issue
reported: "Нужно сделать точь-в-точь как в дизайне на фотографии, сейчас не так."
severity: cosmetic

### 5. Character setup Bubble cards
expected: Character setup uses full editable Bubble/Sorbet cards.
result: pass

### 6. Setup Generate action clarity
expected: The setup form presents one clear Generate action.
result: pass

### 7. Series details primary action hierarchy
expected: The Series Details screen places the continue or prep-next-episode card immediately below the header.
result: issue
reported: "Нужно чтобы соответствовало дизайну и можно поменьше кнопочки."
severity: cosmetic

### 8. Conditional series memory card
expected: Series memory is hidden when empty.
result: pass

### 9. Setup edit header action state
expected: Setup editing remains a small header action.
result: pass

### 10. Episode history soft cards
expected: Episode history uses soft episode cards.
result: pass

### 11. Series details state feedback
expected: Details loading, error, deleting states use stable Bubble/Sorbet status UI.
result: pass

### 12. Settings learning-first hierarchy
expected: Settings leads with learning controls.
result: pass

### 13. Combined learning preferences section
expected: CEFR level, default genre, and Story Word goal are combined into one section.
result: issue
reported: "Нужно заменить в CEFR на свой свитчер, а не айфоновский."
severity: cosmetic

### 14. Compact account and sync row
expected: Account and sync appear as a compact status row.
result: pass

### 15. Settings Bubble status states
expected: Settings success, warning, disabled states use accessible Bubble/Sorbet status UI.
result: pass

### 16. BubbleStatus shared presentation primitive
expected: BubbleStatus shared presentation primitive
result: pass
source: automated
coverage_id: D1

### 17. Home state feedback and layout guard
expected: State feedback and layout guard
result: pass
source: automated
coverage_id: D3

## Summary

total: 17
passed: 11
issues: 6
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The authentication screen uses the soft centered Bubble/Sorbet panel."
  status: failed
  reason: "User reported: При открытии клавиатуры поля перекрываются, при вводе gmail клавиатура мерцает."
  severity: major
  test: 1
  root_cause: "Incorrect nesting of KeyboardAvoidingView inside a ScrollView, combined with justifyContent: 'center'."
  artifacts:
    - path: "apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx"
      issue: "KeyboardAvoidingView is nested inside ScrollView"
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "authScrollContent uses justifyContent: 'center'"
  missing:
    - "Invert hierarchy so KeyboardAvoidingView wraps ScrollView"
    - "Remove justifyContent: 'center' and use margins/padding"
  debug_session: ".planning/debug/auth-panel.md"

- truth: "The Home screen header and hero read as a create-first Bubble/Sorbet layout."
  status: failed
  reason: "User reported: Очень большая панелька для создания серии, нужен минимализм, как в дизайне."
  severity: cosmetic
  test: 2
  root_cause: "CreateHero uses BubbleSurface variant='hero' which forces massive padding."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "Uses oversized variant='hero' for CreateHero"
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "Mixes layout rules with visual sizing rules"
  missing:
    - "Separate layout from sizing in styles"
    - "Change CreateHero to use variant='card' or reduce internal spacing"
  debug_session: ".planning/debug/home-layout.md"

- truth: "Saved series appear as compact Bubble/Sorbet mini-cards."
  status: failed
  reason: "User reported: Очень большие кнопки у карточек серий, нужен минимализм."
  severity: cosmetic
  test: 3
  root_cause: "SeriesCard passes sizing overrides to BubbleButton via style prop instead of contentStyle."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "uses style prop instead of contentStyle for sizing overrides"
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "button styles lack a paddingVertical override"
  missing:
    - "Pass sizing to contentStyle in BubbleButton"
    - "Add paddingVertical override for compact buttons"
  debug_session: ".planning/debug/series-cards.md"

- truth: "The create series and edit setup modals match design/bubble/newseries.png."
  status: failed
  reason: "User reported: Нужно сделать точь-в-точь как в дизайне на фотографии, сейчас не так."
  severity: cosmetic
  test: 4
  root_cause: "CreateSeriesModal and SeriesSetupModal use the legacy iOS-style modalHeader, and Generate button is inside the form body."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "Places Generate button in form body"
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "uses legacy native header layout"
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "modalHeader retains standard native border/layout styling"
  missing:
    - "Restyle modalHeader for a large, left-aligned title without a bottom border"
    - "Move Generate and Save into the right side of this new header, remove setupGenerateRow"
  debug_session: ".planning/debug/setup-modals.md"

- truth: "The Series Details screen places the continue or prep-next-episode card immediately below the header."
  status: failed
  reason: "User reported: Нужно чтобы соответствовало дизайну и можно поменьше кнопочки."
  severity: cosmetic
  test: 7
  root_cause: "Entire continue/prep card is a single massive JellyPressable button instead of a static card."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "continueBanner uses JellyPressable for whole card, omits inner button wrapper"
  missing:
    - "Change banner to static View/BubbleSurface"
    - "Move JellyPressable to only wrap the text, applying styles.bannerButton"
  debug_session: ".planning/debug/series-details.md"

- truth: "CEFR level, default genre, and Story Word goal are combined into one section."
  status: failed
  reason: "User reported: Нужно заменить в CEFR на свой свитчер, а не айфоновский."
  severity: cosmetic
  test: 13
  root_cause: "Settings screen uses native iOS SegmentedControl for CEFR selection."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SettingsScreen.tsx"
      issue: "Uses native SegmentedControl"
  missing:
    - "Create a custom BubbleSegmentedControl primitive in shared/ and replace the native control in SettingsScreen.tsx"
  debug_session: ".planning/debug/cefr-switch.md"
