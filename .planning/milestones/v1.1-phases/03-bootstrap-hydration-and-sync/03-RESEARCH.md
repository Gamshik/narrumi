# Phase 03: Bootstrap Hydration And Sync - Research

**Researched:** 2026-07-06
**Domain:** Expo React Native local-first bootstrap, preference hydration, and best-effort sync
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Bootstrap Gate Boundary
- **D-01:** Guard `Settings` and any other screen that reads hydrated user-specific session state; do not gate the entire authenticated shell.
- **D-02:** Own bootstrap state in the authenticated app root with one shared bootstrap state source.
- **D-03:** Let unguarded screens render normally during bootstrap while guarded surfaces remain behind the gate.
- **D-04:** If local hydration fails for a guarded surface, release that surface into an explicit error state with retry support instead of showing product defaults.

### Sync Wait Policy
- **D-05:** Release guarded surfaces after local hydration only; do not wait for the initial online sync attempt.
- **D-06:** Keep first-sync status quiet by default and surface it only when sync fails or a screen explicitly needs sync state.
- **D-07:** If the first online sync fails after guarded surfaces release, keep local data visible and show a non-blocking sync error state.
- **D-08:** No Phase 3 guarded surface should require remote sync before it can open; local hydration is sufficient.

### Settings Fallback Behavior
- **D-09:** If no local preferences exist, initialize first-run product defaults as new local user data and then render them as a loaded state.
- **D-10:** If stored local preferences are invalid or corrupted, reset to fresh defaults, mark that recovery happened, and show a non-blocking warning.
- **D-11:** If local preferences load and remote sync later fails, keep settings editable and visible while showing non-blocking sync status.
- **D-12:** If a local settings write fails after load, revert that edit to the previously loaded values and show an inline save error.

### Loading Experience Shape
- **D-13:** Use a dedicated full-screen in-app Bubble/Sorbet bootstrap screen after splash handoff.
- **D-14:** Keep the bootstrap copy calm: one clear "preparing your session" message, with extra detail only for offline or error states.
- **D-15:** Make the bootstrap UI its own minimal-chrome composition rather than reusing the normal tab shell.
- **D-16:** For recoverable bootstrap hydration failures, show a primary Retry action on the bootstrap screen with compact error detail.

### the agent's Discretion
No user decisions were delegated to the agent in this discussion.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOT-01 | User waits on a dedicated bootstrap loading state before settings-visible screens render user-specific preferences for the current session. | Add root-owned bootstrap context plus guarded-surface gate before `SettingsScreen` renders preference controls. [VERIFIED: codebase grep] |
| BOOT-02 | User sees locally persisted settings and session data restored before the app falls back to server-backed values. | Use `loadLearningPreferences` directly for local hydration and move sync to a non-blocking background side effect. [VERIFIED: codebase grep] |
| BOOT-03 | User sees a Bubble/Sorbet loading experience that explains the app is preparing their session while bootstrap work is in progress. | Reuse `RouteScreen`, `SorbetBackground`, `BubbleStatus`, and current theme tokens for a full-screen in-app bootstrap surface. [VERIFIED: codebase grep] |
| SET-01 | User never sees placeholder default settings rendered as if they were their saved preferences while hydration is still in progress. | Remove `SettingsScreen`'s visible `initialPreferences` path from loaded UI and render from bootstrap-provided loaded preferences only. [VERIFIED: codebase grep] |
| SET-02 | User sees explicit loading, loaded, error, or offline-aware settings states instead of a layout jump when settings data changes source. | Model bootstrap/settings state as a discriminated union and map it to Bubble/Sorbet loading, warning, error, and sync status UI. [VERIFIED: codebase grep] |
| SYNC-01 | User gets a local/remote sync attempt during bootstrap whenever connectivity is available. | Trigger `syncLocalChanges.execute()` after local hydration and session restore; do not block local release on its result. [VERIFIED: codebase grep] |
| SYNC-02 | User can enter the app offline without bootstrap hanging because the remote sync step is treated as complete when no internet connection exists. | Preserve `syncLocalChanges` result `status: 'offline'` as a valid non-blocking outcome. [VERIFIED: codebase grep] |
| SYNC-03 | User sees locally available data even if remote sync fails, with the failure surfaced through explicit state rather than silent fallback defaults. | Keep loaded local preferences visible and surface failed sync via `BubbleStatus tone="error"` only where sync status is visible. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 03 should introduce a small authenticated-root bootstrap provider that hydrates local session data before guarded, user-specific surfaces render. [VERIFIED: `.planning/phases/03-bootstrap-hydration-and-sync/03-CONTEXT.md`] The immediate implementation target is preferences, because `SettingsScreen.tsx` currently initializes visible controls from hardcoded placeholder preferences and then replaces them after `loadLearningPreferences.execute()` resolves. [VERIFIED: codebase grep]

