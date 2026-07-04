---
status: diagnosed
trigger: "UAT Test 3: dictionary word detail still opens a broken window"
created: 2026-07-04T22:21:24Z
updated: 2026-07-04T22:21:24Z
---

# Phase 01 Dictionary Sheet Diagnosis

## Symptoms

- Expected: The dictionary word detail sheet is content-sized, readable, closable, and does not stretch to the top of the screen.
- Actual: Opening a dictionary word still shows a broken window, unchanged from the earlier report.
- Reproduction: Phase 01 UAT Test 3.

## Evidence

- `apps/mobile/app/_layout.tsx` presents `dictionary-word-details` as an iOS `formSheet` with `sheetAllowedDetents: 'fitToContents'`.
- `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` no longer uses the old `styles.sheetContent` flex wrapper.
- `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` still renders its root as an absolute full-screen overlay with `top: 0`, `bottom: 0`, `left: 0`, and `right: 0`.
- A full-screen absolute root defeats the route-level content measurement: the native form sheet measures the wrapper, not just the dictionary details content.
- `apps/mobile/app/dictionary-word-details.tsx` initializes `word` as `undefined`, so the route initially renders the same visual path as a missing word before the async bundled catalog lookup completes.

## Root Cause

Plan 04 fixed the inner dictionary content wrapper, but the reusable `BubbleSheet` frame still forces a full-screen absolute layout. In a native `formSheet` route using `fitToContents`, that full-height wrapper keeps the sheet from measuring only its intrinsic dictionary content. The route also conflates loading and missing-word states, which can briefly render "Word not found" while the local catalog lookup is still pending.

## Suggested Fix Direction

- Add a content-sized mode to `BubbleSheet` or bypass the full-screen root when it is rendered inside a native `formSheet` route without a scrim.
- Keep full-screen absolute behavior only for in-app overlay sheets that need a scrim/backdrop.
- Add an explicit loading state in `dictionary-word-details.tsx` so unresolved catalog lookup is not presented as missing content.
