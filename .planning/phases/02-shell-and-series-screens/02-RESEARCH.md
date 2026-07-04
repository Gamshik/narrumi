# Phase 02: Shell And Series Screens - Research

**Researched:** 2026-07-05
**Domain:** Expo React Native presentation refresh for auth, app shell, series setup/details, settings, and Bubble/Sorbet state styling [VERIFIED: .planning/ROADMAP.md]
**Confidence:** HIGH for project-local implementation guidance, MEDIUM for external framework-doc guidance because Context7/ctx7 were unavailable [VERIFIED: codebase grep]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCR-01 | User can sign in or create an account through an authentication screen aligned with `design/bubble/auth.png`. [VERIFIED: .planning/REQUIREMENTS.md] | Restyle `AuthenticationScreen` around the existing auth actions, centered panel, pill mode switch, rounded inputs, submit state, and compact sync/private badge. [VERIFIED: codebase grep + design/bubble/auth.png] |
| SCR-02 | User can browse and continue series from a home screen aligned with `design/bubble/home.png`. [VERIFIED: .planning/REQUIREMENTS.md] | Use create-first hero, saved series mini-cards, one hero create action, connected/status badge, and keep tab-bar clearance from Phase 1 layout helper. [VERIFIED: 02-CONTEXT.md + design/bubble/home.png + apps/mobile/src/presentation/theme/layout.ts] |
| SCR-03 | User can create or edit a not-yet-started series through a setup screen aligned with `design/bubble/newseries.png`. [VERIFIED: .planning/REQUIREMENTS.md] | Keep native modal behavior while restyling segmented controls, fields, Generate action, validation messages, and character cards. [VERIFIED: 02-CONTEXT.md + HomeScreen.tsx + SeriesDetailsScreen.tsx + design/bubble/newseries.png] |
| SCR-04 | User can view an existing series, continue latest episode, prepare next episode, and inspect history through details aligned with `design/bubble/series.png`. [VERIFIED: .planning/REQUIREMENTS.md] | Preserve `onContinueEpisode`, `onPrepareEpisode`, `onOpenEpisode`, `onReadSeries`, setup lock, memory rendering, and delete flow while changing surface hierarchy. [VERIFIED: SeriesDetailsScreen.tsx + design/bubble/series.png] |
| SCR-09 | User can manage account, sync, appearance, level, and defaults through settings aligned with `design/bubble/settings.png`. [VERIFIED: .planning/REQUIREMENTS.md] | Reorder settings to learning-first, compact account/sync, appearance row, and defaults rows without changing persistence or sync use cases. [VERIFIED: 02-CONTEXT.md + SettingsScreen.tsx + design/bubble/settings.png] |
| MOT-03 | User sees success, warning, disabled, loading, and offline states in Bubble/Sorbet style without losing accessibility. [VERIFIED: .planning/REQUIREMENTS.md] | Standardize status badges/rows using existing semantic tokens and accessibility state forwarding from Phase 1 primitives. [VERIFIED: tokens.ts + BubbleButton.tsx + BubblePill.tsx] |
</phase_requirements>

## Summary

Phase 2 is a presentation-layer refresh over existing auth, series-management, and settings behavior. [VERIFIED: .planning/ROADMAP.md] The planner should keep all application-facing calls in place (`useAuthSession`, `localAppServices`, route callbacks, and existing validation helpers) and focus work on screen layout, shared Bubble/Sorbet components, status styling, and safe scroll spacing. [VERIFIED: AuthenticationScreen.tsx + HomeScreen.tsx + SeriesDetailsScreen.tsx + SettingsScreen.tsx]

The highest-risk implementation areas are the large create/edit setup forms, the home empty-state/create-first inversion, and MOT-03 state styling. [VERIFIED: 02-CONTEXT.md + codebase grep] The safest plan is to first introduce small presentation-only helpers for repeated Phase 2 display patterns, then restyle each screen while preserving existing callbacks and validation functions in their current screen/use-case ownership. [VERIFIED: architecture/architecture_for_ai.md + Phase 1 pattern map]

**Primary recommendation:** Use existing Phase 1 primitives (`RouteScreen`, `SorbetBackground`, `SorbetTabBar`, `JellyPressable`, `BubbleButton`, `BubblePill`, `BubbleSurface`, `BubbleSheet`, `BubbleToggle`) as the Phase 2 visual base; do not add dependencies or move behavior out of application/use-case boundaries. [VERIFIED: .planning/STATE.md + apps/mobile/src/presentation/app/shared/index.ts]

