# 03-03: Bootstrap and Guarded UI

## Work Completed
- Added `bootstrapUiState` mapper and pure tests for loading and retryable error copy.
- Built `BootstrapScreen` composing existing `SorbetBackground` and `BubbleStatus` primitives to satisfy D-13, D-14, D-15.
- Implemented `GuardedBootstrapSurface` to protect the settings route from rendering default placeholders during hydration.
- Updated `apps/mobile/app/(tabs)/_layout.tsx` to hide `SorbetTabBar` when the guarded Settings route is active and bootstrap is not ready.
- Updated `apps/mobile/app/(tabs)/settings.tsx` to render `GuardedBootstrapSurface` instead of `RouteScreen` when appropriate.

## Verification
- Local pure tests pass.
- Components use `isDark` and `styles` context seamlessly.
- Lint and typecheck pass without new dependency additions.

## Status
Completed successfully.
