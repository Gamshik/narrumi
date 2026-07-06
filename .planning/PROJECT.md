# Context-English

## What This Is

Context-English is an Expo React Native MVP for learning English through personal AI series. The learner creates or continues a series, chooses lightweight Story Words, reads and listens to short AI-generated episodes, influences the episode through choices or short replies, and keeps progress locally first with sync when available.

## Core Value

The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## Current State

v1.1 App Bootstrap Loading shipped on 2026-07-06. The app now restores local user preferences before settings-visible screens render, keeps startup usable offline, and surfaces sync, recovery, and save issues through explicit Bubble/Sorbet states instead of visible default-setting flicker.

## Next Milestone Goals

- Define the next milestone from fresh requirements instead of extending the archived bootstrap scope.
- Deliver `LEARN-01` by aligning the episode reader, Story Words flow, dictionary, and translation surfaces with the Bubble/Sorbet design direction.
- Revisit deferred UI/debug artifacts only if they remain relevant to the new milestone scope.

## Requirements

### Validated

- ✓ Expo Managed Workflow is the approved frontend runtime.
- ✓ The MVP product loop is AI-series first: series -> Story Words -> episode -> interaction -> feedback -> continuation.
- ✓ Story Words are lightweight episode inputs, not a flashcard-first or scheduled SRS review system.
- ✓ Local-first persistence and explicit offline states are required for user-facing flows that depend on server capabilities.
- ✓ The codebase already contains initial Sorbet presentation primitives, including `JellyPressable`, `SorbetBackground`, and `SorbetTabBar`.
- ✓ Complete Bubble/Sorbet theme foundation and shared interactive primitives - v1.0.
- ✓ Align shell, authentication, series management, and settings screens with the `design/bubble` mockups - v1.0.
- ✓ Bubble/Sorbet visual refresh shipped across the shell, auth, series, and settings surfaces - v1.0.
- ✓ Bootstrap user-specific settings and other locally available session data before settings and related screens render - v1.1.
- ✓ Run local/remote sync during app bootstrap when online without blocking offline startup when no connection is available - v1.1.
- ✓ Show a Bubble/Sorbet loading experience during bootstrap and replace visible default-value flashes with explicit stateful UI handling - v1.1.
- ✓ Verify startup, offline handling, sync behavior, lint, typecheck, build, and relevant tests after implementation - v1.1.

### Active

- [ ] LEARN-01: User can read the episode reader, Story Words flow, dictionary, and translation surfaces fully aligned with the Bubble/Sorbet mockups.

### Out of Scope

- Traditional flashcard-first learning as the primary app flow.
- Scheduled SRS queues, due reviews, review debt, or streak-pressure mechanics.
- New AI product capabilities, image/video generation, voice conversation, multiplayer, or public sharing.
- Native `ios/` or `android/` project changes.
- Direct client calls to OpenRouter or other LLM providers.

## Context

- Canonical product scope lives in `concept/prd_concept_mvp.md`.
- Canonical technical constraints live in `stack/tech_stack_mvp.md`.
- AI-agent architecture boundaries live in `architecture/architecture_for_ai.md`.
- Design guidance lives in `design/design_system.html`, `design/design_system_guidelines.md`, and the Bubble/Sorbet screenshots under `design/bubble`.
- Mobile app commands are declared in `apps/mobile/package.json` and documented in `apps/mobile/README.md`.
- The startup hydration and sync UX mismatch that defined v1.1 is now resolved in shipped code and validated by recorded UAT plus automated lint, typecheck, test, and build passes.
- The next milestone has not been defined yet; planning should restart from requirements instead of continuing the archived bootstrap roadmap.

## Constraints

- **Scope:** Preserve the AI-series MVP loop and do not add backlog product features without explicit approval.
- **Architecture:** Presentation components may render UI state and forward intent, but must not own persistence, Supabase, AI, vocabulary ranking, sync, or domain rules.
- **Offline:** Local data must remain available even when remote sync is unavailable.
- **Styling:** Use React Native styles and existing Expo-compatible UI dependencies; do not introduce NativeWind, Redux, or native projects unless an approved scope change requires it.
- **Verification:** Run the documented lint, typecheck, build, and relevant test commands before claiming implementation completion.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `design/bubble` as the current screen-level visual target | The user identified these screenshots as the current UI reference and the app already contains partial Sorbet primitives | Success |
| Treat the visual refresh as a presentation milestone set | The PRD, stack, and architecture artifacts already define product behavior; the recent work was UX and interaction polish | Success |
| Sync during bootstrap but do not block offline entry | The app must remain local-first while removing settings flicker and reconciling remote state when available | Success |
| Gate settings-visible surfaces behind bootstrap-managed loading states | Showing default preferences before hydration broke the local-first UX contract | Success |
| Keep deferred debug sessions outside milestone scope unless they materially affect the shipped milestone | The remaining open artifacts are acknowledged closeout debt, not release blockers | Override closeout |

## Milestone History

<details>
<summary>Archived milestone goals</summary>

### v1.1 App Bootstrap Loading

Remove the settings flicker by bootstrapping user data before settings render and by showing a clear loading experience while local and remote state reconcile.

### v1.0 Bubble/Sorbet UI Refresh

Refresh the mobile shell, auth, series, and settings experience to match the Bubble/Sorbet design direction.

</details>

---
*Last updated: 2026-07-07 after v1.1 milestone*