Do not gate the whole authenticated shell. [VERIFIED: `.planning/phases/03-bootstrap-hydration-and-sync/03-CONTEXT.md`] Keep auth restoration, font splash handoff, local bootstrap, and remote sync as separate steps: native splash remains only for font/assets readiness, the in-app bootstrap screen handles local preference hydration for guarded surfaces, and sync runs best-effort after local hydration. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/] [VERIFIED: codebase grep]

**Primary recommendation:** Add a `BootstrapProvider` under `AuthGate` and above `ThemedStack`, backed by a typed `BootstrapState`; hydrate preferences locally first, launch background sync without awaiting it for release, and make `SettingsScreen` render from bootstrap state instead of placeholder defaults. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Native splash handoff | Browser / Client | — | Expo Router root currently owns font loading and `SplashScreen.hideAsync()`, and this phase should not add native `ios/` or `android/` code. [VERIFIED: `apps/mobile/app/_layout.tsx`] |
| Local bootstrap state | Browser / Client | Application | React provider state belongs in presentation root, while hydration work calls application use cases. [VERIFIED: codebase grep] [CITED: https://react.dev/reference/react/useContext] |
| Preferences hydration | Application | Infrastructure | `createLoadLearningPreferences` owns first-run default creation; `AsyncStorageLocalSeriesStore` owns validated AsyncStorage reads. [VERIFIED: codebase grep] |
| Best-effort sync | Application | Infrastructure | `createSyncLocalChanges` coordinates queue, auth, network, local store, and remote store behind ports. [VERIFIED: `apps/mobile/src/application/useCases/syncLocalChanges.ts`] |
| Settings rendering | Browser / Client | Application | `SettingsScreen` should render typed UI states and forward updates, not own storage defaults or sync policy. [VERIFIED: `architecture/architecture_for_ai.md`] |
| Offline detection | Infrastructure | Application | `ExpoNetworkStatus` maps Expo Network state to the application `NetworkStatus` port. [VERIFIED: codebase grep] [CITED: https://docs.expo.dev/versions/latest/sdk/network/] |

## Project Constraints (from AGENTS.md)

- Preserve PRD, stack, architecture, and design artifact compliance; do not add features outside Phase 03. [VERIFIED: `AGENTS.md`]
- Use Expo Managed Workflow only; do not add or modify native `ios/` or `android/` projects. [VERIFIED: `AGENTS.md`]
- Keep local-first persistence and explicit offline states for server-dependent flows. [VERIFIED: `AGENTS.md`]
- Presentation components must not own persistence, Supabase calls, AI prompts, sync logic, or domain rules. [VERIFIED: `AGENTS.md`]
- Use TypeScript strict typing, avoid `any`, and validate external data at boundaries. [VERIFIED: `AGENTS.md`]
- Every explicit TypeScript annotation must have an English comment explaining the contract, responsibility, or value meaning. [VERIFIED: `AGENTS.md`]
- UI must preserve Bubble/Sorbet visual language, accessibility, responsive layout, light/dark behavior, and iOS-friendly interactions. [VERIFIED: `AGENTS.md`]
- Run documented lint, typecheck, build, and relevant tests before claiming implementation completion. [VERIFIED: `AGENTS.md`]

## Existing Patterns And Integration Points

| File | Existing Pattern | Phase 03 Guidance |
|------|------------------|-------------------|
| `apps/mobile/app/_layout.tsx` | Root owns fonts, native splash handoff, `ThemeProvider`, `AuthProvider`, `AuthGate`, and stack composition. [VERIFIED: codebase grep] | Insert `BootstrapProvider` inside authenticated state, after `AuthGate` has a session and before routes that need bootstrap context. [VERIFIED: codebase grep] |
| `AuthProvider.tsx` | Restores auth and currently triggers eager `syncLocalChanges.execute()` when `session` becomes active. [VERIFIED: codebase grep] | Move startup sync ownership into bootstrap orchestration or expose the result there; avoid duplicate first-sync attempts. [VERIFIED: codebase grep] |
| `localAppServices.ts` | Composition root wires `loadLearningPreferences` with `withPreSync`, making reads wait for a sync attempt. [VERIFIED: codebase grep] | Add a local-only bootstrap hydration path or separate wrapper so bootstrap can satisfy D-05 without waiting for sync. [VERIFIED: codebase grep] |
| `loadLearningPreferences.ts` | Reads local preferences or creates first-run defaults as dirty local data. [VERIFIED: codebase grep] | Reuse this behavior for D-09; extend result metadata only if needed to expose created/recovered status. [VERIFIED: codebase grep] |
| `AsyncStorageLocalSeriesStore.ts` | Validates local records and removes invalid preference records before returning `undefined`. [VERIFIED: codebase grep] | D-10 needs a visible recovery flag; planner should add a narrowly scoped way to detect preference corruption instead of silently losing that fact. [VERIFIED: codebase grep] |
| `syncLocalChanges.ts` | Returns `synced`, `offline`, `unauthenticated`, or `failed` and preserves queued local data on failure. [VERIFIED: codebase grep] | Treat `offline` and `unauthenticated` as non-blocking bootstrap outcomes; only `failed` should surface as a sync warning after local data is visible. [VERIFIED: codebase grep] |
| `SettingsScreen.tsx` | Renders controls immediately from `initialPreferences`, then updates after async load; already supports optimistic rollback on save failure. [VERIFIED: codebase grep] | Remove per-screen hydration; consume bootstrap preferences and preserve rollback behavior for D-12. [VERIFIED: codebase grep] |
| `BubbleStatus` | Supports `loading`, `offline`, `error`, `success`, and `disabled` tones. [VERIFIED: codebase grep] | Use this primitive for bootstrap and settings states; do not create a new status visual system. [VERIFIED: codebase grep] |

## Recommended Plan Decomposition And Wave Ordering

| Wave | Work | Dependencies | Verification Focus |
|------|------|--------------|--------------------|
| Wave 0 | Add focused tests for bootstrap state transitions and preference recovery metadata. [VERIFIED: existing tests] | None | `npm run test -- src/application/useCases/...` if granular command works, otherwise `npm run test`. [VERIFIED: `apps/mobile/package.json`] |
| Wave 1 | Split local preference hydration from pre-sync wrappers in `localAppServices`; expose a bootstrap-safe hydration service. [VERIFIED: codebase grep] | Wave 0 | Local hydration must not call remote store before releasing guarded surfaces. [VERIFIED: codebase grep] |
| Wave 2 | Add `BootstrapProvider`, `useBootstrapSession`, retry action, and background sync result capture near authenticated root. [VERIFIED: codebase grep] | Wave 1 | Initial local success releases guarded surfaces; sync failure is non-blocking. [VERIFIED: `.planning/.../03-CONTEXT.md`] |
| Wave 3 | Add `BootstrapScreen` and guarded-surface wrapper using Bubble/Sorbet primitives. [VERIFIED: codebase grep] | Wave 2 | Loading/offline/error copy is calm and minimal; no normal tab shell for full-screen bootstrap. [VERIFIED: `.planning/.../03-CONTEXT.md`] |
| Wave 4 | Refactor `SettingsScreen` to consume bootstrap preferences, remove placeholder defaults, preserve save rollback, and show recovery/sync warnings. [VERIFIED: codebase grep] | Wave 2 | No visible default flicker; corrupted preferences show loaded defaults plus warning. [VERIFIED: `.planning/.../03-CONTEXT.md`] |
| Wave 5 | Run full validation and fix strict TypeScript/comment issues. [VERIFIED: `AGENTS.md`] | Waves 1-4 | `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`. [VERIFIED: `apps/mobile/README.md`] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | package declares `19.2.3`; npm latest observed `19.2.7` modified 2026-07-06. [VERIFIED: npm registry] | Provider/context state and hooks. | Existing app stack; React Context is the documented mechanism for descendant components to read provider state. [CITED: https://react.dev/reference/react/useContext] |
| Expo Router | `~57.0.3` in `package.json`. [VERIFIED: codebase grep] | Root layout and route composition. | Existing route stack already composes providers and native stack screens. [VERIFIED: `apps/mobile/app/_layout.tsx`] |
| `expo-splash-screen` | `~57.0.2`; npm version `57.0.2` modified 2026-07-03. [VERIFIED: npm registry] | Native splash control until fonts/assets are ready. | Existing root already uses `preventAutoHideAsync()` and `hideAsync()`, matching official guidance to delay splash for readiness and hide as soon as possible. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/] |
| `expo-network` | `~57.0.0`; npm version `57.0.0` modified 2026-07-01. [VERIFIED: npm registry] | Connectivity check for sync. | Existing `ExpoNetworkStatus` uses it behind an application port. [VERIFIED: codebase grep] |
| `@react-native-async-storage/async-storage` | `2.2.0` in `package.json`. [VERIFIED: codebase grep] | Local-first preference/session data. | Stack artifact explicitly prefers AsyncStorage for MVP key-value local records. [VERIFIED: `stack/tech_stack_mvp.md`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | `^4.22.4` in `package.json`. [VERIFIED: codebase grep] | Node test runner execution for TypeScript tests. | Use existing `npm run test` script for application/use-case tests. [VERIFIED: `apps/mobile/package.json`] |
| `zod` | `^4.4.3` in `package.json`. [VERIFIED: codebase grep] | Boundary validation already used by infrastructure mappers. | Do not add for bootstrap unless new external payloads need schema validation. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context provider | Redux/Zustand | Redux is explicitly disallowed; Zustand is allowed by stack but unnecessary for one root bootstrap state. [VERIFIED: `stack/tech_stack_mvp.md`] |
| AsyncStorage local hydration | Supabase-first startup | Remote-first startup conflicts with local-first architecture and D-05. [VERIFIED: `architecture/architecture_for_ai.md`] [VERIFIED: `.planning/.../03-CONTEXT.md`] |
| Existing `BubbleStatus`/`RouteScreen` | New UI library | New dependencies are out of scope and would bypass established Bubble/Sorbet primitives. [VERIFIED: codebase grep] |

**Installation:**

```bash
# No new packages for Phase 03.
```

## Package Legitimacy Audit

No external packages should be installed in Phase 03. [VERIFIED: `.planning/PROJECT.md`] Existing package checks were run only because the phase relies on current dependencies.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `react` | npm | Existing dependency; latest publish observed 2026-06-01 for checked package metadata. [VERIFIED: npm registry] | 141M/week observed. [VERIFIED: npm registry] | `github.com/facebook/react` [VERIFIED: npm registry] | OK | Already installed; no new install |
| `expo-splash-screen` | npm | Existing dependency; latest publish observed 2026-07-03. [VERIFIED: npm registry] | 4.0M/week observed. [VERIFIED: npm registry] | `github.com/expo/expo` [VERIFIED: npm registry] | SUS by seam due to too-new publish date | Already installed; do not reinstall |
| `expo-network` | npm | Existing dependency; latest publish observed 2026-06-25. [VERIFIED: npm registry] | 675k/week observed. [VERIFIED: npm registry] | `github.com/expo/expo` [VERIFIED: npm registry] | SUS by seam due to too-new publish date | Already installed; do not reinstall |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** existing `expo-splash-screen`, existing `expo-network`; no planner install checkpoint is needed because Phase 03 should not install them. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
App launch
  -> Expo native splash waits for fonts
  -> _layout.tsx hides native splash
  -> AuthProvider restores Supabase session
  -> AuthGate chooses auth screen or authenticated tree
  -> BootstrapProvider starts local hydration
       -> load local preferences/session data
       -> if missing: create local defaults
       -> if corrupted: reset defaults + mark recovered
       -> release guarded surfaces
       -> start syncLocalChanges in background when session/network allow
            -> offline/unauthenticated: keep local UI
            -> synced: quiet success
            -> failed: non-blocking sync warning
  -> Unguarded screens render normally
  -> Guarded Settings reads BootstrapState
       -> loading/error/recovered/loaded UI
       -> update preferences locally
       -> background sync retry/manual sync
```

### Recommended Project Structure

```text
apps/mobile/src/presentation/app/bootstrap/
├── BootstrapProvider/
│   ├── BootstrapProvider.tsx   # shared authenticated bootstrap owner
│   └── index.ts
├── BootstrapScreen/
│   ├── BootstrapScreen.tsx     # minimal full-screen Bubble/Sorbet state UI
│   └── index.ts
├── GuardedBootstrapSurface/
│   ├── GuardedBootstrapSurface.tsx # reusable guard for Settings and future surfaces
│   └── index.ts
└── index.ts
```

### Pattern 1: Root-Owned Bootstrap Context

**What:** One provider owns a discriminated bootstrap state and retry/sync actions. [VERIFIED: codebase grep]  
**When to use:** Any authenticated screen needs local user-specific data before rendering controls. [VERIFIED: `.planning/.../03-CONTEXT.md`]

```typescript
// Source: React Context docs and existing AuthProvider pattern.
// BootstrapState is the single presentation contract for guarded startup data.
type BootstrapState =
  | { readonly status: 'hydrating' }
  | { readonly status: 'ready'; readonly preferences: LearningPreferences; readonly recovered: boolean; readonly syncResult?: SyncLocalChangesResult }
  | { readonly status: 'failed'; readonly message: string };
```

### Pattern 2: Local Hydration Before Background Sync

**What:** Await local hydration, release guarded surfaces, then launch sync without awaiting screen release. [VERIFIED: `.planning/.../03-CONTEXT.md`]  
**When to use:** Startup flows where local data is sufficient and remote sync is backup/cross-device reconciliation. [VERIFIED: `architecture/architecture_for_ai.md`]

```typescript
// Source: existing syncLocalChanges contract.
const loaded = await localAppServices.bootstrapLearningPreferences.execute();
setState({ status: 'ready', preferences: loaded.preferences, recovered: loaded.recovered });
void localAppServices.syncLocalChanges.execute().then(recordSyncResult).catch(recordSyncFailure);
```

### Pattern 3: Explicit Guarded Surface States

**What:** Guarded surfaces render loading/error/retry before user-specific controls; loaded state renders real preferences only. [VERIFIED: `.planning/.../03-CONTEXT.md`]  
**When to use:** `Settings` and future preference/session-data screens. [VERIFIED: codebase grep]

```typescript
// Source: existing BubbleStatus primitive.
if (bootstrap.status === 'failed') {
  return <BootstrapScreen mode="error" message={bootstrap.message} onRetry={bootstrap.retry} />;
}
```

### Anti-Patterns to Avoid

- **Blocking Settings on remote sync:** This violates D-05 and local-first startup. [VERIFIED: `.planning/.../03-CONTEXT.md`]
- **Rendering hardcoded defaults as loaded data:** This is the current flicker source and violates SET-01. [VERIFIED: codebase grep]
- **Duplicating sync triggers in `AuthProvider` and bootstrap:** Duplicate startup sync can produce noisy status and redundant remote calls. [VERIFIED: codebase grep]
- **Putting storage reads directly in `SettingsScreen`:** Presentation must stay thin and should not own persistence timing. [VERIFIED: `architecture/architecture_for_ai.md`]
- **Adding Redux/new dependencies:** Out of scope and contrary to project constraints. [VERIFIED: `stack/tech_stack_mvp.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Splash control | Custom native launch screen or timers | Existing `expo-splash-screen` integration | Expo docs provide splash lifecycle APIs and native code is forbidden. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/] [VERIFIED: `AGENTS.md`] |
| Shared screen bootstrap state | Global mutable singleton | React Context provider plus hook | Context is the documented React mechanism for descendant state access. [CITED: https://react.dev/reference/react/useContext] |
| Connectivity probing | Manual fetch-ping loop | Existing `NetworkStatus` port and `ExpoNetworkStatus` adapter | Expo Network exposes connection/reachability fields and app already wraps them. [CITED: https://docs.expo.dev/versions/latest/sdk/network/] [VERIFIED: codebase grep] |
| Preference defaults | Duplicate defaults in UI | `createLoadLearningPreferences` / domain constants | Use case already creates local defaults with sync metadata. [VERIFIED: codebase grep] |
| Sync/reconciliation | New sync engine | `createSyncLocalChanges` | Existing use case already handles dirty records, dependency order, offline, unauthenticated, failed, and snapshot reconciliation. [VERIFIED: codebase grep] |

**Key insight:** The phase is orchestration and state presentation, not a storage or sync rewrite. [VERIFIED: `.planning/ROADMAP.md`]

## Common Pitfalls

### Pitfall 1: Hidden Remote Wait Through `withPreSync`
**What goes wrong:** Bootstrap calls `localAppServices.loadLearningPreferences`, which currently awaits `sync.execute()` before local read. [VERIFIED: codebase grep]  
**Why it happens:** `withPreSync` was useful for clean reads but conflicts with D-05. [VERIFIED: codebase grep]  
**How to avoid:** Expose a bootstrap-specific local hydration service that calls `createLoadLearningPreferences` without pre-sync. [VERIFIED: codebase grep]  
**Warning signs:** Tests show remote store calls before settings gate release. [VERIFIED: codebase grep]

### Pitfall 2: Losing Corruption Recovery Metadata
**What goes wrong:** `AsyncStorageLocalSeriesStore.getPreferences()` removes invalid preferences and returns `undefined`, making first-run and recovered-corrupt states indistinguishable. [VERIFIED: codebase grep]  
**Why it happens:** The adapter currently optimizes for self-healing writes, not user-visible recovery. [VERIFIED: codebase grep]  
**How to avoid:** Add a narrow result flag or recovery path so D-10 can show a non-blocking warning after defaults are recreated. [VERIFIED: `.planning/.../03-CONTEXT.md`]  
**Warning signs:** Corrupted-storage test passes but UI cannot render a recovery warning. [VERIFIED: codebase grep]

### Pitfall 3: Replacing Auth Restore Screen With Bootstrap Screen
**What goes wrong:** Signed-out users or users still restoring auth see session-preparation copy instead of auth restoration/sign-in UI. [VERIFIED: codebase grep]  
**Why it happens:** Provider placement is too high in `_layout.tsx`. [VERIFIED: codebase grep]  
**How to avoid:** Keep `AuthGate` responsible for auth restoration and only bootstrap authenticated routes. [VERIFIED: `.planning/.../03-CONTEXT.md`]  
**Warning signs:** `BootstrapProvider` wraps `AuthGate` instead of being inside authenticated content. [VERIFIED: codebase grep]

### Pitfall 4: Sync Failure Becomes a Blocking Error
**What goes wrong:** Local settings disappear behind an error screen when `syncLocalChanges` returns `failed`. [VERIFIED: `.planning/.../03-CONTEXT.md`]  
**Why it happens:** Bootstrap conflates local hydration failure with remote sync failure. [VERIFIED: codebase grep]  
**How to avoid:** Store sync result separately from hydration status. [VERIFIED: codebase grep]  
**Warning signs:** `failed` sync status maps to `BootstrapState.status = 'failed'`. [VERIFIED: codebase grep]

## Code Examples

### Bootstrap State Contract

```typescript
// Source: existing AuthProvider style and React Context docs.
// BootstrapContextValue is the route-facing startup contract for user-specific local data.
type BootstrapContextValue = {
  // state describes whether guarded surfaces may render user-specific values.
  readonly state: BootstrapState;
  // retry repeats local hydration after a recoverable storage failure.
  readonly retry: () => Promise<void>;
  // syncNow starts a visible manual sync attempt without blocking local settings edits.
  readonly syncNow: () => Promise<void>;
};
```

### Settings Loaded State

```typescript
// Source: existing SettingsScreen rollback pattern.
if (bootstrap.state.status !== 'ready') {
  return <GuardedBootstrapSurface state={bootstrap.state} onRetry={bootstrap.retry} />;
}

return (
  <SettingsScreen
    bootstrapPreferences={bootstrap.state.preferences}
    syncResult={bootstrap.state.syncResult}
  />
);
```

### Sync Result Mapping

```typescript
// Source: syncLocalChanges.ts result contract.
function shouldShowSyncWarning(result: SyncLocalChangesResult | undefined): boolean {
  return result?.status === 'failed';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native splash held through arbitrary app startup | Hide native splash after required assets, then show app-owned loading UI for app work | Expo docs current as of 2026-07-06. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/] | Phase 03 should not keep the native splash up for preference sync. |
| Screen-local async defaults | Root-owned bootstrap state with guarded surfaces | Locked in D-01 through D-04 on 2026-07-06. [VERIFIED: `.planning/.../03-CONTEXT.md`] | Prevents per-screen flicker and inconsistent fallback behavior. |
| Sync-before-read wrappers for clean reads | Local hydration release plus background sync | Locked in D-05 through D-08 on 2026-07-06. [VERIFIED: `.planning/.../03-CONTEXT.md`] | Keeps offline startup fast and local-first. |

**Deprecated/outdated:**
- `SettingsScreen` visible `initialPreferences`: replace with guarded bootstrap state. [VERIFIED: codebase grep]
- Startup sync in `AuthProvider` as the only first-sync owner: consolidate with bootstrap status ownership. [VERIFIED: codebase grep]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Future guarded surfaces beyond Settings may be preference-driven but are not yet in Phase 03 scope unless current code reads hydrated user-specific session state. [ASSUMED] | Summary / Architecture | Planner may over- or under-guard adjacent screens; inspect each candidate screen before editing. |

## Open Questions (RESOLVED)

1. **RESOLVED: Preference corruption detection belongs behind an application-level bootstrap hydration use case, with a narrow adapter/store capability for recovery metadata.**
   - What we know: The adapter currently removes invalid preference records and returns `undefined`. [VERIFIED: codebase grep]
   - Resolution: Add a bootstrap-specific application use case that exposes created/recovered metadata to presentation while depending only on a small port. Extend the AsyncStorage-backed store with the narrow read needed to identify invalid preference recovery, and forward it through the queued local store. This keeps AsyncStorage details out of UI while satisfying D-10 and the Clean Architecture boundary. [VERIFIED: `architecture/architecture_for_ai.md`] [VERIFIED: `.planning/phases/03-bootstrap-hydration-and-sync/03-CONTEXT.md`]

2. **RESOLVED: Settings is the only Phase 03 route that must be guarded unless implementation-time inspection finds another current first frame rendering hydrated preference defaults.**
   - What we know: The context says Settings plus any other screen that reads hydrated user-specific session state. [VERIFIED: `.planning/.../03-CONTEXT.md`]
   - Resolution: Guard `Settings` at the tab route boundary for Phase 03. Do not gate Home/list screens, and do not gate `DailySessionScreen` or word-selection flows unless executor code inspection proves they currently render user-specific preference defaults before bootstrap readiness. If such a surface is discovered, add the same route/root guard pattern there rather than broadening the entire authenticated shell. [VERIFIED: `.planning/phases/03-bootstrap-hydration-and-sync/03-CONTEXT.md`]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts | Not probed in this research pass | — | Planner/executor should run `node --version` before implementation. [ASSUMED] |
| npm | package scripts | Available by successful `npm view` commands. [VERIFIED: npm registry] | Not captured | Use project `package-lock.json` and `npm` scripts. [VERIFIED: codebase grep] |
| Expo CLI via package scripts | `npm run build`, `npm run start` | Project dependency via `expo` package. [VERIFIED: codebase grep] | `~57.0.2` | Use `npx expo` only if package script fails, but prefer documented scripts. [VERIFIED: `apps/mobile/README.md`] |
| Supabase public env config | Auth/sync remote path | Optional; app has unavailable fallbacks when config creation fails. [VERIFIED: codebase grep] | — | Local-only mode must still hydrate preferences. [VERIFIED: codebase grep] |

**Missing dependencies with no fallback:**
- None identified for planning; implementation verification still requires installing npm dependencies if `node_modules` is absent. [ASSUMED]

**Missing dependencies with fallback:**
- Supabase config may be absent; current `localAppServices` falls back to unavailable gateways and unauthenticated/local-only behavior. [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node test runner through `tsx --test`; `tsx` declared `^4.22.4`. [VERIFIED: `apps/mobile/package.json`] |
| Config file | none specific; TypeScript config is `apps/mobile/tsconfig.json`. [VERIFIED: codebase grep] |
| Quick run command | `cd apps/mobile && npm run test` [VERIFIED: `apps/mobile/package.json`] |
| Full suite command | `cd apps/mobile && npm run lint && npm run test && npm run typecheck && npm run build` [VERIFIED: `apps/mobile/README.md`] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| BOOT-01 | Guarded Settings does not render controls before hydration ready. | component/unit | `npm run test` plus presentation test to add | ❌ Wave 0 |
| BOOT-02 | Local preferences load/create before remote sync release. | unit | `npm run test` with bootstrap use-case/provider tests | ❌ Wave 0 |
| BOOT-03 | Bootstrap screen renders Bubble/Sorbet loading copy. | component/unit or manual visual | `npm run test` if RN component test harness exists; otherwise manual Expo check | ❌ Wave 0 |
| SET-01 | No placeholder defaults render as loaded settings. | component/unit | `npm run test` with Settings state test | ❌ Wave 0 |
| SET-02 | Settings maps loading, loaded, error, offline/sync states explicitly. | component/unit | `npm run test` | ❌ Wave 0 |
| SYNC-01 | Bootstrap starts background sync when session is active. | unit | `npm run test` | ❌ Wave 0 |
| SYNC-02 | Offline sync result does not block app entry. | unit | Existing `syncLocalChanges.test.ts` plus bootstrap test | ✅ partial |
| SYNC-03 | Failed sync keeps local data visible and exposes warning. | unit | Existing sync test plus bootstrap/settings test | ✅ partial |

### Sampling Rate

- **Per task commit:** `cd apps/mobile && npm run test` for logic/state changes. [VERIFIED: `apps/mobile/package.json`]
- **Per wave merge:** `cd apps/mobile && npm run lint && npm run typecheck`. [VERIFIED: `apps/mobile/README.md`]
- **Phase gate:** `cd apps/mobile && npm run lint && npm run test && npm run typecheck && npm run build`. [VERIFIED: `apps/mobile/README.md`]

### Wave 0 Gaps

- [ ] `apps/mobile/src/presentation/app/bootstrap/BootstrapProvider/BootstrapProvider.test.ts` — covers BOOT-01, BOOT-02, SYNC-01, SYNC-02, SYNC-03. [ASSUMED]
- [ ] `apps/mobile/src/application/useCases/loadLearningPreferences.test.ts` or a new bootstrap hydration use-case test — covers D-09 and D-10. [ASSUMED]
- [ ] `apps/mobile/src/presentation/app/screens/SettingsScreen.test.ts` if the repo has/accepts RN component tests; otherwise document manual Expo verification for the visual no-flicker check. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Keep auth restore in `AuthProvider/AuthGate`; do not expose authenticated routes before session is restored. [VERIFIED: codebase grep] |
| V3 Session Management | yes | Use existing Supabase auth session provider and sign-out path; do not persist secrets in bootstrap state. [VERIFIED: codebase grep] |
| V4 Access Control | yes | Remote sync remains behind Supabase Auth/RLS through `RemoteSeriesStore`; local UI must not assume remote ownership without sync validation. [VERIFIED: `architecture/architecture_for_ai.md`] |
| V5 Input Validation | yes | Validate local preferences on read; corrupted local storage is untrusted and must recover safely. [VERIFIED: codebase grep] |
| V6 Cryptography | no direct new crypto | Do not hand-roll crypto or token handling; existing Supabase client owns auth tokens. [VERIFIED: `stack/tech_stack_mvp.md`] |

### Known Threat Patterns for Expo Local-First Bootstrap

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered AsyncStorage preferences | Tampering | Parse and validate preferences before use; reset invalid data to local defaults with warning. [VERIFIED: codebase grep] |
| Remote sync overwrites newer local data | Tampering | Preserve `resolveConflict` timestamp/operation ordering and do not block UI on remote state. [VERIFIED: codebase grep] |
| Raw SDK/storage errors exposed to users | Information Disclosure | Use safe generic UI messages and keep detailed raw errors out of presentation. [VERIFIED: `architecture/architecture_for_ai.md`] |
| Duplicate background sync causes noisy state/race | Denial of Service | Centralize first-sync ownership in bootstrap and keep manual sync separate. [VERIFIED: codebase grep] |
| Signed-out user reaches authenticated bootstrap data | Elevation of Privilege | Place bootstrap inside authenticated route branch after `AuthGate` confirms `session`. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` — Phase 03 goal, requirements, success criteria. [VERIFIED: codebase grep]
- `.planning/PROJECT.md` — v1.1 milestone scope and constraints. [VERIFIED: codebase grep]
- `.planning/REQUIREMENTS.md` — BOOT, SET, and SYNC requirement definitions. [VERIFIED: codebase grep]
- `.planning/phases/03-bootstrap-hydration-and-sync/03-CONTEXT.md` — D-01 through D-16 locked decisions. [VERIFIED: codebase grep]
- `AGENTS.md` — project constraints, artifact routing, verification rules, mandatory code rules. [VERIFIED: codebase grep]
- `concept/prd_concept_mvp.md` — AI-series-first product scope and out-of-scope mechanics. [VERIFIED: codebase grep]
- `stack/tech_stack_mvp.md` — Expo Managed Workflow, AsyncStorage preference, local-first sync, no native project changes. [VERIFIED: codebase grep]
- `architecture/architecture_for_ai.md` — Clean Architecture boundaries, local-first persistence, sync safety, trust boundaries. [VERIFIED: codebase grep]
- `apps/mobile/app/_layout.tsx`, `AuthProvider.tsx`, `localAppServices.ts`, `syncLocalChanges.ts`, `SettingsScreen.tsx` — concrete integration points. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- Expo SplashScreen docs — native splash should be manually hidden after required resources are ready; hide as soon as possible. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/]
- Expo Network docs — `isConnected` and `isInternetReachable` semantics. [CITED: https://docs.expo.dev/versions/latest/sdk/network/]
- React Context/useContext docs — provider state can be read by descendants through nearest provider. [CITED: https://react.dev/reference/react/useContext]

### Tertiary (LOW confidence)
- Assumptions about future guarded surfaces and exact test-file placement are marked in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions and current dependencies were read from `package.json` and npm registry; no new packages recommended. [VERIFIED: npm registry]
- Architecture: HIGH — based on locked phase decisions and current code integration points. [VERIFIED: codebase grep]
- Pitfalls: HIGH — derived from observed wrappers, provider placement, and settings placeholder state. [VERIFIED: codebase grep]
- External framework details: MEDIUM — checked against official docs through web search fallback because Context7 MCP was not exposed in this session. [CITED: https://docs.expo.dev/versions/latest/sdk/splash-screen/]

**Research date:** 2026-07-06
**Valid until:** 2026-08-05 for project-specific architecture; 2026-07-13 for fast-moving Expo/React package metadata.

## RESEARCH COMPLETE
