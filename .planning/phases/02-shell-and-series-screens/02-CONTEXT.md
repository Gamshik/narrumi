# Phase 2: Shell And Series Screens - Context

**Gathered:** 2026-07-05T02:30:29.6580959+03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Refresh the non-reader app shell and series-management flows into the Bubble/Sorbet visual language: authentication, home, new-series/setup, series details, settings, and the visible loading, disabled, error, offline, and sync states attached to those flows. This phase is presentation-focused and must preserve the existing AI-series product behavior, local-first persistence, Supabase auth/sync boundaries, and Expo Managed Workflow constraints.

</domain>

<decisions>
## Implementation Decisions

### Home Series Priority

- **D-01:** The home hero should lean toward creating a new series as the first invitation, while still keeping saved series visible below.
- **D-02:** Saved series should appear as soft Bubble/Sorbet mini-cards with enough breathing room and a clear continuation action, not dense list rows.
- **D-03:** The primary create action should live in the hero only. The header should carry identity/status rather than a duplicate `+` action.
- **D-04:** When no saved series exist, the empty state should be folded into the create-first hero instead of adding a separate empty card or sample placeholder.

### Series Setup Shape

- **D-05:** Creating and editing a series should keep the current modal behavior and be restyled heavily to match `design/bubble/newseries.png`.
- **D-06:** Setup field order should follow the mockup visual order where possible while preserving locked product constraints, validation, role behavior, and existing AI-generation requirements.
- **D-07:** Character setup should use full editable Bubble/Sorbet character cards with visible name and description fields.
- **D-08:** Setup should keep one clear primary `Generate` action for the existing AI setup assist. Do not add new AI behavior or split generation into new capabilities.

### Series Details Hierarchy

- **D-09:** Series details should make the continue/prep-next-episode card the strongest visual priority immediately below the header.
- **D-10:** Series memory should be hidden when empty and shown as a richer Bubble/Sorbet card only when memory content exists.
- **D-11:** Setup editing should stay as a small header action, with clear disabled/read-only styling after the first episode.
- **D-12:** Episode history should use soft episode cards with title, summary, status, and compact read/delete actions.

### Settings Grouping And Status States

- **D-13:** Settings should lead with learning controls rather than account/sync or appearance.
- **D-14:** CEFR level, default genre, and Story Word goal should be combined into one prominent `Learning Preferences` Bubble/Sorbet section.
- **D-15:** Account and sync should appear as a compact status row with manual sync still available, not as the leading settings card.
- **D-16:** Offline, loading, disabled, and error states across Phase 2 screens should use inline Bubble/Sorbet status badges or rows near the affected action, keeping layouts stable.

### the agent's Discretion

The user did not delegate any selected decision to the agent. Downstream agents may choose exact component decomposition, spacing implementation, and token usage as long as the decisions above, Phase 1 primitives, and canonical artifacts are respected.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Scope

- `.planning/ROADMAP.md` — Defines Phase 2 goal, scope, requirements, and verification plan.
- `.planning/REQUIREMENTS.md` — Defines SCR-01, SCR-02, SCR-03, SCR-04, SCR-09, and MOT-03.
- `.planning/PROJECT.md` — Defines the milestone core value and presentation-only constraint.
- `.planning/STATE.md` — Carries Phase 1 decisions that Phase 2 must preserve.

### Product, Architecture, Stack, And Design Contracts

- `concept/prd_concept_mvp.md` — Canonical AI-series MVP scope and out-of-scope learning mechanics.
- `concept/concept.html` — Supporting product reference for the intended AI-series learning experience.
- `stack/tech_stack_mvp.md` — Expo Managed Workflow, Supabase, local-first, and server-boundary constraints.
- `architecture/architecture_for_ai.md` — Clean Architecture boundaries, trust boundaries, offline-first sync, and error policy.
- `architecture/architecture_for_developer.html` — Supporting visual explanation of architecture boundaries.
- `design/design_system.html` — Canonical visual and interaction reference for Bubble/Sorbet-compatible controls and states.
- `design/design_system_guidelines.md` — Mandatory free-form UI rules for layout and visual decisions.

### Bubble/Sorbet Screen References

- `design/bubble/auth.png` — Target auth panel, mode switch, rounded inputs, and status badge.
- `design/bubble/home.png` — Target home hero, series card language, connected badge, create action, and floating tab bar context.
- `design/bubble/newseries.png` — Target setup segmented controls, rounded fields, Generate button, character list, and setup actions.
- `design/bubble/series.png` — Target series detail header, continue/prep cards, and episode history rows.
- `design/bubble/settings.png` — Target settings grouping for learning controls, account/sync, appearance, grammar, and defaults.

### Existing Code Touchpoints

- `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx` — Existing auth UI and Supabase-session actions.
- `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` — Existing home and create-series modal logic.
- `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` — Existing series detail, setup edit modal, memory, and episode history logic.
- `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` — Existing settings, sync, theme, grammar, and defaults logic.
- `apps/mobile/src/presentation/app/shared/index.ts` — Public shared Bubble/Sorbet primitive exports from Phase 1.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `JellyPressable` — Shared tactile press base that Phase 1 chose for pressable Bubble controls.
- `BubbleButton`, `BubblePill`, `BubbleSurface`, `BubbleSheet`, `BubbleToggle` — Shared presentation primitives for buttons, chips, surfaces, sheets, and settings toggles.
- `SorbetBackground`, `RouteScreen`, `SorbetTabBar` — Shared shell and floating tab presentation primitives that preserve safe-area/tab-bar spacing.
- `useAppStyles` and theme tokens — Current source for light/dark colors, Bubble/Sorbet radii, motion, and shadows.

### Established Patterns

- Presentation screens own UI state and forward user intent to `localAppServices`; they must not absorb persistence, AI, sync, or domain rules.
- Screen components and shared UI use explicit TypeScript contracts with English comments.
- Reusable component folders expose public exports through `index.ts`; cross-feature imports should use `@presentation/*` or shared barrels where appropriate.
- Server-only actions such as setup generation and sync already surface loading/error/offline-ish states through UI state; Phase 2 should restyle those states without changing app behavior.

### Integration Points

- Auth refresh connects through `AuthenticationScreen` and `AuthGate` while preserving `useAuthSession` behavior.
- Home refresh connects through `HomeScreen`, including local series loading, create-series modal state, AI setup draft generation, validation, save, and delete.
- Setup refresh likely touches modal subcomponents in `HomeScreen` and `SeriesDetailsScreen`; duplication can be reduced only if it stays presentation-only and within Phase 2 scope.
- Series details refresh connects through `SeriesDetailsScreen`, preserving focus reload, continue/prep navigation, setup edit locking after first episode, memory rendering, and episode deletion.
- Settings refresh connects through `SettingsScreen`, preserving preferences persistence, theme provider state, sync operation, and sign-out behavior.

</code_context>

<specifics>
## Specific Ideas

- Home should be create-first, not latest-series-first, even though the project loop is continuation-oriented.
- Saved home series should feel like soft mini-cards rather than compact rows.
- The home header should not duplicate the hero create action.
- Setup should keep the modal behavior but use the visual order and controls from `newseries.png` where possible.
- Character setup should be visually explicit with full editable cards.
- Series memory should not render an empty placeholder card.
- Settings should be learning-first, with account/sync reduced to a compact but visible operational row.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Shell And Series Screens*
*Context gathered: 2026-07-05T02:30:29.6580959+03:00*
