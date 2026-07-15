---
status: resolved
trigger: "нет нет, справа налево пусть растягивается блок, да и он у тебя виден под карточкой, а не должен быть. Не делай карту прозрачной. но и учти что блок ты уменьшаешь при зажатии - эффект и нужно для красного учитывать"
created: 2026-07-15T05:27:44+03:00
updated: 2026-07-15T06:18:00+03:00
---

# Debug Session: Swipe delete reveal mask

## Symptoms

**Expected:** The red action grows from the right edge toward the left in exact sync with swipe distance, remains physically absent at rest even when the card press-scales, and never shows through the opaque card.
**Actual:** A full-size red layer sits under a translucent list surface and can remain visible beneath the card instead of stretching from the right edge.
**Errors:** No runtime error was reported.
**Timeline:** Observed after changing the action into a full-size substrate.
**Reproduction:** Press or swipe a saved-series card and inspect the material before the red action reaches its open endpoint.

## Current Focus

**hypothesis:** The visual bleed and drag instability share one architectural cause: a JS `PanResponder`, nested press animation, manual scroll locking, and a full-size destructive substrate are competing instead of using one native swipe owner.
**test:** Replace the gesture stack with `ReanimatedSwipeable`, render a single fixed-width trailing action, keep the foreground opaque and geometry-stable, and remove Home's responder/timer workarounds.
**expecting:** Zero red pixels at rest, direct one-axis finger tracking, uninterrupted vertical scrolling, an exact edge-to-edge open snap, and no accidental navigation after a drag.
**next_action:** Resolved; keep the regression tests with the component.

## Evidence

- timestamp: 2026-07-15T05:27:44+03:00
  observation: Light and dark `bubbleSurfaceMuted` tokens are translucent rgba values.
- timestamp: 2026-07-15T05:27:44+03:00
  observation: The current red action surface is absolute-fill beneath the entire card.
- timestamp: 2026-07-15T05:27:44+03:00
  observation: The card currently disables the shared 0.94 press-scale with `scaleTo={1}`.
- timestamp: 2026-07-15T06:02:00+03:00
  observation: The installed Expo-compatible `ReanimatedSwipeable` owns pan recognition and spring motion on the UI thread, supports `touchAction="pan-y"`, clamps overshoot, and hides right actions at zero progress.
- timestamp: 2026-07-15T06:09:00+03:00
  observation: A stale close callback from the previous row could clear a newly opened row; functional ownership resolution now ignores callbacks from non-current rows.
- timestamp: 2026-07-15T06:18:00+03:00
  observation: Lint, 101 tests, TypeScript, and Expo export pass after the native rewrite.

## Eliminated

- hypothesis: Press opacity alone causes the bleed-through.
  reason: `pressedOpacityTo={1}` already prevents outer press fading; the card material itself is translucent.

## Resolution

**root_cause:** The previous implementation combined a translucent/full-size underlay with JS-driven responder arbitration, manual scroll disabling, press-scale timers, and unguarded asynchronous close callbacks. These independent systems caused red bleed, gaps during scale, gesture contention, and row-state races.
**fix:** Replaced the custom responder with Expo-compatible `ReanimatedSwipeable`; added a root gesture host; rendered one 96-point trailing action that is physically covered at rest; kept the card opaque and unscaled; disabled overshoot; drove only action content from native progress; removed Home touch/scroll workarounds; and added stale-close-safe single-row ownership.
**verification:** `npm run lint`, `npm test` (101/101), `npm run typecheck`, and `npm run build` all pass. `git diff --check` remains the final repository check.
**files_changed:** `apps/mobile/app/_layout.tsx`; `apps/mobile/package.json`; `apps/mobile/package-lock.json`; `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`; `apps/mobile/src/presentation/app/screens/home/components/SwipeableSeriesCard/**`; `apps/mobile/src/presentation/theme/layout.test.ts`.
