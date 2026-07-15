---
quick_id: 260715-mtu
status: planned
date: 2026-07-15
---

# Remove the theme wave transition and keep immediate switching

## Goal

Remove the unstable full-screen theme-transition experiment and all artifacts introduced solely for it. Theme changes must commit immediately, while `BubbleToggle` keeps its lightweight native-driver spring and does not restart or snap back when the controlled value catches up. Preserve every unrelated dirty-worktree change.

## Task 1: Restore a direct theme-switch path and delete the transition runtime

**Files:**

- `apps/mobile/src/presentation/app/theme/ThemeProvider.tsx`
- `apps/mobile/src/presentation/app/theme/index.ts`
- `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`
- `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx`
- `apps/mobile/src/presentation/app/theme/ThemeTransitionOverlay/` (delete the whole transition-only folder, including its tests)

**Action:**

- Reduce `ThemeProvider` back to one appearance context with a synchronous `setDarkMode` state commit and fire-and-forget persistence. Keep the existing protection that prevents late AsyncStorage hydration from overwriting a direct user choice.
- Remove `ThemeTransitionOverlay`, `useThemeTransition`, the transition context/hook/export, capture refs, viewport state, snapshot lifecycle, Reduce Motion policy, organic-wave geometry, and every transition-only test/helper/style module.
- Wire Settings `Appearance` directly from `useAppTheme()` to `BubbleToggle` with `onValueChange={setDarkMode}`. Remove press-in capture, origin geometry, temporary disabling, and transition lifecycle props.
- Keep the optimized `BubbleToggle` behavior that starts its `useNativeDriver: true` spring before invoking the parent callback and uses the pending/visual refs to avoid a controlled-value restart. Remove only transition-specific API surface: `BubbleToggleChangeDetails`, press-origin calculation, and `dimWhenDisabled`; restore the reusable boolean `onValueChange` contract.
- Do not revert stable theme style/navigation caching, gesture/Reanimated work used by swipe-to-delete, or any unrelated app changes already present in the dirty worktree.

**Done:** Tapping Dark Mode immediately commits the palette, the thumb performs one smooth native spring in either direction, and no screenshot, mask, overlay, wave, deferred frame, or transition lock remains in the runtime path.

## Task 2: Remove transition-only dependencies and repository artifacts

**Files:**

- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `design/design_system_guidelines.md`
- `.planning/debug/theme-snapshot-jump.md` (delete)
- `.planning/debug/resolved/theme-switch-wave-sync.md` (delete)
- `.planning/debug/resolved/theme-wave-performance.md` (delete)
- `.planning/debug/resolved/theme-wave-remove-capture.md` (delete)
- `.planning/debug/resolved/theme-wave-start-delay.md` (delete)
- `.planning/debug/resolved/theme-wave-timing.md` (delete)

**Action:**

- Run `npm uninstall @react-native-masked-view/masked-view react-native-view-shot` from `apps/mobile` so both cease to be direct app dependencies and the lockfile is pruned consistently. It is acceptable for MaskedView to remain transitively locked through `expo-router`; do not remove or alter unrelated `react-native-gesture-handler`, `react-native-reanimated`, or `react-native-worklets` dependencies used by the swipe interaction.
- Replace the progressive Theme Transition subsection with the final contract: palette application is immediate, there is no app-wide screenshot/mask/wave effect, and only the control's native spring supplies feedback.
- Delete all untracked debug records created for the abandoned theme-wave sequence. Preserve tracked `.planning/debug/phase-01-toggle-animation.md` and every non-theme resolved debug artifact because they predate or belong to unrelated work.

**Done:** There is no transition-only source, test, direct dependency, design requirement, or debug-session artifact left, and unrelated dirty-worktree files remain untouched.

## Verification

Run from `apps/mobile`:

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Run from the repository root:

- `rg -n "ThemeTransition|prepareThemeTransition|transitionToDarkMode|react-native-view-shot|@react-native-masked-view/masked-view" apps/mobile/src apps/mobile/package.json design/design_system_guidelines.md` — expect no matches.
- `git diff --check`
- Review `git status --short` and the scoped diff to confirm only transition-related portions were removed and unrelated user changes were preserved.

Manual device check:

- In Settings, toggle Dark Mode repeatedly in both directions. The palette must change immediately; the thumb must move once with a smooth native spring; the screen must not jump, freeze, flash an old frame, or show any overlay effect.
