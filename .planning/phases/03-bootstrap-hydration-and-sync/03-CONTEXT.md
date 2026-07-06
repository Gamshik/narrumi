# Phase 3: Bootstrap Hydration And Sync - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a root-owned bootstrap flow that restores local user state before guarded user-data screens render, starts best-effort remote sync in the background when online, and replaces visible default-setting flicker with explicit Bubble/Sorbet loading, error, offline, and recovered-state presentation.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Milestone Scope
- `.planning/ROADMAP.md` — defines Phase 3 goal, requirements coverage, and success criteria.
- `.planning/PROJECT.md` — defines the v1.1 milestone goal, current constraints, and locked product decisions around startup loading.
- `.planning/REQUIREMENTS.md` — defines `BOOT-01` through `SYNC-03`, which Phase 3 must satisfy.
- `concept/prd_concept_mvp.md` — canonical MVP product scope; preserves the AI-series-first product loop and explicit out-of-scope boundaries.

### Architecture And Technical Constraints
- `stack/tech_stack_mvp.md` — canonical stack and runtime constraints, including Expo Managed Workflow, local-first persistence, and offline behavior.
- `architecture/architecture_for_ai.md` — canonical implementation boundaries, trust boundaries, local-first sync rules, and dependency direction.

### Design Guidance
- `design/design_system.html` — visual and interaction reference for Bubble/Sorbet loading, settings, status, and stateful UI behavior.
- `design/design_system_guidelines.md` — required rules for screen composition, loading states, and free-form UI decisions.

### Existing Code And Integration Points
- `apps/mobile/app/_layout.tsx` — authenticated root composition and the best insertion point for shared bootstrap ownership after splash handoff.
- `apps/mobile/src/presentation/app/auth/AuthProvider/AuthProvider.tsx` — current auth restore flow and current eager post-auth sync trigger.
- `apps/mobile/src/presentation/app/services/localAppServices.ts` — composition root for load, update, and sync use cases.
- `apps/mobile/src/application/useCases/syncLocalChanges.ts` — current sync contract, including `offline`, `unauthenticated`, `synced`, and `failed` outcomes.
- `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` — current settings hydration, optimistic update, sync diagnostics, and rollback behavior.
- `apps/mobile/README.md` — canonical mobile verification commands.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BubbleStatus` in `apps/mobile/src/presentation/app/shared/BubbleStatus` already supports `loading`, `offline`, `error`, `success`, and `disabled` tones for explicit state UI.
- `SettingsScreen.tsx` already contains optimistic update rollback and visible sync diagnostics that can be aligned with the new bootstrap states instead of replaced.
- `localAppServices.ts` already centralizes `loadLearningPreferences`, `updateLearningPreferences`, and `syncLocalChanges`, so bootstrap orchestration can reuse existing use-case boundaries.

### Established Patterns
- The authenticated app is composed from the root layout and providers in `apps/mobile/app/_layout.tsx`; cross-screen startup state belongs there rather than inside individual screens.
- `AuthProvider.tsx` already separates auth restoration from route rendering and triggers sync as a side effect when a session becomes active; Phase 3 should reshape that startup sequence rather than invent a separate sync path.
- `syncLocalChanges.ts` is already local-first and treats offline and unauthenticated states as valid non-crashing outcomes; bootstrap should preserve that contract.
- `loadLearningPreferences` and current settings behavior already allow first-run default creation and rollback on save failure; Phase 3 should make those states explicit instead of rendering them too early.

### Integration Points
- Add shared bootstrap ownership near `AuthProvider` and authenticated route composition so guarded screens can read one canonical bootstrap state.
- Adjust guarded screens such as `SettingsScreen.tsx` and any preference-driven session surfaces to read bootstrap state before rendering hydrated user data.
- Coordinate initial sync through `localAppServices.syncLocalChanges` without blocking guarded-screen release on network latency.

</code_context>

<specifics>
## Specific Ideas

- The bootstrap gate should cover `Settings` plus any other screen that reads hydrated user-specific session state, especially preference-driven surfaces.
- The loading screen should feel like a dedicated Bubble/Sorbet session-preparation surface rather than a reused tab screen or an extended native splash.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Bootstrap Hydration And Sync*
*Context gathered: 2026-07-06*