## Project Constraints (from AGENTS.md)

- Build strictly from repository artifacts; do not add features, dependencies, architectural layers, or abstractions unless required by the task. [VERIFIED: AGENTS.md]
- Use PRD for product scope, stack for technical decisions, architecture artifacts for boundaries, and design system/Bubble screenshots for UI. [VERIFIED: AGENTS.md]
- Treat HTML artifacts as references, not production app code. [VERIFIED: AGENTS.md]
- Do not implement backlog items or reintroduce flashcard-first learning, scheduled SRS queues, review debt, or streak-pressure mechanics. [VERIFIED: AGENTS.md + concept/prd_concept_mvp.md]
- Use Expo Managed Workflow only; do not modify or add native `ios/` or `android/` code. [VERIFIED: AGENTS.md + stack/tech_stack_mvp.md]
- Keep presentation components thin; no persistence, SDK calls, sync logic, AI prompts, or domain rules inside UI components. [VERIFIED: AGENTS.md + architecture/architecture_for_ai.md]
- Keep server-only actions visibly offline/disabled when offline; do not fake AI generation locally. [VERIFIED: AGENTS.md + stack/tech_stack_mvp.md]
- Use strict TypeScript, avoid `any`, validate external data at boundaries, and keep explicit annotations/comments for public contracts. [VERIFIED: AGENTS.md + apps/mobile/tsconfig.json]
- UI components must be decomposed into focused folders with `index.ts` exports when reusable. [VERIFIED: AGENTS.md + shared component folders]
- Before implementation completion, run available lint, typecheck, build, and relevant tests from the documented commands. [VERIFIED: AGENTS.md + apps/mobile/README.md + apps/mobile/package.json]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Authentication screen visual refresh | Browser / Client | API / Backend | React Native renders the auth form and state; Supabase Auth behavior stays behind `useAuthSession`. [VERIFIED: AuthenticationScreen.tsx + architecture/architecture_for_ai.md] |
| Home create-first shell | Browser / Client | Application | UI reorders hero/list/status while `localAppServices.listSeries/createSeries/deleteSeries/generateSeriesSetupDraft` keep behavior. [VERIFIED: HomeScreen.tsx] |
| Series setup create/edit modal | Browser / Client | Application | Modal fields are presentation state; validation and setup draft request mapping must keep existing product rules. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx] |
| Series details hierarchy | Browser / Client | Application | Screen decides visual priority; route callbacks and local use cases own continue/prep/read/delete behavior. [VERIFIED: SeriesDetailsScreen.tsx] |
| Settings learning preferences/account/sync | Browser / Client | Application / API | UI renders persisted preferences and manual sync controls; storage/sync stays in `localAppServices` and Supabase boundaries. [VERIFIED: SettingsScreen.tsx + architecture/architecture_for_ai.md] |
| Offline/loading/error/disabled status styling | Browser / Client | Application | Components display typed state already surfaced by screen/application code; they must not infer network or sync rules themselves. [VERIFIED: stack/tech_stack_mvp.md + codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Expo | `~57.0.2`; registry latest `57.0.2`, modified 2026-07-03. [VERIFIED: apps/mobile/package.json + npm registry] | Managed React Native runtime and export/build pipeline. [VERIFIED: stack/tech_stack_mvp.md] | Required by project stack and Windows/iOS Expo Go workflow. [VERIFIED: stack/tech_stack_mvp.md] |
| React Native | `0.86.0`; registry latest `0.86.0`, modified 2026-07-04. [VERIFIED: apps/mobile/package.json + npm registry] | Mobile UI rendering. [VERIFIED: apps/mobile/package.json] | Canonical frontend technology for the MVP. [VERIFIED: stack/tech_stack_mvp.md] |
| TypeScript | `~6.0.3`. [VERIFIED: apps/mobile/package.json] | Strict typing for presentation contracts. [VERIFIED: apps/mobile/tsconfig.json] | Project requires strict TypeScript and path aliases. [VERIFIED: AGENTS.md + tsconfig.json] |
| Expo Router | `~57.0.3`; registry latest `57.0.3`, modified 2026-07-03. [VERIFIED: apps/mobile/package.json + npm registry] | App routing and custom floating tab bar integration. [VERIFIED: apps/mobile/package.json + SorbetTabBar.tsx] | Existing app shell uses Expo Router tab props. [VERIFIED: SorbetTabBar.tsx] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-linear-gradient` | `~57.0.0`; registry latest `57.0.0`, modified 2026-07-01. [VERIFIED: apps/mobile/package.json + npm registry] | Sorbet gradient backgrounds and active tab puck. [VERIFIED: SorbetBackground.tsx + SorbetTabBar.tsx] | Continue using for Bubble/Sorbet visual surfaces. [VERIFIED: codebase grep] |
| `expo-blur` | `~57.0.0`; registry latest `57.0.0`, modified 2026-07-01. [VERIFIED: apps/mobile/package.json + npm registry] | Floating tab bar blur. [VERIFIED: SorbetTabBar.tsx] | Use existing tab bar; do not introduce alternate blur dependencies. [VERIFIED: codebase grep] |
| `@react-native-segmented-control/segmented-control` | `2.5.7`; registry latest `2.5.7`, modified 2024-12-11. [VERIFIED: apps/mobile/package.json + npm registry] | Native CEFR segmented setting. [VERIFIED: SettingsScreen.tsx] | Keep for settings CEFR unless replacing with existing `BubblePill` chips gives better Bubble/Sorbet parity without behavior loss. [VERIFIED: SettingsScreen.tsx + design/bubble/settings.png] |
| `@supabase/supabase-js` | `^2.107.0`; registry latest `2.110.0`, modified 2026-06-30. [VERIFIED: apps/mobile/package.json + npm registry] | Existing auth/sync infrastructure. [VERIFIED: stack/tech_stack_mvp.md] | Do not touch for this presentation phase unless preserving existing auth/session state. [VERIFIED: 02-CONTEXT.md] |
| `zod` | `^4.4.3`; registry latest `4.4.3`, modified 2026-05-04. [VERIFIED: apps/mobile/package.json + npm registry] | Boundary validation in existing app/AI paths. [VERIFIED: apps/mobile/package.json] | Not needed for new presentation code unless an existing typed boundary is touched. [VERIFIED: architecture/architecture_for_ai.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing React Native StyleSheet/token system | NativeWind or a new styling library | Do not use; stack says standard React Native StyleSheet and no new dependency unless explicitly requested. [VERIFIED: stack/tech_stack_mvp.md] |
| Existing `JellyPressable` and Bubble primitives | New animation/gesture package | Do not use; Phase 1 already established the shared motion base and no new dependency is required. [VERIFIED: .planning/STATE.md + shared/JellyPressable] |
| Existing native `Modal` for setup | New bottom-sheet package | Do not use; locked decision D-05 keeps current modal behavior. [VERIFIED: 02-CONTEXT.md] |

**Installation:**
```bash
# No new packages for Phase 2.
cd apps/mobile
npm install
```

## Package Legitimacy Audit

Phase 2 should not install external packages. [VERIFIED: .planning/ROADMAP.md + package.json inspection] The following check was run only to audit the already-present stack: `node .codex/gsd-core/bin/gsd-tools.cjs query package-legitimacy check --ecosystem npm expo react-native expo-router @react-native-segmented-control/segmented-control @supabase/supabase-js zod`. [VERIFIED: package-legitimacy seam]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `expo` | npm | Published 2026-07-03 for current version. [VERIFIED: package-legitimacy seam] | 6,425,304/wk. [VERIFIED: package-legitimacy seam] | `github.com/expo/expo`. [VERIFIED: package-legitimacy seam] | SUS: too-new. [VERIFIED: package-legitimacy seam] | Existing locked project stack; no new install decision in Phase 2. |
| `react-native` | npm | Published 2026-06-09 for current version. [VERIFIED: package-legitimacy seam] | 9,796,190/wk. [VERIFIED: package-legitimacy seam] | `github.com/facebook/react-native`. [VERIFIED: package-legitimacy seam] | SUS: too-new. [VERIFIED: package-legitimacy seam] | Existing locked project stack; no new install decision in Phase 2. |
| `expo-router` | npm | Published 2026-07-03 for current version. [VERIFIED: package-legitimacy seam] | 3,945,022/wk. [VERIFIED: package-legitimacy seam] | `github.com/expo/expo`. [VERIFIED: package-legitimacy seam] | SUS: too-new. [VERIFIED: package-legitimacy seam] | Existing locked project stack; no new install decision in Phase 2. |
| `@react-native-segmented-control/segmented-control` | npm | Published 2024-12-11 for current version. [VERIFIED: package-legitimacy seam] | 139,038/wk. [VERIFIED: package-legitimacy seam] | `github.com/react-native-segmented-control/segmented-control`. [VERIFIED: package-legitimacy seam] | OK. [VERIFIED: package-legitimacy seam] | Existing dependency approved for continued use. |
| `@supabase/supabase-js` | npm | Published 2026-06-30 for latest version. [VERIFIED: package-legitimacy seam] | 21,496,896/wk. [VERIFIED: package-legitimacy seam] | `github.com/supabase/supabase-js`. [VERIFIED: package-legitimacy seam] | SUS: too-new. [VERIFIED: package-legitimacy seam] | Existing dependency; Phase 2 should not change auth/sync package usage. |
| `zod` | npm | Published 2026-05-04 for current version. [VERIFIED: package-legitimacy seam] | 213,650,167/wk. [VERIFIED: package-legitimacy seam] | `github.com/colinhacks/zod`. [VERIFIED: package-legitimacy seam] | OK. [VERIFIED: package-legitimacy seam] | Existing dependency; no new Phase 2 install. |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** existing `expo`, `react-native`, `expo-router`, and `@supabase/supabase-js` versions were flagged only as too-new by the seam; do not add a new install checkpoint unless Phase 2 changes package versions. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
User opens Phase 2 screen
  -> React Native route shell (`RouteScreen` + `SorbetBackground` + tab metrics)
  -> Screen-owned presentation state (loading/error/modal/form/selected/disabled)
  -> Existing callbacks/use cases (`useAuthSession`, `localAppServices`, route navigation)
  -> Application/domain/infrastructure behavior remains unchanged
  -> Screen renders Bubble/Sorbet status rows, cards, pills, buttons, and stable scroll padding
```

### Recommended Project Structure

```text
apps/mobile/src/presentation/app/
├── shared/                         # Existing Phase 1 Bubble/Sorbet primitives
├── screens/
│   ├── HomeScreen.tsx              # Home plus create-series modal state
│   ├── SeriesDetailsScreen.tsx     # Details plus setup edit modal state
│   └── SettingsScreen.tsx          # Learning preferences, account/sync, appearance
└── auth/AuthenticationScreen/       # Auth screen and Supabase session actions
```

If extracting reusable Phase 2 presentation helpers, place them under the nearest screen folder unless they are genuinely shared across multiple screens; shared reusable UI must use a folder plus `index.ts` public export. [VERIFIED: AGENTS.md + shared component folders]

### Pattern 1: Presentation-Only Bubble Component Use

**What:** Shared components accept theme/display props and callbacks, not app services or domain rules. [VERIFIED: BubbleButton.tsx + BubbleSurface.tsx]
**When to use:** Buttons, badges, chips, cards, settings rows, and status rows that repeat across Phase 2 screens. [VERIFIED: Phase 1 shared exports]
**Example:**
```typescript
// Source: apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx
<BubbleButton
  accessibilityState={{ disabled: isBusy }}
  colors={colors}
  disabled={isBusy}
  onPress={onSubmit}
  variant="primary"
>
  <Text>{isBusy ? 'Please wait...' : 'Generate'}</Text>
</BubbleButton>
```

### Pattern 2: Keep Behavior in Screen/Application Wiring

**What:** Screens may hold form state and call existing use cases; reusable UI should only render values and forward callbacks. [VERIFIED: architecture/architecture_for_ai.md + HomeScreen.tsx]
**When to use:** Create-series modal, setup edit modal, sync now, sign out, and settings preference changes. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx + SettingsScreen.tsx]
**Example:**
```typescript
// Source: apps/mobile/src/presentation/app/screens/HomeScreen.tsx
await localAppServices.createSeries.execute({
  title: form.title,
  genre: form.genre,
  cefrLevel: form.cefrLevel,
  tone: form.tone,
  premise: form.premise,
  participationMode: form.participationMode,
  mainCharacters: characterProfileNames(form.characterProfiles),
  characterProfiles: form.characterProfiles,
});
```

