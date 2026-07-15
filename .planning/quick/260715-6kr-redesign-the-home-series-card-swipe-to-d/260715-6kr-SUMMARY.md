---
quick_id: 260715-6kr
status: complete
date: 2026-07-15
---

# Swipe-to-delete redesign summary

## Result

- Replaced the custom `PanResponder` stack with Expo-compatible native Gesture Handler and Reanimated swipe motion.
- Removed manual scroll locking, press-suppression timers, card scaling, and the full-size destructive substrate that caused bleed-through and geometry gaps.
- The opaque card now follows the finger on one axis while one 104-point action lane is uncovered from right to left; overshoot is disabled and the action content enters progressively.
- Reworked the flat red action into one Sorbet berry material: dimensional red-to-pink depth, a restrained grape halo, a traveling sheen, and a top-lit trash core.
- Sequenced the material, icon, and caption instead of revealing them simultaneously; pressing delete compresses only the visual core and never opens gaps at the card edge.
- Preserved confirmation, accessibility actions, light/dark themes, system Reduce Motion, scroll-to-close behavior, and one-open-row coordination.
- Added stale-close protection so an old card finishing its close animation cannot close a newly opened card.
- Extracted the destructive lane, native swipe card, presentation helper, ownership helper, styles, and regression tests into focused modules.

## Verification

- `npm run lint` — passed.
- `npm run test` — passed (101 current tests across 26 suites).
- `npm run typecheck` — passed.
- `npm run build` — attempted; Expo export is currently blocked by the unrelated missing `DictionaryLevelFilterPopover` export in the concurrently edited Dictionary module.
- `git diff --check` — passed.
- Visual interaction check — target-device feel remains a handoff check because the full Expo bundle is blocked by the unrelated Dictionary module state.

## Commit

No commit was created because the affected tracked files contain overlapping pre-existing user changes. Leaving the result uncommitted avoids capturing unrelated work.
