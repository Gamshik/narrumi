# Debug Session: Series Details Screen Layout

## Context
**Goal:** find_root_cause_only
**Truth:** The Series Details screen places the continue or prep-next-episode card immediately below the header.
**Expected:** The Series Details screen places the continue or prep-next-episode card immediately below the header.
**Actual:** Нужно чтобы соответствовало дизайну и можно поменьше кнопочки.
**Errors:** None reported
**Reproduction:** Test 7 in UAT
**Timeline:** Discovered during UAT

## Hypotheses & Investigation
1. **Hypothesis**: The "continueBanner" is styled as a huge button instead of a card containing a smaller button.
   **Check**: Looked at `SeriesDetailsScreen.tsx` and `design/bubble/series.png`.
   **Finding**: The design shows a static card containing a smaller "Continue Reading" / "Start Setup" button. However, the code wraps the *entire* card in a `JellyPressable`, making the whole card a giant button. Additionally, the inner button's styling (`styles.bannerButton`) was omitted entirely, leaving just the floating text `styles.bannerButtonText`.
2. **Conclusion**: Root cause identified.

## Root Cause
The entire continue/prep card is implemented as a single massive `JellyPressable` button instead of a static card containing a smaller button, violating the design. The inner button's visual container (`<View style={styles.bannerButton}>`) was omitted, leaving only floating text.

## Suggested Fix
Change the continue/prep banner from a `JellyPressable` to a static `View` or `BubbleSurface`. Move the `JellyPressable` (or use `BubbleButton`) to only wrap the "Continue Reading" / "Start Setup" text, applying `styles.bannerButton` to it so it matches the smaller button shown in the design.