### Pattern 3: Floating Tab Clearance

**What:** Route scroll content should keep bottom padding derived from the shared floating tab helper. [VERIFIED: apps/mobile/src/presentation/theme/layout.ts]
**When to use:** Home, settings, and any scrollable Phase 2 route with final actions or cards. [VERIFIED: .planning/REQUIREMENTS.md VIS-04]
**Example:**
```typescript
// Source: apps/mobile/src/presentation/theme/layout.ts
const contentPaddingBottom: number =
  bottomOffset + tabBarLayout.height + tabBarLayout.contentGap;
```

### Anti-Patterns to Avoid

- **Creating a parallel design system:** Use Phase 1 tokens and Bubble primitives; parallel local styles increase drift. [VERIFIED: .planning/STATE.md]
- **Moving validation into visual helpers:** Setup validation belongs in existing screen/helper functions and application/domain rules. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx + architecture/architecture_for_ai.md]
- **Adding duplicate create buttons on home:** Locked decision D-03 says the create action lives in the hero only. [VERIFIED: 02-CONTEXT.md]
- **Rendering empty series memory placeholders:** Locked decision D-10 hides memory when empty. [VERIFIED: 02-CONTEXT.md]
- **Replacing offline/server-only behavior with optimistic fake AI:** Online-only AI actions must remain unavailable/offline-visible when offline. [VERIFIED: stack/tech_stack_mvp.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tactile press feedback | Per-screen scale/opacity logic | `JellyPressable`, `BubbleButton`, `BubblePill`, `BubbleToggle` | Phase 1 centralized motion constants and accessibility forwarding. [VERIFIED: .planning/STATE.md + shared components] |
| Floating tab spacing | Screen-specific bottom magic numbers | `floatingTabBarMetrics` / `getFloatingTabBarContentPadding` | Prevents tab overlap on small mobile viewports. [VERIFIED: layout.ts + REQUIREMENTS.md] |
| AI setup generation behavior | New client-side generator or prompt path | Existing `localAppServices.generateSeriesSetupDraft.execute` | Stack requires LLM calls behind Supabase Edge Functions; Phase 2 is presentation-only. [VERIFIED: stack/tech_stack_mvp.md + HomeScreen.tsx] |
| Auth/session behavior | Direct Supabase calls in UI | Existing `useAuthSession` | Architecture forbids SDK calls directly inside React components. [VERIFIED: AuthenticationScreen.tsx + architecture/architecture_for_ai.md] |
| Sync conflict/status rules | UI-owned sync model | Existing `syncLocalChanges` result and status formatter | Sync behavior belongs in application/infrastructure; UI only renders status. [VERIFIED: SettingsScreen.tsx + architecture/architecture_for_ai.md] |

**Key insight:** The hard part is preserving existing user behavior while changing the hierarchy and state surfaces; custom replacements for auth, sync, AI generation, or navigation would expand scope and violate the Phase 2 boundary. [VERIFIED: 02-CONTEXT.md + architecture/architecture_for_ai.md]

## Common Pitfalls

### Pitfall 1: Visual Refresh Changes Product Flow
**What goes wrong:** Home or series details become latest-series-first or add duplicate create/setup actions. [VERIFIED: 02-CONTEXT.md]
**Why it happens:** The old screen shape and new mockups pull in different hierarchy directions. [VERIFIED: codebase grep + design/bubble/home.png]
**How to avoid:** Treat D-01 through D-04 and D-09 through D-12 as hard planning constraints. [VERIFIED: 02-CONTEXT.md]
**Warning signs:** Header has a duplicate `+`, empty state is a separate card, setup editing becomes a large primary action after first episode. [VERIFIED: 02-CONTEXT.md]

### Pitfall 2: Setup Modal Refactor Breaks Locked Domain Rules
**What goes wrong:** Generate changes list-selected fields, Character mode role requirements disappear, or read-only-after-first-episode styling becomes editable. [VERIFIED: concept/prd_concept_mvp.md + SeriesDetailsScreen.tsx]
**Why it happens:** Create and edit setup forms are similar and may be over-extracted into a visual helper that owns rules. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx]
**How to avoid:** Extract only presentational field/card groups; keep `validateSeriesForm`, `validateSetupForm`, `buildSetupDraftRequest`, and `canEditSetup` behavior intact. [VERIFIED: codebase grep]
**Warning signs:** Shared setup component imports `localAppServices`, domain validation moves into JSX-only helper, or disabled fields no longer pass `editable={false}`. [VERIFIED: architecture/architecture_for_ai.md]

