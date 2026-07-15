---
quick_id: 260715-wne
status: complete
---

# Improve the Story Word suggestions slider

Refresh the Settings control without changing the persisted Story Word goal contract.

## Task 1: Build the Sorbet slider interaction

- **Files:** `apps/mobile/src/presentation/app/shared/BubbleSlider/*`
- **Action:** Give the slider a restrained matte track, compact drag feedback, reduced-motion handling, and adjustable accessibility semantics. Keep persistence caller-owned.
- **Verify:** Focused helper tests, lint, and typecheck pass.
- **Done:** Dragging and tapping expose a clear 0-12 value with quiet Sorbet motion in both themes, without borrowing the toy-gel tab-bar language.

## Task 2: Refine the Settings presentation

- **Files:** `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`, `apps/mobile/src/presentation/app/screens/settings/components/StoryWordGoalSetting/*`
- **Action:** Keep the setting compact with one title and one live value while preserving the existing local-first update flow and user-authored CEFR work.
- **Verify:** Mobile tests and Expo export pass; final diff contains no unrelated edits.
- **Done:** The Story Word setting is easier to understand and visually consistent with the app design system.

## Iteration: Quiet elastic motion

- Remove the explanatory sentence and endpoint labels so the control scans as one compact setting.
- Add a direction-aware elastic wake behind the thumb during stepped drag movement.
- Keep the wake low-opacity, single-accent, short-lived, and entirely on the JS animation driver.

## Iteration: Visible focus indicator

- Replace the hard-to-see wake with one compact value indicator that rises above the thumb only during interaction.
- Nudge the indicator in the current step direction and settle it immediately.
- Keep the presentation single-color, functional, and fully removed from the resting state.

## Iteration: Sorbet micro-bubbles

- Remove the duplicated floating number entirely.
- Emit three tiny token-colored bubbles around the thumb only when the snapped value changes.
- Drift the bubbles upward and sideways for a clear but short 320 ms response.

## Iteration: Fast-drag visibility

- Start each particle burst at visible opacity instead of an invisible entrance frame.
- Place particles outside the thumb silhouette so rapid restarts create a readable moving trail.
- Preserve the short directional decay after dragging slows or ends.
