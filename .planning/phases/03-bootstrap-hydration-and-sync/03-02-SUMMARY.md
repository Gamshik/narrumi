# 03-02: Authenticated Bootstrap State

## Work Completed
- Defined `BootstrapState`, `BootstrapReadyState`, and testable state helpers.
- Created `BootstrapProvider` to manage the root authenticated hydration and background sync.
- Wrapped `<ThemedStack />` with `<BootstrapProvider>` under `<AuthGate>` in `_layout.tsx`.
- Removed duplicate eager sync from `AuthProvider`.

## Verification
- Local unit tests pass.
- Hydration properly blocks guarded surfaces while syncing does not.
- Failed sync surfaces as a non-blocking diagnostic warning instead of replacing local preferences.
- Typecheck and lint succeed.

## Status
Completed successfully.
