---
status: complete
phase: 02-shell-and-series-screens
source:
  - .planning/phases/02-shell-and-series-screens/02-01-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-02-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-03-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-04-SUMMARY.md
  - .planning/phases/02-shell-and-series-screens/02-05-SUMMARY.md
started: 2026-07-05T10:59:33.0044285+03:00
updated: 2026-07-05T11:23:47.4990319+03:00
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
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Account and sync appear as a compact status row with the manual sync action still available and easy to understand."
  status: failed
  reason: "User reported: is can be a bit smaller"
  severity: cosmetic
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Settings leads with learning controls rather than account/sync or appearance, matching the intended learning-first hierarchy from design/bubble/settings.png."
  status: failed
  reason: "User reported: default genre is so strange setting and does not work, it must be to remove, dark mode setting must be above than signed in as"
  severity: major
  test: 12
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Series memory is hidden when empty and appears as a richer Bubble/Sorbet card only when memory content exists."
  status: failed
  reason: "User reported: it needs to delete"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "The Series Details screen places the continue or prep-next-episode card immediately below the header as the strongest visual priority, matching design/bubble/series.png layout intent."
  status: failed
  reason: "User reported: it need to make shortly, so many information, customer can be confused"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "The setup form presents one clear Generate action, with disabled/loading/error feedback still visible and not competing with secondary controls."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Character setup uses full editable Bubble/Sorbet cards that make each character row visually distinct and preserve editing controls."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "The create series and edit setup modals keep the existing form behavior while matching the rounded Bubble/Sorbet segmented controls, inputs, and action styling from design/bubble/newseries.png."
  status: failed
  reason: "User reported: It is also does not match the design from pngs"
  severity: cosmetic
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Saved series appear as compact Bubble/Sorbet mini-cards with readable metadata, clear tap targets, and no regression to previous flat list styling."
  status: failed
  reason: "User reported: series cards are so big and do not match the design"
  severity: cosmetic
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "The Home screen header and hero read as a create-first Bubble/Sorbet layout, with the primary create action visually dominant and aligned with design/bubble/home.png."
  status: failed
  reason: "User reported: Create story panel and series cards are so big and do not match the design"
  severity: cosmetic
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
