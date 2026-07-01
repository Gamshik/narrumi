# Roadmap: Context-English v1.0 Bubble/Sorbet UI Refresh

**Created:** 2026-07-02
**Milestone:** v1.0 Bubble/Sorbet UI refresh

## Overview

This milestone finishes the partially implemented Bubble/Sorbet design across the existing Context-English MVP. Work stays in the presentation layer unless a narrow application-facing state contract is required to render existing behavior correctly.

| Phase | Name | Goal | Requirements |
|-------|------|------|--------------|
| 1 | Bubble Foundation | Consolidate shared Sorbet tokens, surfaces, navigation, and tactile press behavior | VIS-01, VIS-02, VIS-03, VIS-04, MOT-01, MOT-02, QUAL-01 |
| 2 | Shell And Series Screens | Refresh authentication, home, series setup, series details, and settings screens | SCR-01, SCR-02, SCR-03, SCR-04, SCR-09, MOT-03 |
| 3 | Learning Screens And Verification | Refresh reader, Story Words/session, dictionary, translation sheet, and run full verification | SCR-05, SCR-06, SCR-07, SCR-08, QUAL-02, QUAL-03, QUAL-04 |

## Phase 1: Bubble Foundation

**Goal:** Make the Bubble/Sorbet style a reusable presentation system rather than scattered screen-specific styles.

**Requirements:** VIS-01, VIS-02, VIS-03, VIS-04, MOT-01, MOT-02, QUAL-01

**Scope:**
- Audit existing `JellyPressable`, `SorbetBackground`, `SorbetTabBar`, theme tokens, shared sheets, badges, and route wrappers.
- Add or refine shared bubble primitives only where they reduce real duplication across the milestone.
- Ensure tokens support light/dark colors, soft gradients, bubble radii, shadows, tab bar spacing, safe-area padding, and accessible text colors.
- Standardize minimal spring-like interaction behavior for pressable controls and selected states.

**Success criteria:**
1. Top-level screens can share the same Sorbet background and safe-area/tab-bar spacing without per-screen hacks.
2. Primary buttons, chips, tab items, and list rows have a reusable spring-like press response.
3. Bubble surfaces, pills, badges, and soft cards can be imported through public `index.ts` exports.
4. Light and dark theme tokens avoid hardcoded one-theme UI colors in the shared presentation primitives.
5. No application, infrastructure, persistence, AI, or sync logic is moved into shared UI components.

## Phase 2: Shell And Series Screens

**Goal:** Bring the non-reader app shell and series-management flows into visual alignment with the Bubble/Sorbet mockups.

**Requirements:** SCR-01, SCR-02, SCR-03, SCR-04, SCR-09, MOT-03

**Scope:**
- Refresh authentication to match the soft centered auth panel, pill mode switch, rounded inputs, and status badge from `auth.png`.
- Refresh home to match the large hero series bubble, compact series row, primary create button, connected badge, and floating tab bar from `home.png`.
- Refresh new series/setup to match segmented level/genre/tone controls, rounded input fields, Generate button, character list, and setup actions from `newseries.png`.
- Refresh series details to match the header, continue/prep cards, and episode history rows from `series.png`.
- Refresh settings to match account/sync, appearance, grammar control, and series defaults sections from `settings.png`.

**Success criteria:**
1. The listed screens visually match the corresponding `design/bubble` references in layout intent, rounded forms, spacing, and color language.
2. All existing user actions remain available and keep their previous application behavior.
3. Offline, loading, disabled, empty, and error states remain visible and styled consistently.
4. Press, selected, loading, and disabled feedback uses the shared motion/style primitives from Phase 1.
5. The floating tab bar does not overlap scrollable content on small mobile viewports.

## Phase 3: Learning Screens And Verification

**Goal:** Refresh the core learning experience screens and verify the milestone against product, architecture, and design constraints.

**Requirements:** SCR-05, SCR-06, SCR-07, SCR-08, QUAL-02, QUAL-03, QUAL-04

**Scope:**
- Refresh the episode reader to match `reader.png`, including dialogue bubbles, active reading context, story choice card, and reader navigation.
- Refresh Story Words/session setup to match `session.png`, including word bubbles, shuffle/random actions, episode generation readiness, and online/offline state.
- Refresh dictionary to match `dict.png`, including search, level chips, filters, word rows, and status badges.
- Refresh translation/word detail bottom sheet to match `translate.png`, including dimmed reader background, word metadata, examples, and save action.
- Run and fix issues from documented lint, typecheck, build, and relevant tests.

**Success criteria:**
1. Reader, Story Words/session, dictionary, and translation sheet visually align with the Bubble/Sorbet references without changing the AI-series product flow.
2. Inline translation and audio/reader states remain accessible and readable.
3. Server-only actions still show explicit offline states and do not fake AI behavior locally.
4. Presentation code remains separated from domain, application, infrastructure, AI, persistence, and sync rules.
5. `npm run lint`, `npm run typecheck`, `npm run build`, and relevant tests pass from `apps/mobile`, or any blocker is documented exactly.

## Verification Plan

Run from `apps/mobile` after implementation changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For Supabase Edge Function changes, run Deno tests when Deno is available:

```bash
deno test supabase/functions/**/*.test.ts
```

This milestone is presentation-focused, so Supabase Edge Function verification is only required if implementation touches `supabase/functions`.
