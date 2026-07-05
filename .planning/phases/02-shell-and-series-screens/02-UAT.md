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
updated: 2026-07-05T11:24:44.2896892+03:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Restyled authentication panel
expected: The authentication screen uses the soft centered Bubble/Sorbet panel, pill mode switch, rounded inputs, accessible status badge, and design/bubble/auth.png visual language while preserving the existing sign-in and sign-up actions.
result: issue
reported: "when i filling out a email field my keyboard is jumping, rerendering"
severity: major

### 2. Home create-first Bubble layout
expected: The Home screen header and hero read as a create-first Bubble/Sorbet layout, with the primary create action visually dominant and aligned with design/bubble/home.png.
result: issue
reported: "Create story panel and series cards are so big and do not match the design"
severity: cosmetic

### 3. Saved series Bubble mini-cards
expected: Saved series appear as compact Bubble/Sorbet mini-cards with readable metadata, clear tap targets, and no regression to previous flat list styling.
result: issue
reported: "series cards are so big and do not match the design"
severity: cosmetic

### 4. Create and edit setup modal behavior
expected: The create series and edit setup modals keep the existing form behavior while matching the rounded Bubble/Sorbet segmented controls, inputs, and action styling from design/bubble/newseries.png.
result: issue
reported: "It is also does not match the design from pngs"
severity: cosmetic

### 5. Character setup Bubble cards
expected: Character setup uses full editable Bubble/Sorbet cards that make each character row visually distinct and preserve editing controls.
result: issue
reported: "It is also does not match the design from pngs"
severity: cosmetic

### 6. Setup Generate action clarity
expected: The setup form presents one clear Generate action, with disabled/loading/error feedback still visible and not competing with secondary controls.
result: issue
reported: "It is also does not match the design from pngs"
severity: cosmetic

### 7. Series details primary action hierarchy
expected: The Series Details screen places the continue or prep-next-episode card immediately below the header as the strongest visual priority, matching design/bubble/series.png layout intent.
result: issue
reported: "it need to make shortly, so many information, customer can be confused"
severity: major

### 8. Conditional series memory card
expected: Series memory is hidden when empty and appears as a richer Bubble/Sorbet card only when memory content exists.
result: issue
reported: "it needs to delete"
severity: major

### 9. Setup edit header action state
expected: Setup editing remains a small header action, and after the first episode its disabled or read-only state is visually clear.
result: pass

### 10. Episode history soft cards
expected: Episode history uses soft episode cards with title, summary, status, and compact read/delete actions instead of a plain list.
result: pass

### 11. Series details state feedback
expected: Details loading, error, deleting, disabled, read-only, and empty-history states use stable Bubble/Sorbet status UI and remain understandable.
result: pass

### 12. Settings learning-first hierarchy
expected: Settings leads with learning controls rather than account/sync or appearance, matching the intended learning-first hierarchy from design/bubble/settings.png.
result: issue
reported: "default genre is so strange setting and does not work, it must be to remove, dark mode setting must be above than signed in as"
severity: major

### 13. Combined learning preferences section
expected: CEFR level, default genre, and Story Word goal are combined into one prominent Learning Preferences section with clear controls and readable values.
result: pass

### 14. Compact account and sync row
expected: Account and sync appear as a compact status row with the manual sync action still available and easy to understand.
result: issue
reported: "is can be a bit smaller"
severity: cosmetic

### 15. Settings Bubble status states
expected: Settings success, warning, disabled, loading, offline, and error states use accessible Bubble/Sorbet status UI.
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
passed: 7
issues: 10
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The authentication screen uses the soft centered Bubble/Sorbet panel, pill mode switch, rounded inputs, accessible status badge, and design/bubble/auth.png visual language while preserving the existing sign-in and sign-up actions."
  status: failed
  reason: "User reported: when i filling out a email field my keyboard is jumping, rerendering"
  severity: major
  test: 1
  root_cause: "AuthenticationScreen wraps the whole centered auth layout in KeyboardAvoidingView with justifyContent center, so each controlled email keystroke and keyboard inset change can recenter the panel and make the keyboard appear to jump."
  artifacts:
    - path: "apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx"
      issue: "Full-screen KeyboardAvoidingView controls the centered auth panel while TextInput state updates on every keystroke."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "authKeyboardView uses flex center alignment that can shift the form when keyboard dimensions change."
  missing:
    - "Stabilize the auth layout during text entry, likely by replacing the full-screen centered KeyboardAvoidingView behavior with a stable scroll/content container or narrower keyboard-aware region."
  debug_session: ""
- truth: "Account and sync appear as a compact status row with the manual sync action still available and easy to understand."
  status: failed
  reason: "User reported: is can be a bit smaller"
  severity: cosmetic
  test: 14
  root_cause: "AccountSync uses a full settingsCard with BubbleStatus row and two full-width BubbleButton controls, producing a larger block than the compact account/sync row expected by the PNG reference."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SettingsScreen.tsx"
      issue: "AccountSync composes signed-in row, status row, and action buttons as a large section."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "settingsCard, practiceActions, and BubbleButton defaults create a tall account/sync treatment."
  missing:
    - "Compress AccountSync layout and button/status sizing while keeping manual sync and sign-out available."
  debug_session: ""
