# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 - App Bootstrap Loading

**Shipped:** 2026-07-06
**Phases:** 1 | **Plans:** 4 | **Sessions:** 4

### What Was Built
- Local-only bootstrap hydration for persisted preferences with corruption recovery.
- Authenticated bootstrap orchestration that keeps local-ready UI independent from background sync completion.
- Bubble/Sorbet bootstrap, skeleton, warning, and failure states for settings-visible surfaces.

### What Worked
- Splitting the milestone into four focused plans kept application, bootstrap orchestration, UI, and settings refactor concerns isolated.
- Pure tests around bootstrap state and settings mapping caught regressions before the final Expo build pass.

### What Was Inefficient
- Milestone closeout was blocked by leftover debug-session artifacts that should have been triaged earlier.
- Human-visible startup timing still required a separate UAT loop because provider ordering was not covered by integration tests.

### Patterns Established
- Read local bootstrap preferences through a dedicated application contract before invoking any remote sync path.
- Guard settings-visible routes with purpose-built skeleton and failure surfaces instead of placeholder defaults.

### Key Lessons
1. Startup UX fixes need explicit runtime verification even when pure application tests are comprehensive.
2. Debug-session hygiene matters because milestone closeout quality drops quickly when old artifacts accumulate.

### Cost Observations
- Model mix: not captured in repository artifacts.
- Sessions: 4 recorded execution waves plus verification and closeout.
- Notable: the technical change stayed tightly scoped, but closeout overhead increased because artifact cleanup lagged behind implementation.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.1 | 4 | 1 | Added bootstrap-first startup orchestration and explicit closeout debt tracking. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.1 | `npm run test` passed with 60 tests | Not tracked | 0 |

### Top Lessons (Verified Across Milestones)

1. Small vertical plans make UI and application changes easier to verify and archive.
2. Planning artifacts need active cleanup or they become the main milestone-close blocker.