### Pitfall 3: Status Badges Lose Accessibility
**What goes wrong:** Loading/offline/disabled/success/warning states become color-only pills without disabled state, labels, or stable placement. [VERIFIED: REQUIREMENTS.md MOT-03]
**Why it happens:** Bubble/Sorbet mockups emphasize visual badges, but app states still need accessible text and Pressable state. [VERIFIED: design/bubble/*.png + AGENTS.md]
**How to avoid:** Use visible text, semantic colors, `accessibilityState`, and stable inline rows near the affected action. [VERIFIED: BubbleButton.tsx + BubblePill.tsx]
**Warning signs:** Disabled button only changes opacity, sync/offline status appears far from the action, or error text is removed in favor of an icon. [VERIFIED: AGENTS.md]

### Pitfall 4: Floating Tab Overlaps Final Content
**What goes wrong:** Last home/settings rows or bottom modal actions sit behind the capsule tab bar. [VERIFIED: REQUIREMENTS.md VIS-04]
**Why it happens:** Scroll content uses static padding or omits tab-safe bottom spacing. [VERIFIED: MobileApp.styles.ts + layout.ts]
**How to avoid:** Keep `screenContent` tab-safe padding and manually sample short/long screens after visual changes. [VERIFIED: Phase 1 validation]
**Warning signs:** Final settings row cannot scroll above the tab bar on small iPhone viewport. [VERIFIED: design_system_guidelines.md]

## Code Examples

### Shared Surface and Status Badge Pattern
```typescript
// Source: apps/mobile/src/presentation/app/shared/BubbleSurface/BubbleSurface.tsx
<BubbleSurface colors={colors} tone="warning" variant="card">
  <Text>Available when online.</Text>
</BubbleSurface>
```

### Accessibility State Forwarding
```typescript
// Source: apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx
const resolvedAccessibilityState: AccessibilityState = {
  ...accessibilityState,
  disabled,
  selected,
};
```

### Safe Tab Padding Helper
```typescript
// Source: apps/mobile/src/presentation/theme/layout.ts
export function getFloatingTabBarContentPadding(
  inset: FloatingTabBarInsetInput,
): number {
  return floatingTabBarMetrics(inset).contentPaddingBottom;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scattered screen-specific Bubble/Sorbet styling | Shared Phase 1 primitives exported through `app/shared/index.ts` | Phase 1 completed 2026-07-04. [VERIFIED: .planning/STATE.md] | Phase 2 should reuse shared primitives instead of duplicating visual chrome. |
| Native/full-width or route-local tab treatment | `SorbetTabBar` floating capsule plus pure safe-area metrics | Phase 1 completed 2026-07-04. [VERIFIED: .planning/STATE.md + SorbetTabBar.tsx] | Phase 2 must preserve scroll clearance on home/settings. |
| Account/sync-first settings order | Learning-first settings order | Locked in Phase 2 discussion on 2026-07-05. [VERIFIED: 02-CONTEXT.md] | Planner must reorder settings without changing persistence/sync behavior. |
| Dense saved-series rows | Soft mini-cards with clear continuation action | Locked in Phase 2 discussion on 2026-07-05. [VERIFIED: 02-CONTEXT.md] | Home implementation should change card layout, not series data model. |

**Deprecated/outdated:**
- Flashcard-first or due-review UI is out of scope and conflicts with the current PRD. [VERIFIED: concept/prd_concept_mvp.md + .planning/REQUIREMENTS.md]
- New AI generation capabilities are out of scope for this UI phase. [VERIFIED: .planning/ROADMAP.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | External React Native/Expo docs would support the local patterns for Pressable, modals, safe areas, and custom tab bars. [ASSUMED] | Sources / Architecture Patterns | Low; local code and artifacts already define the accepted implementation, but planner should avoid citing unverified external docs as authority. |

## Open Questions

1. **Should Phase 2 add screenshot/device-level visual verification?**
   - What we know: Current repo has no React Native component test renderer or screenshot test dependency. [VERIFIED: package.json + test file scan]
   - What's unclear: Whether the user expects manual visual comparison against `design/bubble/*.png` in addition to lint/typecheck/test/build. [ASSUMED]
   - Recommendation: Planner should include manual visual UAT checkpoints for auth, home, setup modal, series details, settings, light/dark theme, and small viewport tab clearance. [VERIFIED: Phase 1 validation pattern]

2. **Should setup form UI be extracted into shared screen-local components?**
   - What we know: Create and edit setup forms duplicate many visual patterns but differ in save behavior and editability. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx]
   - What's unclear: Exact extraction granularity that best preserves line-of-sight in the large files. [ASSUMED]
   - Recommendation: Extract display-only field/card groups only if it reduces duplication without importing services or owning validation. [VERIFIED: AGENTS.md + architecture/architecture_for_ai.md]

3. **Context7 framework docs unavailable**
   - What we know: `research-plan` selected Context7, but no Context7 MCP tools and no `ctx7` CLI were available. [VERIFIED: research-plan seam + shell check]
   - What's unclear: Whether the orchestrator expects cached Context7 digests for this phase. [ASSUMED]
   - Recommendation: Treat local artifact/code research as authoritative for Phase 2; use external docs only if a later planner/executor has Context7 access. [VERIFIED: local artifacts]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts and Expo tooling | yes [VERIFIED: shell] | `v24.14.0` [VERIFIED: shell] | None needed |
| npm | install/scripts | yes [VERIFIED: shell] | `11.9.0` [VERIFIED: shell] | None needed |
| git | diff/commit workflow | yes [VERIFIED: shell] | `2.55.0.windows.2` [VERIFIED: shell] | None needed |
| `apps/mobile/node_modules` | local validation commands | yes [VERIFIED: shell] | present [VERIFIED: shell] | Run `npm install` from `apps/mobile` if missing |
| Context7 / `ctx7` | external framework docs fetch | no [VERIFIED: shell] | — | Use repository artifacts and official local contracts; mark framework-doc claims assumed |

**Missing dependencies with no fallback:** none for Phase 2 planning. [VERIFIED: shell]

**Missing dependencies with fallback:** Context7/`ctx7`; fallback is local canonical artifacts and code inspection. [VERIFIED: shell + local artifacts]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node `tsx --test` via `npm run test`. [VERIFIED: apps/mobile/package.json] |
| Config file | `apps/mobile/package.json`, `apps/mobile/eslint.config.js`, `apps/mobile/tsconfig.json`. [VERIFIED: file inspection] |
| Quick run command | `cd apps/mobile; npm run lint && npm run typecheck` [VERIFIED: apps/mobile/package.json] |
| Full suite command | `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build` [VERIFIED: apps/mobile/package.json + README.md] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SCR-01 | Auth screen preserves sign-in/sign-up actions and styled disabled/loading/error/success state. [VERIFIED: REQUIREMENTS.md + AuthenticationScreen.tsx] | typecheck + manual visual | `npm run lint && npm run typecheck` | Existing screen yes; no component test. |
| SCR-02 | Home keeps list/create/open/delete behavior while matching create-first Bubble layout. [VERIFIED: REQUIREMENTS.md + HomeScreen.tsx] | typecheck + manual visual | `npm run lint && npm run typecheck` | Existing screen yes; no component test. |
| SCR-03 | Setup modal keeps validation, AI setup draft, character cards, and save behavior. [VERIFIED: REQUIREMENTS.md + HomeScreen.tsx + SeriesDetailsScreen.tsx] | existing use-case tests + typecheck + manual visual | `npm run test -- src/application/useCases/generateSeriesSetupDraft.test.ts src/application/useCases/createSeries.test.ts src/application/useCases/updateSeriesSetup.test.ts` | Tests exist. |
| SCR-04 | Series details keeps continue/prep/read/delete/history behavior. [VERIFIED: REQUIREMENTS.md + SeriesDetailsScreen.tsx] | typecheck + manual visual | `npm run lint && npm run typecheck` | Existing screen yes; no component test. |
| SCR-09 | Settings keeps preference persistence, theme toggle, sync, and sign-out behavior. [VERIFIED: REQUIREMENTS.md + SettingsScreen.tsx] | existing sync tests + typecheck + manual visual | `npm run test -- src/application/useCases/syncLocalChanges.test.ts src/application/sync/conflictResolver.test.ts src/application/sync/syncQueuePolicy.test.ts` | Tests exist. |
| MOT-03 | Success/warning/disabled/loading/offline states use accessible Bubble/Sorbet status surfaces. [VERIFIED: REQUIREMENTS.md] | theme token tests + manual visual | `npm run test -- src/presentation/theme/tokens.test.ts src/presentation/theme/layout.test.ts` | Tests exist for tokens/layout; no status component test. |

### Sampling Rate

- **Per task commit:** `cd apps/mobile; npm run lint && npm run typecheck` for code changes. [VERIFIED: package.json]
- **Per wave merge:** `cd apps/mobile; npm run lint && npm run typecheck && npm run test` for multi-screen changes. [VERIFIED: package.json]
- **Phase gate:** `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build` plus manual visual comparison against Phase 2 screenshots. [VERIFIED: README.md + ROADMAP.md]

### Wave 0 Gaps

- No React Native screenshot/component test harness exists. [VERIFIED: package.json + test file scan] Do not add one unless explicitly approved; use manual visual UAT for screenshot parity. [ASSUMED]
- Existing use-case tests cover setup/auth/sync behavior; screen visual changes can rely on lint/typecheck plus manual UAT unless extracting pure helpers that warrant unit tests. [VERIFIED: test file scan]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Preserve `useAuthSession` and Supabase Auth boundary; do not call Supabase directly from UI. [VERIFIED: AuthenticationScreen.tsx + architecture/architecture_for_ai.md] |
| V3 Session Management | yes | Session state remains behind `AuthProvider`/auth hooks. [VERIFIED: AuthenticationScreen.tsx + codebase grep] |
| V4 Access Control | yes | Cloud records remain protected by Supabase RLS; Phase 2 must not change RLS or remote store behavior. [VERIFIED: stack/tech_stack_mvp.md] |
| V5 Input Validation | yes | Keep setup form validation and typed use-case boundaries; user input remains untrusted. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx + architecture/architecture_for_ai.md] |
| V6 Cryptography | no direct Phase 2 change | Do not introduce secrets or crypto; keep LLM/API secrets out of mobile app. [VERIFIED: AGENTS.md + stack/tech_stack_mvp.md] |

### Known Threat Patterns for Expo React Native Presentation Refresh

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-side LLM/provider call introduced during Generate restyle | Information Disclosure / Elevation of Privilege | Keep Generate wired to existing application use case and Edge Function boundary. [VERIFIED: stack/tech_stack_mvp.md + HomeScreen.tsx] |
| Raw sync/auth errors exposed in new status badges | Information Disclosure | Render safe existing messages; do not display raw SDK payloads beyond current safe strings. [VERIFIED: architecture/architecture_for_ai.md + SettingsScreen.tsx] |
| Disabled server-only action still pressable | Tampering / Reliability | Set `disabled`, `accessibilityState.disabled`, and visible offline/loading text near the action. [VERIFIED: BubbleButton.tsx + AGENTS.md] |
| Setup form loses validation when restyled | Tampering | Preserve `validateSeriesForm`, `validateSetupForm`, and use-case input contracts. [VERIFIED: HomeScreen.tsx + SeriesDetailsScreen.tsx] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project rules, verification requirements, architecture/design constraints.
- `.planning/ROADMAP.md` - Phase 2 goal, scope, success criteria, and verification commands.
- `.planning/REQUIREMENTS.md` - SCR-01, SCR-02, SCR-03, SCR-04, SCR-09, MOT-03.
- `.planning/phases/02-shell-and-series-screens/02-CONTEXT.md` - locked Phase 2 decisions.
- `concept/prd_concept_mvp.md` and `concept/concept.html` - AI-series product scope and out-of-scope learning mechanics.
- `stack/tech_stack_mvp.md` - Expo Managed Workflow, local-first, Supabase, AI boundary, offline rules.
- `architecture/architecture_for_ai.md` and `architecture/architecture_for_developer.html` - Clean Architecture, ports, trust boundaries.
- `design/design_system.html`, `design/design_system_guidelines.md`, and `design/bubble/*.png` - visual targets and interaction rules.
- `apps/mobile/package.json`, `apps/mobile/README.md`, `apps/mobile/tsconfig.json`, `apps/mobile/eslint.config.js` - stack and commands.
- `apps/mobile/src/presentation/app/shared/*`, `HomeScreen.tsx`, `SeriesDetailsScreen.tsx`, `SettingsScreen.tsx`, `AuthenticationScreen.tsx`, `tokens.ts`, `layout.ts` - existing implementation patterns.

### Secondary (MEDIUM confidence)

- GSD `research-plan` seam selected Context7 for framework docs, but provider tools were unavailable. [VERIFIED: shell]
- npm registry checks verified current package versions and modified timestamps. [VERIFIED: npm registry]
- Package legitimacy seam audited existing stack packages; several were flagged `SUS` only for very recent publication dates. [VERIFIED: package-legitimacy seam]

### Tertiary (LOW confidence)

- External framework-doc-specific best practices are treated as assumed because Context7/`ctx7` could not be queried in this session. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for existing project dependencies and versions; no new packages recommended. [VERIFIED: package.json + npm registry]
- Architecture: HIGH for project-local boundaries and affected code paths. [VERIFIED: architecture artifacts + codebase grep]
- Pitfalls: HIGH for locked product/architecture risks; MEDIUM for framework-specific docs due unavailable Context7. [VERIFIED: 02-CONTEXT.md + local code]

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 for project-local guidance; 2026-07-12 for external package freshness because Expo/React Native packages are moving quickly. [VERIFIED: npm registry]
