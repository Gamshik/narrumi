# Phase 03: bootstrap-hydration-and-sync - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

## Phase Boundary

Remove the settings flicker by bootstrapping user data before settings render and by showing a clear loading experience while local and remote state reconcile. Wait for locally persisted preferences to load before rendering UI that depends on them, and run background sync when online without blocking offline entry.

## Implementation Decisions

### Loading Experience
- **D-01:** Detailed skeletons: use skeletons for each block (series cards, settings toggles) so the interface doesn't "jump" after loading. We will not use a generic full-screen loader or just extend the splash screen.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### General Product & Architecture
- `.planning/PROJECT.md` — Product scope, core value, and milestone target (App Bootstrap Loading).
- `.planning/REQUIREMENTS.md` — v1 Requirements (BOOT-01, BOOT-02, SET-01, SET-02, SYNC-01, SYNC-02, SYNC-03). Note: the "loading experience" requirement (BOOT-03) is now resolved to mean "detailed skeletons".
- `.planning/codebase/STACK.md` — Technology stack, dependencies, and offline-first persistence info.
- `.planning/codebase/ARCHITECTURE.md` — Sync flow, data flow, QueuedLocalSeriesStore vs RemoteSeriesStore.
- `stack/tech_stack_mvp.md` — Canonical tech stack rules.

## Existing Code Insights

### Reusable Assets
- `apps/mobile/src/presentation/app/shared/BubbleStatus/BubbleStatus.tsx`: Can be used for error/offline states.
- `apps/mobile/src/presentation/app/shared/BubbleSurface/`: Can be used as a foundation for building skeleton card variants.

### Established Patterns
- **Offline-First Storage:** AsyncStorage via adapters like `asyncStorageLocalSeriesStore.ts`.
- **Sync:** Runs in background via `syncLocalChanges.ts`. UI doesn't block on network availability.
- **Theming:** Use `useAppStyles` and `ThemeProvider` to color skeletons matching the current theme.

### Integration Points
- `apps/mobile/app/_layout.tsx` / `apps/mobile/app/(tabs)/index.tsx`: Need to inject the skeleton logic around the initial data load.
- Settings screen components (`apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`): Need to show skeletons until local preferences are hydrated.

## Specific Ideas

The user specifically requested detailed skeletons matching the component structures instead of generic loading screens to prevent interface jumping.

## Deferred Ideas

None — discussion stayed within phase scope
