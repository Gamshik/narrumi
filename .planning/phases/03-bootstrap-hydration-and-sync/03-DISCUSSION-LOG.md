# Phase 03: bootstrap-hydration-and-sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 03-bootstrap-hydration-and-sync
**Areas discussed:** Loading Experience

---

## Loading Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the native system splash screen | Simpler, less code, completely hides the hydration gap. | |
| Show a dedicated Bubble/Sorbet loading screen | Branded, allows text like "Preparing your session...", feels like part of the app. | |
| Skeletons | User-proposed alternative: change the logic and use detailed skeletons for each block (cards, settings) instead of a loading screen. | ✓ |

**User's choice:** Детальные скелетоны: для каждого блока (карточки серий, переключатели в настройках), чтобы интерфейс не "прыгал" после загрузки.
**Notes:** The user rejected both a generic loading screen and a prolonged splash screen in favor of skeleton loading states matching the structure of the loaded blocks.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
