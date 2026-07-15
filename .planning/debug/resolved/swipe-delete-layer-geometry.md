---
status: resolved
trigger: "он смотрится сейчас как отдельный блок справва при чём имея пустые пространства из-за геометрии, пустрь смотрится как блок ПОД карточкой и пусть появляется по мере свайпа и контент показывается тогда, когда поставим в положение карточку, и тогда не будет выидно ни чего под карточкой и будет красивые эффект, и не забудь про геометрию, край к краю должны прилегать, чтобы создался эффект одного блока и под ним этого удаления"
created: 2026-07-15T05:18:50+03:00
updated: 2026-07-15T05:23:00+03:00
---

# Debug Session: Swipe delete layer geometry

## Symptoms

**Expected:** A full-size destructive layer shares the card geometry underneath it, reveals edge-to-edge as the card moves, and shows its icon and label only after the card settles open.
**Actual:** The destructive area is a separate 92-point block on the right, leaving geometric gaps and showing content during the drag.
**Errors:** No runtime error was reported.
**Timeline:** Observed after the compact Telegram-style motion correction.
**Reproduction:** Swipe a saved-series card left on Home and inspect the revealed right edge before and after snap.

## Current Focus

**hypothesis:** Confirmed: the narrow action lane owned visible geometry instead of acting as a full card-sized substrate, and content visibility was interpolated directly from drag progress.
**test:** Regression checks now require an absolute-fill substrate, a separately positioned trailing hit target, shared reveal geometry, and content readiness driven by settle completion.
**expecting:** The two layers share identical outer bounds and radii; only the substrate is visible while dragging; action content appears after the open spring finishes.
**next_action:** Resolved and verified.

## Evidence

- timestamp: 2026-07-15T05:18:50+03:00
  observation: `actionLane` is absolutely positioned with `width: 92` and no left edge.
- timestamp: 2026-07-15T05:18:50+03:00
  observation: Action content opacity and translation are interpolated directly from swipe progress.

## Eliminated

- hypothesis: The card surface height causes the empty geometry.
  reason: The card and clipped shell already share the same 88-point row height; the mismatch is horizontal layer ownership.

## Resolution

**root_cause:** The destructive element was itself a narrow 92-point visual block, so its bounds could not match the card and exposed geometric gaps. Its icon and label were also tied directly to swipe progress instead of the settled-open state.
**fix:** Made the destructive surface absolute-fill beneath the card, kept only an invisible trailing hit target at the shared reveal width, derived the open offset from the same width constant, and delayed content entrance until the open spring completes.
**verification:** `npm run lint`, `npm run test` (99 passed), `npm run typecheck`, `npm run build`, and `git diff --check` passed.
**files_changed:** `SwipeableSeriesCard.tsx`, `SwipeableSeriesCard.styles.ts`, `useSeriesSwipeGesture.ts`, `seriesSwipeMotion.ts`, `seriesSwipeMotion.test.ts`, and `layout.test.ts`.
