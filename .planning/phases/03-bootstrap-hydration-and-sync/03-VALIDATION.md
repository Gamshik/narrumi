# Phase 03: Bootstrap Hydration And Sync - Validation

**Created:** 2026-07-06
**Source:** `.planning/phases/03-bootstrap-hydration-and-sync/03-RESEARCH.md` Validation Architecture
**Status:** Ready for execution

## Validation Purpose

Phase 03 must prove that local bootstrap hydration prevents settings-visible default flicker, that background sync is non-blocking, and that the existing mobile verification gate still passes after implementation.

## Framework And Commands

| Property | Value |
|----------|-------|
| Test framework | Node test runner through `tsx --test` |
| Test script | `cd apps/mobile && npm run test` |
| Lint script | `cd apps/mobile && npm run lint` |
| Typecheck script | `cd apps/mobile && npm run typecheck` |
| Build script | `cd apps/mobile && npm run build` |
| Phase gate | `cd apps/mobile && npm run lint && npm run test && npm run typecheck && npm run build` |

## Requirement Validation Map

| Requirement | Required Proof | Planned Automated Coverage |
|-------------|----------------|----------------------------|
| BOOT-01 | Settings-visible route waits on bootstrap before rendering preference controls. | `BootstrapProvider` state tests, settings route guard verification, and Settings state tests. |
| BOOT-02 | Local preferences load or initialize before any remote sync release dependency. | `hydrateBootstrapSession.test.ts` verifies loaded, created, recovered, and no pre-sync behavior. |
| BOOT-03 | Bootstrap loading uses Bubble/Sorbet visual language and calm session-preparation copy. | `bootstrapUiState.test.ts` verifies copy/tone mapping; lint/typecheck verify component wiring. |
| SET-01 | Placeholder defaults never render as saved preferences while hydration is unresolved. | `settingsState.test.ts` and route-level guard instructions verify no placeholder fixture is required before ready state. |
| SET-02 | Settings exposes loading, loaded, error, recovered, offline-aware, and save-error states explicitly. | `bootstrapState.test.ts`, `bootstrapUiState.test.ts`, and `settingsState.test.ts`. |
| SYNC-01 | Bootstrap starts one first sync attempt after local hydration when possible. | `bootstrapState.test.ts` and provider implementation checks through typecheck. |
| SYNC-02 | Offline sync outcome does not block app entry. | Existing sync tests plus bootstrap state tests for non-blocking offline result. |
| SYNC-03 | Failed remote sync keeps local data visible and surfaces a warning. | `bootstrapState.test.ts` and `settingsState.test.ts`. |

## Nyquist Coverage Expectations

- Every behavior-changing task in plans 03-01 through 03-04 includes an `<automated>` verification command.
- Wave 1 creates the missing local hydration regression tests before implementing the use case.
- Wave 2 creates pure bootstrap state tests before provider wiring.
- Wave 3 creates pure bootstrap UI-state tests before component wiring.
- Wave 4 creates Settings state tests before the Settings no-flicker refactor and runs the full phase gate.

## Manual Verification Notes

Automated tests are the required gate. A manual Expo check is useful after implementation to observe that:

1. Opening the Settings tab during bootstrap shows the dedicated Bubble/Sorbet bootstrap screen, not `RouteScreen` content or `SorbetTabBar`.
2. Settings controls appear only after bootstrap ready state.
3. Offline startup reaches local data without hanging.
4. Failed sync shows a non-blocking warning while settings remain editable.

## Full Phase Gate

```powershell
cd apps/mobile
npm run lint
npm run test
npm run typecheck
npm run build
```
