# Context-English

## What This Is

Context-English is an Expo React Native MVP for learning English through personal AI series. The learner creates or continues a series, chooses lightweight Story Words, reads and listens to short AI-generated episodes, influences the episode through choices or short replies, and keeps progress locally first with sync when available.

## Core Value

The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## Current Milestone: v1.1 App Bootstrap Loading

**Goal:** Remove the settings flicker by bootstrapping user data before settings render and by showing a clear loading experience while local and remote state reconcile.

**Target features:**
- Load persisted user preferences and other locally available user data during app entry before showing screens that currently fall back to visible default settings.
- Run the local/remote sync pass during the same bootstrap window when the device is online, and treat sync as complete immediately when the device is offline.
- Show a Bubble/Sorbet loading state or animation while bootstrap work is in progress so the user understands the app is preparing their session.
- Replace implicit default-setting rendering with explicit loading, loaded, error, and offline-aware UI states wherever user-specific settings are displayed.

## Requirements

### Validated

- ✓ Expo Managed Workflow is the approved frontend runtime.
- ✓ The MVP product loop is AI-series first: series -> Story Words -> episode -> interaction -> feedback -> continuation.
- ✓ Story Words are lightweight episode inputs, not a flashcard-first or scheduled SRS review system.
- ✓ Local-first persistence and explicit offline states are required for user-facing flows that depend on server capabilities.
- ✓ The codebase already contains initial Sorbet presentation primitives, including `JellyPressable`, `SorbetBackground`, and `SorbetTabBar`.
- ✓ Complete Bubble/Sorbet theme foundation and shared interactive primitives — Phase 1.
- ✓ Align shell, authentication, series management, and settings screens with the `design/bubble` mockups — Phase 2.
- ✓ Bubble/Sorbet visual refresh milestone shipped in v1.0 across the shell, auth, series, and settings surfaces.
- ✓ Bootstrap user-specific settings and other locally available session data before settings and related screens render — Phase 3.
- ✓ Run local/remote sync during app bootstrap when online without blocking offline startup when no connection is available — Phase 3.
- ✓ Show a Bubble/Sorbet loading experience during bootstrap and replace visible default-value flashes with explicit stateful UI handling — Phase 3.
- ✓ Verify startup, offline handling, sync behavior, lint, typecheck, build, and relevant tests after implementation — Phase 3.

### Active

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
- The current issue is a startup UX mismatch: settings render visible default values before user-specific data arrives, causing a layout jump once the request resolves.
- The next milestone should fix bootstrap timing and session-state presentation without expanding product scope into new learning mechanics.

## Constraints

- **Scope:** Preserve the AI-series MVP loop and do not add backlog product features while fixing startup loading and sync behavior.
- **Architecture:** Presentation components may render UI state and forward intent, but must not own persistence, Supabase, AI, vocabulary ranking, sync, or domain rules.
- **Bootstrap:** User-visible settings screens must not present fallback defaults as if they were hydrated user data.
- **Offline:** Bootstrap may use local data immediately, but remote sync must degrade cleanly when offline and mark the sync step complete instead of blocking entry.
- **Styling:** Use React Native styles and existing Expo-compatible UI dependencies; do not introduce NativeWind, Redux, or native projects unless a later approved scope change requires it.
- **Verification:** Run the documented lint, typecheck, build, and relevant test commands before claiming implementation completion.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `design/bubble` as the current screen-level visual target | The user identified these screenshots as the new design and the app already contains partial Sorbet primitives | Success |
| Treat the refresh as a presentation milestone only | The PRD, stack, and architecture artifacts already define product behavior; the request is visual and interaction polish | Success |
| Keep animation minimal and tactile | The design guidelines call for spring-like micro-interactions, while the user requested minimal button-style animations | Success |
| Unframe Home create hero into a compact CTA | The create-series block was too large and felt like an oversized card; making it a compact inline action row fits the design better | Success |
| Use fixed modal action sizes | Promoted Generate/Save text links in modals to fixed Bubble buttons to prevent header reflow/flicker when status changes | Success |
| Use static continue/prep banners | Changed the Series Details continuation banner from a single giant pressable card to a static surface with a small nested button | Success |
| Replace native SegmentedControl in Settings | Replaced native iOS components with custom BubbleSegmentedControl built from Bubble primitives | Success |
| Treat startup data hydration as the next milestone | The shipped Sorbet refresh exposed a UX flaw where default settings briefly render before user data loads | Success |
| Sync during bootstrap but do not block offline entry | The app must remain local-first while hiding settings flicker and reconciling remote state when available | Success |

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
*Last updated: 2026-07-07 after Phase 3*
