# Debug Session: Setup Modals UI Mismatch

## Symptoms
**Goal:** The create series and edit setup modals match design/bubble/newseries.png.
**Actual:** Нужно сделать точь-в-точь как в дизайне на фотографии, сейчас не так.
**Reproduction:** Test 4 in UAT

## Investigation
- Reviewed `design/bubble/newseries.png` image. It shows a soft modal layout with a large left-aligned "New Series" title and an orange "✨ Generate" pill button in the header row. There are no "Cancel" or "Save" standard iOS buttons, and no bottom border in the header.
- Reviewed `HomeScreen.tsx` (CreateSeriesModal). It uses `<View style={styles.modalHeader}>` which has `Cancel` and `Save` buttons, and a centered title. The "Generate" button is inside the `ScrollView` inside a `<View style={styles.setupGenerateRow}>`.
- Reviewed `SeriesDetailsScreen.tsx` (SeriesSetupModal). It also uses `<View style={styles.modalHeader}>` with `Close` and `Save` buttons, and a centered title.
- Reviewed `MobileApp.styles.ts`. `modalHeader` is defined with `justifyContent: "space-between"`, `borderBottomWidth`, and `alignItems: "center"`.

## Root Cause
Both setup modals rely on a standard iOS-style `modalHeader` with centered titles and native text buttons (Cancel/Save) rather than the Bubble/Sorbet "Create-first" layout shown in the design. The design expects a borderless header with a large left-aligned title and the primary action button ("Generate" or "Save") on the right.

## Suggested Fix
Create a new `bubbleModalHeader` (or update `modalHeader`) that supports `styles.largeTitle` aligned left, removes the bottom border, and accepts a right-aligned `BubbleButton` (for Generate/Save). Move the "Generate" button out of the scroll view in `CreateSeriesModal` and into the header.