- truth: "Settings leads with learning controls rather than account/sync or appearance, matching the intended learning-first hierarchy from design/bubble/settings.png."
  status: failed
  reason: "User reported: default genre is so strange setting and does not work, it must be to remove, dark mode setting must be above than signed in as"
  severity: major
  test: 12
  root_cause: "SettingsScreen places Appearance after AccountSync and exposes preferredGenre through GenreDefault even though the user reports the default genre setting is confusing and non-functional."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SettingsScreen.tsx"
      issue: "Render order is LearningPreferencesSection, AccountSync, Appearance; LearningPreferencesSection includes GenreDefault."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "Settings styles support the oversized genre choice row that should be removed from this screen."
  missing:
    - "Remove Default Genre from Settings or its visible UI."
    - "Move Appearance/Dark Mode above AccountSync/Signed in as."
    - "Adjust preference persistence calls so removing the visible genre control does not break CEFR or Story Word updates."
  debug_session: ""
- truth: "Series memory is hidden when empty and appears as a richer Bubble/Sorbet card only when memory content exists."
  status: failed
  reason: "User reported: it needs to delete"
  severity: major
  test: 8
  root_cause: "SeriesDetailsScreen renders a Series Memory BubbleSurface whenever memory summary or cliffhanger exists, but UAT now rejects that card entirely for this screen."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "Conditional Series Memory card is rendered inside the details page."
  missing:
    - "Remove the Series Memory card from the visible Series Details screen while preserving underlying memory data for AI context."
  debug_session: ""
- truth: "The Series Details screen places the continue or prep-next-episode card immediately below the header as the strongest visual priority, matching design/bubble/series.png layout intent."
  status: failed
  reason: "User reported: it need to make shortly, so many information, customer can be confused"
  severity: major
  test: 7
  root_cause: "SeriesDetailsScreen shows genre, title, mode/user role, full premise, and a verbose continue/prep banner before the episode list, creating too much copy in the primary action area."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "Header and continue/prep banner include multiple descriptive text blocks."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "continueBanner and seriesDetailsHeader styles encourage a large text-heavy hero."
  missing:
    - "Shorten Series Details header and primary action copy, preserving the continue/prep action but reducing explanatory text."
  debug_session: ""
- truth: "The setup form presents one clear Generate action, with disabled/loading/error feedback still visible and not competing with secondary controls."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 6
  root_cause: "CreateSeriesModal and SeriesSetupModal use generic modalContent spacing, full-width segmented groups, and BubbleButton defaults instead of the tighter composition shown in design/bubble/newseries.png."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "CreateSeriesModal Generate action is appended after a long generic form stack."
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "SeriesSetupModal duplicates the same generic Generate action layout."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "heroButton/primaryButton/modalContent styles do not create the PNG-specific setup action hierarchy."
  missing:
    - "Rework Generate action placement and spacing to match newseries.png while keeping loading, disabled, and error states visible."
  debug_session: ""
- truth: "Character setup uses full editable Bubble/Sorbet cards that make each character row visually distinct and preserve editing controls."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 5
  root_cause: "CharacterProfilesEditor renders each character as a generic BubbleSurface with full text inputs and labels, which is visually heavier and less PNG-aligned than the expected character list/card treatment."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "CharacterProfilesEditor uses full editable BubbleSurface rows in the create modal."
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "CharacterProfilesEditor uses the same heavy card treatment in setup editing."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "characterCard and formInput sizing create bulky character blocks."
  missing:
    - "Restyle character rows to match newseries.png, reducing visual weight without removing edit controls."
  debug_session: ""
- truth: "The create series and edit setup modals keep the existing form behavior while matching the rounded Bubble/Sorbet segmented controls, inputs, and action styling from design/bubble/newseries.png."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 4
  root_cause: "The setup modals were restyled with reusable Bubble primitives but not tuned against the actual PNG layout, so the modal spacing, field order, segmented controls, and card proportions diverge from design/bubble/newseries.png."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "CreateSeriesModal uses generic stacked ChoiceGroup/FormField structure."
    - path: "apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx"
      issue: "SeriesSetupModal mirrors the generic setup form structure."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "Shared modal and form styles are not PNG-specific enough for the setup design."
  missing:
    - "Rebuild setup modal composition against design/bubble/newseries.png while preserving existing form state and validation."
  debug_session: ""
- truth: "Saved series appear as compact Bubble/Sorbet mini-cards with readable metadata, clear tap targets, and no regression to previous flat list styling."
  status: failed
  reason: "User reported: series cards are so big and do not match the design"
  severity: cosmetic
  test: 3
  root_cause: "SeriesCard uses BubbleSurface card padding, title/meta/premise/footer/actions, and a 16px grid gap, creating large cards instead of compact mini-cards."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "SeriesCard renders multiple text and action regions inside each saved series card."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "seriesListGrid, seriesCard, seriesPremise, and seriesCardFooter styles produce oversized cards."
  missing:
    - "Reduce saved series card height, copy, padding, and actions to match design/bubble/home.png compact mini-cards."
  debug_session: ""
- truth: "The Home screen header and hero read as a create-first Bubble/Sorbet layout, with the primary create action visually dominant and aligned with design/bubble/home.png."
  status: failed
  reason: "User reported: Create story panel and series cards are so big and do not match the design"
  severity: cosmetic
  test: 2
  root_cause: "CreateHero uses BubbleSurface variant hero with xl padding plus multi-line explanatory copy, making the create panel larger than the home.png reference and compounding the oversized series card issue."
  artifacts:
    - path: "apps/mobile/src/presentation/app/screens/HomeScreen.tsx"
      issue: "CreateHero renders tag, title, explanatory paragraph, and button inside a large hero surface."
    - path: "apps/mobile/src/presentation/app/MobileApp.styles.ts"
      issue: "heroSurface, heroContent, heroText, heroButton, and BubbleSurface hero defaults create too much vertical space."
  missing:
    - "Make the create story panel shorter and more PNG-aligned, likely by reducing copy, padding, and hero emphasis."
  debug_session: ""
