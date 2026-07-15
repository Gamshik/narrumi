---
status: resolved
trigger: "сейчас его видно под карточкой, а должно быть видно когда потянем только, я хочу функционал как в ТГ, а тут ещё и карточка багано тянется - испрвляй"
created: 2026-07-15T05:13:35+03:00
updated: 2026-07-15T05:17:14+03:00
---

# Debug Session: Swipe delete reveal and drag jank

## Symptoms

**Expected:** The delete action is fully hidden at rest and reveals only while the series card follows a deliberate left drag, with Telegram-like direct motion.
**Actual:** The destructive layer is visible beneath the resting card and the card can jump or overshoot while dragging and settling.
**Errors:** No runtime error was reported.
**Timeline:** Reproduced after the first swipe-to-delete redesign.
**Reproduction:** Open Home with saved series and drag a series card horizontally.

## Current Focus

**hypothesis:** Confirmed: the always-mounted glow/background leaked around rounded corners, while asynchronous drag-origin capture, a bouncing spring, and nested press scaling caused motion discontinuities.
**test:** Regression checks now require a zero-progress action opacity, synchronous live-offset tracking, overshoot clamping, and translation-only card motion.
**expecting:** No destructive pixels at zero progress; one-axis card translation stays within closed and open endpoints.
**next_action:** Resolved and verified.

## Evidence

- timestamp: 2026-07-15T05:13:35+03:00
  observation: `actionLaneGlow` is always rendered with red fill and 0.14 opacity.
- timestamp: 2026-07-15T05:13:35+03:00
  observation: The release spring has non-zero bounciness and does not clamp overshoot.
- timestamp: 2026-07-15T05:13:35+03:00
  observation: Gesture origin is assigned inside the asynchronous `stopAnimation` callback.
- timestamp: 2026-07-15T05:13:35+03:00
  observation: `JellyPressable` still applies its default scale animation during a slow swipe.

## Eliminated

- hypothesis: Local persistence or delete confirmation causes the visual defect.
  reason: The defect occurs before the delete action is pressed.

## Resolution

**root_cause:** A persistent red glow and wrapper fill remained visible behind rounded corners. The release spring could overshoot the lane width, the gesture origin arrived asynchronously, and the nested press animation scaled the row during slow drags.
**fix:** Replaced the capsule/glow with an anchored red action lane whose opacity is exactly zero at rest; removed card scale and rotation; tracked the live animated offset synchronously; clamped spring overshoot; disabled nested press scaling; tightened Telegram-style activation and snap metrics.
**verification:** `npm run lint`, `npm run test` (100 passed), `npm run typecheck`, `npm run build`, and `git diff --check` passed.
**files_changed:** `SwipeableSeriesCard.tsx`, `SwipeableSeriesCard.styles.ts`, `useSeriesSwipeGesture.ts`, `seriesSwipeMotion.ts`, `seriesSwipeMotion.test.ts`, and `layout.test.ts`.
