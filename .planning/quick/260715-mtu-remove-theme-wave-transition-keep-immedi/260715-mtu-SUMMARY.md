---
quick_id: 260715-mtu
status: complete
date: 2026-07-15
---

# Theme-wave removal summary

## Result

- Removed the full-screen screenshot, mask, organic-wave, transition policy, Reduce Motion, and snapshot lifecycle runtime together with its tests and helper modules.
- Restored a direct Settings path from `BubbleToggle` to `ThemeProvider.setDarkMode`, so the palette is committed synchronously and persisted without blocking the interaction.
- Preserved the startup hydration guard that prevents a late storage read from overwriting a user's direct selection.
- Kept the optimized native-driver thumb spring and its pending-value guard, while removing transition-only press geometry and disabled-state API.
- Removed `react-native-view-shot` and direct `@react-native-masked-view/masked-view` dependencies and pruned their transition-only lockfile entries.
- Replaced the progressive-reveal design contract with immediate palette switching and local switch feedback only.
- Deleted the abandoned theme-wave debug-session artifacts.

## Verification

- `npm run test` — passed (94 tests across 26 suites).
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed for web, Android, and iOS exports.
- Transition residue search — passed with no matches in app source, direct dependencies, or the design guideline.
- Direct dependency checks — neither transition-only package remains direct.
- `git diff --check` — passed.
- Manual device interaction remains a handoff check; no simulator or physical device was controlled during this execution.

## Commit

No commit was created because the affected tracked files share a dirty worktree with unrelated user changes. Staging them wholesale could capture unrelated work, so the verified result remains uncommitted.
