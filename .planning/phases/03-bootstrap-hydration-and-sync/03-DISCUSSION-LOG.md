# Phase 3: Bootstrap Hydration And Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 3-Bootstrap Hydration And Sync
**Areas discussed:** Bootstrap gate boundary, Sync wait policy, Settings fallback behavior, Loading experience shape

---

## Bootstrap gate boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Settings surfaces | Guard only settings-visible surfaces while hydration finishes. | |
| Whole app tree | Block the full authenticated app until bootstrap completes. | |
| Per-screen only | Let each screen own its own hydration gate. | |
| Custom | Guard settings plus any screen that reads hydrated user-specific session state. | ✓ |

**User's choice:** Guard `Settings` plus any screen that reads hydrated user-specific session state.
**Notes:** User then chose a root-owned shared bootstrap state source, normal rendering for unguarded screens, and explicit retryable error UI instead of fallback defaults on hydration failure.

---

## Sync wait policy

| Option | Description | Selected |
|--------|-------------|----------|
| Local hydration only | Release guarded screens after local hydration and let sync continue in the background. | ✓ |
| Wait for first sync | Hold guarded screens until the first sync attempt finishes. | |
| Deadline window | Wait briefly for sync, then release on timeout. | |

**User's choice:** Wait only for local hydration.
**Notes:** Background sync should stay quiet unless it fails or a screen needs it; sync failure after release should be non-blocking; no guarded Phase 3 surface should require remote-first release.

---

## Settings fallback behavior

| Option | Description | Selected |
|--------|-------------|----------|
| First-run defaults become local data | Initialize defaults as real local data when no preferences exist. | ✓ |
| First-run setup state | Show a setup or unconfigured state before preferences appear. | |
| Empty until manual save | Leave settings empty until the user stores values. | |

**User's choice:** Initialize first-run defaults as local data when no preferences exist.
**Notes:** Corrupted local data should reset with an explicit warning; remote sync failure should keep settings loaded with non-blocking status; local save failure should revert the failed edit and show inline error state.

---

## Loading experience shape

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated full-screen bootstrap screen | Show an in-app Bubble/Sorbet session-preparation screen after splash handoff. | ✓ |
| Extend native splash | Keep the splash visible until bootstrap completes. | |
| Inline guarded-screen status | Put compact loading surfaces inside each guarded screen. | |

**User's choice:** Use a dedicated full-screen bootstrap screen.
**Notes:** The copy should stay calm and minimal, the composition should be separate from the regular shell, and recoverable failures should expose a primary Retry action with compact error detail.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
