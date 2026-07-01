# Context-English

## What This Is

Context-English is an Expo React Native MVP for learning English through personal AI series. The learner creates or continues a series, chooses lightweight Story Words, reads and listens to short AI-generated episodes, influences the episode through choices or short replies, and keeps progress locally first with sync when available.

## Core Value

The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## Current Milestone: v1.0 Bubble/Sorbet UI refresh

**Goal:** Finish the partially implemented Bubble/Sorbet visual refresh across the existing MVP screens and add minimal tactile animations that match the style.

**Target features:**
- Apply the `design/bubble` visual language to the main mobile shell: soft Sorbet backgrounds, large rounded bubble surfaces, pill controls, floating capsule navigation, compact badges, and playful but readable typography.
- Bring the existing core screens into visual alignment with the provided mockups: authentication, home, new series, series details, reader, story setup/session, dictionary, tap translation, and settings.
- Use shared presentation primitives for bubble surfaces, tab navigation, pressable controls, and sheets so the style stays consistent without moving product logic into UI components.
- Add minimal spring-like button, chip, choice, tab, and sheet animations without changing the AI-series product flow or adding out-of-scope learning mechanics.

## Requirements

### Validated

- ✓ Expo Managed Workflow is the approved frontend runtime.
- ✓ The MVP product loop is AI-series first: series -> Story Words -> episode -> interaction -> feedback -> continuation.
- ✓ Story Words are lightweight episode inputs, not a flashcard-first or scheduled SRS review system.
- ✓ Local-first persistence and explicit offline states are required for user-facing flows that depend on server capabilities.
- ✓ The codebase already contains initial Sorbet presentation primitives, including `JellyPressable`, `SorbetBackground`, and `SorbetTabBar`.

### Active

- [ ] Complete Bubble/Sorbet theme foundation and shared interactive primitives.
- [ ] Align shell, authentication, series management, and settings screens with the `design/bubble` mockups.
- [ ] Align reader, Story Words/session, dictionary, and translation surfaces with the `design/bubble` mockups.
- [ ] Verify animation, accessibility, dark/light theme, safe-area, offline-state, lint, typecheck, build, and relevant test behavior after implementation.

### Out of Scope

- Traditional flashcard-first learning as the primary app flow — explicitly excluded by the PRD.
- Scheduled SRS queues, due reviews, review debt, or streak-pressure mechanics — explicitly excluded by the PRD.
- New AI product capabilities, image/video generation, voice conversation, multiplayer, or public sharing — outside this design refresh milestone.
- Native `ios/` or `android/` project changes — forbidden by the Expo Managed Workflow constraint.
- Direct client calls to OpenRouter or other LLM providers — AI calls must stay behind Supabase Edge Functions.

## Context

- Canonical product scope lives in `concept/prd_concept_mvp.md`.
- Canonical technical constraints live in `stack/tech_stack_mvp.md`.
- AI-agent architecture boundaries live in `architecture/architecture_for_ai.md`.
- Design guidance lives in `design/design_system.html`, `design/design_system_guidelines.md`, and the Bubble/Sorbet screenshots under `design/bubble`.
- Mobile app commands are declared in `apps/mobile/package.json` and documented in `apps/mobile/README.md`.
- The current UI refresh is partially present in the presentation layer, so implementation should consolidate and finish the design system rather than creating parallel styling paths.

## Constraints

- **Scope:** Preserve the AI-series MVP loop and do not add backlog product features during the design refresh.
- **Architecture:** Presentation components may render UI state and forward intent, but must not own persistence, Supabase, AI, vocabulary ranking, sync, or domain rules.
- **Styling:** Use React Native styles and existing Expo-compatible UI dependencies; do not introduce NativeWind, Redux, or native projects unless a later approved scope change requires it.
- **Offline:** Server-only actions such as episode generation, AI continuation, correction, and grammar-style explanation must keep explicit offline states.
- **Verification:** Run the documented lint, typecheck, build, and relevant test commands before claiming implementation completion.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `design/bubble` as the current screen-level visual target | The user identified these screenshots as the new design and the app already contains partial Sorbet primitives | Pending |
| Treat the refresh as a presentation milestone only | The PRD, stack, and architecture artifacts already define product behavior; the request is visual and interaction polish | Pending |
| Keep animation minimal and tactile | The design guidelines call for spring-like micro-interactions, while the user requested minimal button-style animations | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-02 after starting milestone v1.0*
