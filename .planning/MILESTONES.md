# Milestones

## v1.1 App Bootstrap Loading (Shipped: 2026-07-06)

**Delivered:** Bootstrap now hydrates local preferences before settings-visible screens render, runs sync in the same startup window without blocking offline entry, and replaces settings flicker with explicit Bubble/Sorbet loading and warning states.

**Phases completed:** 1 phase, 4 plans

**Key accomplishments:**

- Added a local-only bootstrap hydration use case and typed storage contract for reading saved preferences with corruption recovery.
- Introduced `BootstrapProvider`, background sync orchestration, and guarded authenticated routing so local-ready UI no longer waits on remote sync completion.
- Added dedicated Bubble/Sorbet bootstrap surfaces for loading, failure, and settings skeleton states instead of rendering placeholder defaults.
- Refactored Settings to consume bootstrap-managed state directly, keep optimistic rollback behavior, and surface sync, offline, recovery, and save warnings explicitly.
- Closed the remaining bootstrap verification gaps and passed the recorded UAT scenarios for local hydration, offline entry, sync timing, and recovery UX.

**Stats:**

- 61 files changed, 2742 insertions, 217 deletions
- 1 phase, 4 plans
- Timeline: 2026-07-06 to 2026-07-07
- Git range: `docs(planning): define v1.1 bootstrap loading milestone` -> `docs(gsd): record phase 3 completion`

**Known verification overrides:** 9 deferred debug-session artifacts acknowledged at closeout; see `STATE.md` Deferred Items.

**What's next:** Define the next milestone around `LEARN-01` and any surviving UI polish debt.

---

## v1.0 Bubble/Sorbet UI refresh (Shipped: 2026-07-05)

**Phases completed:** 2 phases, 14 plans, 41 tasks

**Key accomplishments:**

- Shared Sorbet theme tokens and safe-area-aware floating tab layout helpers for the mobile presentation layer.
- Reusable Bubble/Sorbet surface, button, pill, and sheet primitives backed by active theme tokens and JellyPressable motion.
- Safe-area-aware Sorbet tab spacing, Bubble primitive consumer wiring, and public shared exports for later mobile screen refresh phases.
- Stronger shared press feedback, a reusable Bubble/Sorbet Settings toggle, and content-sized dictionary detail sheets.
- Addressed Phase 1 UAT gaps with stronger tactile animations, a native-driver BubbleToggle transition, and a content-sized mode for dictionary sheets.
- Added BubbleStatus primitive and restyled the auth screen to match Sorbet design system
- Refactored Home screen into Bubble create-first hero and mini-card layout
- Restyled create and edit series setup modals to use Bubble/Sorbet components and tokens.
- Restyled Series Details screen with prioritized continue/prep card, memory surface, and soft episode history cards.
- Restyled Settings screen to be learning-first and use compact BubbleStatus rows
- Stable auth keyboard behavior with a shorter Home create hero and compact saved-series mini-cards.
- Compact setup modals, lighter character rows, and shorter Series Details with visible memory removed.
- Settings now hides Default Genre, places Appearance above Account & Sync, and keeps compact sync controls with all automated gates passing.
- Closed the remaining automated Phase 02 gap-plan work for compact Home setup, stable setup modal actions, and Series Details action hierarchy.

---
