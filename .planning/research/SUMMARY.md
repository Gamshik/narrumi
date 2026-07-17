# Project Research Summary

**Project:** Context-English — v1.2 Contextual Passage Translation
**Domain:** Cross-platform passage selection and contextual Russian AI translation in an Expo React Native reader
**Researched:** 2026-07-17
**Confidence:** MEDIUM

## Executive Summary

Context-English v1.2 is a focused extension to an existing local-first AI-series reader: a learner selects a continuous English passage, explicitly requests help, and sees only a natural Russian translation without leaving the reading flow. Experts implement this as an ephemeral reader interaction, not as a new translation subsystem or durable learning record. The feature must behave consistently in both the single-episode reader and the multi-episode reader: in the latter, selection must work inside every rendered episode, but that does **not** mean one drag selection must span an episode boundary. For v1.2, each selection should have one stable owning episode unless a later product decision and device spike explicitly expand the requirement.

The recommended implementation keeps the current Expo/React Native, Reanimated, Supabase, OpenRouter, Vercel AI SDK, and Zod stack. A narrow `PassageSelectionSurface` converts observable native ranges into stable episode/sentence anchors; a `TranslatePassage` use case reconstructs the selected source from saved local episodes, builds bounded adjacent context, checks connectivity, and calls a `PassageTranslationGateway`; an authenticated `translate-passage` Edge Function owns prompts, provider configuration, strict request/output validation, and safe errors. Translation and UI state remain transient. No new mobile dependency, state manager, persistence table, sync path, direct client LLM call, WebView reader, or translation SDK is justified.

The milestone's critical gate is selection feasibility. Core `Text` can display native selection but cannot report the selected range, while the existing rich reader spans multiple `Text` and `View` surfaces. Before backend work, a physical-device spike must prove that a read-only multiline `TextInput` adapter reports stable ranges on iOS and Android while preserving scrolling, narration/dialogue layout, inline annotations, accessibility, dynamic type, and normal reader interactions. If it fails, stop: the next step requires explicit approval for an EAS development build and a narrow native adapter. The roadmap must also prevent stale async results, excessive or incorrect context, inaccessible overlay controls, and trust-boundary failures through stable request keys, deterministic bounds, a shared state machine, physical-device UAT, and validation on both sides of the network.

## Key Findings

### Recommended Stack

The detailed recommendation in [STACK.md](./STACK.md) is conservative: reuse the installed stack and add only focused adapters and contracts. The selection surface is the sole unresolved technology decision. No selection package should be installed until the core physical-device spike fails and the runtime change is approved.

**Core technologies:**

- **Expo 57.0.6 / React Native 0.86.0:** first-pass selection surface and reader integration — already installed and compatible with Expo Managed Workflow; `TextInput.onSelectionChange` is the only core candidate that exposes range offsets.
- **React Native Reanimated 4.5.0 / Worklets 0.10.0:** compact Bubble/Sorbet control and state transitions — already installed, compatible with RN 0.86, and able to honor `ReduceMotion.System` without a second animation runtime.
- **Supabase Edge Functions on Deno 2:** authenticated contextual-translation endpoint — preserves the existing trusted AI boundary and keeps prompts, secrets, models, limits, and output validation off the device.
- **Vercel AI SDK `ai@7.0.31` with `@ai-sdk/openai@4.0.16`:** low-variance, non-streaming structured generation through OpenRouter — pin these new Edge imports only after Deno/OpenRouter compatibility tests pass.
- **Zod 4.4.3:** strict request and response validation on mobile and Edge — already installed and compatible with the proposed AI SDK version.
- **Existing `@supabase/supabase-js`, `expo-network`, accessibility APIs, `JellyPressable`, safe-area, and Bubble/Sorbet primitives:** transport, online admission, accessible status, and UI composition — reuse repository-local boundaries rather than adding packages.

**Stack additions and exclusions:**

- Add one `PassageSelectionSurface`, one application port/use case, one Supabase gateway, and one `translate-passage` Edge Function.
- Add no mobile dependency on the recommended core path.
- Do not add Redux, a bottom-sheet/portal library, a second animation system, clipboard polling, JavaScript drag handles, a WebView reader, an on-device translation SDK, or a direct OpenRouter client.
- Keep Expo Managed Workflow/CNG and do not commit native `ios/` or `android/` directories. If native fallback becomes necessary, use an approved EAS development build.

### Expected Features

The feature contract in [FEATURES.md](./FEATURES.md) is intentionally narrow: contextual translation is a quick comprehension aid embedded in the reader, not a new study mode.

**Must have (table stakes):**

- Native-feeling continuous passage selection with observable, non-empty range data inside one episode text region.
- The same selection, controls, loading, success, dismissal, offline, failure, accessibility, and reduced-motion behavior in the single-episode and multi-episode readers.
- A compact safe-area-aware Bubble/Sorbet panel near the selection with one explicit active **Translate** action and two intentionally inactive `?` placeholders.
- Russian-only AI content: one natural translation without labels, explanations, alternatives, grammar notes, Markdown, transliteration, or source repetition.
- Bounded owning-episode context that resolves pronouns, dialogue, tense, idioms, and story references without sending the full episode or series history.
- Stable selection/result binding, duplicate-submit prevention, and stale-response rejection when selection, episode ownership, route, or request identity changes.
- Local non-blocking loading, explicit online-only/offline behavior, recoverable failure with retry, predictable dismissal/replacement, and preserved scroll position.
- Accessible control semantics and status announcements, adequate hit regions, dynamic type, theme contrast, Russian-language exposure, and system reduced-motion behavior.

**Should have (competitive differentiators):**

- Deterministic adjacent episode context that improves translation while remaining bounded and invisible to the learner.
- Reader-flow preservation: no route change, full-screen modal, or interruption of existing English audio and story navigation.
- One shared behavior model across both reader modes, including the case where a learner selects an earlier episode while a later header is active.
- Visible correctness through request-key stale-result protection and a source selection that stays identifiable during loading and retry.
- Sorbet-native restrained motion that keeps story text visually dominant.

**Defer (v2+ or only after validation):**

- Copy Translation or short-lived result restoration, unless learner testing demonstrates a concrete need.
- Defined actions for the two `?` controls, configurable target languages, offline translation, and one selection spanning episode boundaries.
- Persistent translation history, caching, saving, sharing, export, translation audio, whole-episode/bilingual views, automatic translation, or silent offline queues.
- Grammar/vocabulary explanation, multiple candidates, confidence scores, Story Word creation, or visible learning-state mutation from passage translation.

### Architecture Approach

The architecture in [ARCHITECTURE.md](./ARCHITECTURE.md) preserves the repository's dependency direction: `Presentation -> Application -> Domain <- Infrastructure`, with the Edge Function as a separate trusted backend boundary. Selection and translation are ephemeral application/presentation state, not domain entities. Existing locally saved episode sentences are the canonical source: presentation emits anchors, the use case reloads the episode, reconstructs the exact UTF-16 range, validates ownership/version/order, and builds bounded context. Presentation-provided selected text or context is never trusted as canonical.

**Major components:**

1. **`PassageSelectionSurface`** — isolates the platform selection mechanism and maps observable ranges to stable `episodeId`, sentence, character-offset, and content-version anchors.
2. **Pure selection/context contracts** — build deterministic per-episode documents, map UTF-16 offsets, reject invalid/separator-only/cross-owner ranges for v1.2, and construct adjacent-sentence context within shared bounds.
3. **`usePassageTranslationController`** — owns a discriminated UI state machine, request keys, retry/dismissal, mutual exclusion with word annotations, and stale-completion rejection.
4. **`TranslatePassage`** — checks connectivity, reloads canonical local episode data, validates/reconstructs the selection, builds context, applies single-flight behavior, and calls the gateway without persistence or sync.
5. **`PassageTranslationGateway` / `SupabasePassageTranslationGateway`** — keeps Supabase types out of application code, invokes `translate-passage`, maps typed errors, and parses the network response from `unknown`.
6. **`translate-passage` Edge Function** — authenticates before provider spend, enforces strict schemas and aggregate limits, serializes story text as untrusted data under a fixed prompt, performs low-variance structured generation, validates Russian-only plain output, and returns safe JSON errors.
7. **Reader overlay components** — compose the Translate action, inactive placeholders, loading/offline/error/result states, safe placement, theme behavior, accessibility, and restrained motion in both reader modes.

**Key patterns:**

- Build one stable selection owner per episode for v1.2. Multi-episode reader support means every episode block supports the interaction; `activeEpisodeIndex` never determines translation context.
- Use canonical UTF-16 slicing consistently and test emoji, curly punctuation, cross-sentence ranges, stale content versions, and boundary separators.
- Keep selection/result state transient and local to the reader; do not add repositories, database tables, sync operations, series-memory mutation, or durable provider caching.
- Bound selected source, touched/context episodes, surrounding sentences, aggregate context, titles, identifiers, and translation length on mobile and again authoritatively on Edge. Never silently truncate the selected source.
- Validate external data at the use case, Edge request, model output, and mobile response boundaries. Never log raw passages or prompts.

### Critical Pitfalls

The prevention strategies in [PITFALLS.md](./PITFALLS.md) define roadmap gates, not optional polish.

1. **Mistaking selectable text for observable selection** — core `Text selectable` cannot drive a custom action with exact offsets. Prove the `TextInput` adapter on physical iOS and Android first; if it fails, stop for the approved EAS/native decision.
2. **Confusing multi-episode reader support with cross-episode selection** — support a separate owned selection inside every episode in both reader modes, clear/replace the old selection when ownership changes, and reject one range whose endpoints belong to different episode surfaces unless scope is explicitly expanded.
3. **Allowing async output to detach from its source** — snapshot selection and episode ownership at submission, model UI as a discriminated state machine, attach a stable request key, disable duplicates, and ignore late completions after any ownership/lifecycle change.
4. **Sending excessive, incorrect, or client-authored context** — reconstruct from local canonical episodes, send only deterministic adjacent context for the owning episode, enforce aggregate caps twice, and treat every story string as untrusted prompt data.
5. **Shipping an obstructive or inaccessible action panel** — render at the reader overlay/root, preserve handles and selected text, keep adequate touch targets, provide deliberate disabled placeholder semantics, honor reduced motion, and verify VoiceOver/TalkBack and dynamic type on devices.
6. **Trusting the client, network, or model** — authenticate before generation, rate-limit deliberate requests, use strict schemas and fixed prompts, validate structured output rather than assuming it is safe, return typed errors, and keep provider details and raw content out of logs.

## Implications for Roadmap

Based on the combined research, use six phases with a stop/go gate before any backend investment.

### Phase 1: Selection Feasibility Gate

**Rationale:** Every downstream feature depends on exact, observable selection ranges, yet the current rich reader is split across native text surfaces and no researched drop-in package satisfies Expo Go, RN 0.86, iOS, Android, and custom-panel needs.

**Delivers:** A disposable but representative `PassageSelectionSurface` spike using read-only multiline `TextInput`, a physical iOS/Android test matrix, evidence for offsets/handles/scroll/accessibility/reader fidelity, and an explicit go/no-go decision. It must separately prove selection inside the single-episode reader and inside each episode block in the multi-episode reader. It does not need to prove one range spanning episode boundaries.

**Addresses:** Native-feeling continuous selection, cross-reader coverage, rich-reader compatibility, and the exact interpretation of “any passage.”

**Avoids:** Building backend/UI work on an unobservable selection API; silently downgrading to sentence-only selection; prematurely adding a native package or replacing the reader with a WebView.

**Exit gate:** Proceed only if real ranges are observable on physical iOS and Android without unacceptable reader regressions. If core fails, pause the milestone for explicit approval of an EAS development build and a narrow native adapter.

### Phase 2: Selection Ownership and Context Contracts

**Rationale:** Stable anchors and deterministic reconstruction must exist before async state or transport so every later layer agrees on what was selected and which episode owns it.

**Delivers:** Per-episode selection documents; UTF-16 flat-index/anchor mapping; stable `episodeId` and content-version ownership; exact source reconstruction; whitespace/separator/bounds validation; adjacent-sentence context construction; fixtures for single-episode and multi-episode readers, earlier-episode selection, cross-sentence selection, Unicode, and rejected cross-episode ranges.

**Addresses:** Episode-context fidelity, multi-episode reader parity, canonical source binding, and bounded context.

**Avoids:** Using `activeEpisodeIndex`, clipboard/rendered labels, mutable layout measurements, client-authored context, full-series history, or endpoints from different episode surfaces.

### Phase 3: Application Flow and Async Correctness

**Rationale:** The state and use-case contract should be correct with fake adapters before network or visual integration; stale plausible translations are a higher-severity correctness failure than ordinary request errors.

**Delivers:** `PassageTranslationGateway` port, request/result schemas and mobile parser, `TranslatePassage`, network admission, typed errors, same-request single-flight behavior, and a focused controller/reducer covering idle, selected, offline, loading, success, and error states.

**Addresses:** Explicit Translate intent, local loading, offline unavailability, retry, duplicate prevention, selection/result binding, dismissal, navigation cleanup, and mutual exclusion with the existing word-annotation sheet.

**Avoids:** Supabase calls in presentation, ad hoc booleans in `EpisodeReaderScreen`, hidden queues, detached late results, persistence/sync scope, and mutation of Story Words or series data.

### Phase 4: Trusted Translation Boundary and Infrastructure

**Rationale:** Once canonical mobile contracts are stable, implement the server authority and transport once, using established repository patterns while proving the proposed AI SDK versions in Deno/OpenRouter.

**Delivers:** Authoritative strict Edge schemas and shared limits; fixed prompt builder with per-request opaque data delimiter; authenticated `translate-passage` handler; low-variance non-streaming structured generation; output checks for one bounded plain Russian translation; safe error envelopes; Supabase mobile gateway; composition wiring; request, prompt-injection, provider-failure, schema, and response-parser tests.

**Addresses:** Context-aware Russian-only translation, online transport, safe failures, provider configuration, and mobile/Edge validation.

**Uses:** Supabase Edge Functions, pinned compatible AI SDK/OpenAI-provider imports, OpenRouter, Zod, existing auth/HTTP/error helpers, and the current Supabase client.

**Avoids:** Unauthenticated token spend, direct client LLM calls, unbounded/full-series context, raw provider errors, Markdown/explanations, blind trust in structured output, raw-content logging, and a new database/cache.

### Phase 5: Reader UI Integration Across Both Modes

**Rationale:** UI integration should consume already-proven selection and application contracts so the large reader screen remains composition-only and both reader modes share one behavior model.

**Delivers:** Safe-area-aware Bubble/Sorbet overlay components for Translate, inactive placeholders, loading/offline/error/result states, retry and dismissal; restrained Reanimated transitions; theme/dynamic-type/reduced-motion support; integration with selection ownership and annotation-sheet arbitration in single-episode and multi-episode readers.

**Addresses:** Compact controls, explicit action, Russian-only result, reader-flow preservation, cross-reader parity, theme safety, accessibility semantics, and preserved scroll position.

**Avoids:** Panel clipping/handle obstruction, dead or misleading controls, focus theft, full-screen loaders/modals, competing translation surfaces, route changes, and business/network logic in presentation.

### Phase 6: Device Hardening and Milestone Verification

**Rationale:** Unit tests cannot prove OS selection, assistive-technology behavior, placement during scroll, or actual translation quality. Release readiness requires both physical-device evidence and regression checks.

**Delivers:** Physical iOS/Android UAT for handles, scrolling, range adjustment, earlier-episode ownership, rotation, dynamic type, light/dark themes, Reduce Motion, VoiceOver/TalkBack, offline/reconnect/retry, stale-request races, and safe panel placement; semantic translation fixtures for ambiguity, dialogue, pronouns, idioms, and names; full lint, typecheck, tests, Edge tests, and Expo export.

**Addresses:** Accessibility, recoverability, translation fidelity, full lifecycle correctness, and consistent behavior in both readers.

**Avoids:** “Looks done” release failures, including range events that work only on web, translation attached to the active header rather than selection owner, stale output, inaccessible motion, invalid AI prose, and regressions to annotations, story choices, continuation loading, navigation, or audio.

### Phase Ordering Rationale

- Phase 1 is a mandatory feasibility gate because exact range observability is a prerequisite for every application, backend, and UI feature; failure changes the approved runtime/testing strategy.
- Phase 2 establishes canonical identity, source reconstruction, and bounds so presentation and network layers cannot invent competing interpretations.
- Phase 3 proves lifecycle correctness and dependency direction with fakes before provider complexity enters the flow.
- Phase 4 implements the trusted AI boundary against stable plain-data contracts and repository-standard Supabase patterns.
- Phase 5 integrates focused components into both reader modes only after selection and async behavior are testable.
- Phase 6 combines device-only evidence with automated regression and semantic quality checks; it is a release gate rather than a polish bucket.

### Research Flags

Phases likely needing deeper research or a targeted spike during planning:

- **Phase 1:** Mandatory device/platform research. The read-only `TextInput` surface is plausible but unverified with the current nested reader, Expo Go SDK 57 test path, iOS/Android selection handles, scrolling, accessibility, and rich layout.
- **Phase 4:** Targeted compatibility validation. Confirm pinned `ai@7.0.31`, `@ai-sdk/openai@4.0.16`, Zod 4, Deno 2, OpenRouter structured output, and the repository's Edge test tooling before finalizing implementation tasks.

Phases with well-documented repository patterns (skip broad research-phase):

- **Phase 2:** Pure mapping, validation, and bounded-context construction have clear contracts and deterministic test seams.
- **Phase 3:** Existing use-case, port, network-status, typed-error, local-store, and controller patterns provide sufficient implementation precedent.
- **Phase 5:** Existing Bubble/Sorbet primitives, Reanimated, reader composition, and accessibility guidance are established; use a UI contract and device verification rather than ecosystem research.
- **Phase 6:** This is execution of a defined UAT/regression matrix, not an architectural discovery phase.

### Open Decision Gates

1. **Selection runtime after the core spike:** If read-only `TextInput` cannot preserve the reader contract, the product owner must approve an EAS development build and a specific narrow native adapter. Do not silently add native dependencies, downgrade the experience, or commit native projects.
2. **Cross-episode selection:** Recommended v1.2 scope is selection within any one episode in both reader modes. One drag selection spanning episode boundaries is not implied by multi-episode-reader support and remains out of scope unless explicitly approved after feasibility evidence. Internal anchors may remain extensible, but acceptance tests should reject mixed episode ownership for this milestone.
3. **Context fields:** Stack research mentions compact episode summaries or minimal series-memory fields, while architecture research recommends only saved episode text and adjacent sentence windows. Default to deterministic adjacent episode context for v1.2; add summaries/memory only after ambiguity fixtures prove a need and the architecture decision is recorded.
4. **Learning signal:** Stack research says an existing non-punitive `translated` signal could be recorded, while architecture/feature research define this as a read-only flow with no learning-state mutation. Recommended v1.2 behavior is no learning signal or sync write; any telemetry/domain signal requires an explicit product decision.
5. **Inactive placeholder accessibility:** Research differs between hiding undefined actions from assistive navigation and exposing disabled “Coming soon” controls. Resolve this in the Phase 5 UI contract; the controls must never be unlabeled, focusable dead ends or accept taps.
6. **Production rate limits:** Authentication and input bounds are clear, but numeric per-user/provider limits are not. Define them before deploying the Edge Function, based on expected latency/cost and existing backend controls.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Installed versions and existing integration points are high-confidence repository facts, and official compatibility docs support the reused stack. The actual `TextInput` selection surface and proposed Edge import combination still require runtime proof. |
| Features | MEDIUM | Project artifacts clearly define the narrow Russian-only reader aid and both reader modes. Platform feasibility, placeholder accessibility semantics, and the ambiguous cross-episode interpretation remain unresolved. |
| Architecture | MEDIUM | Application, infrastructure, trust-boundary, and transient-state patterns are well supported by repository code and canonical architecture. Native selection is uncertain, and context/learning-signal details conflict across research outputs. |
| Pitfalls | MEDIUM | Risks align across repository evidence, React Native APIs, mobile UX patterns, and AI boundary practices. Physical selection/accessibility behavior and production provider behavior need empirical validation. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Physical native selection behavior:** Run the Phase 1 matrix on actual target iOS and Android environments; web/emulator-only evidence is insufficient.
- **Expo Go SDK 57 device path:** Confirm whether the target physical iPhone can run the current SDK through Expo Go; if not, distinguish that tooling limitation from a failure of the selection approach.
- **Reader fidelity under `TextInput`:** Verify narration/dialogue styling, annotations, selection gestures, scrolling, dynamic type, and accessibility can coexist without a full reader redesign.
- **Cross-episode scope wording:** Record the recommended one-owner interpretation in requirements before roadmap acceptance so “multi-episode support” cannot be mistaken for a unified cross-boundary document.
- **Edge compatibility and output quality:** Test the pinned SDK/provider combination and semantic Russian fixtures; structured shape alone does not prove correct translation.
- **Context and learning-signal conflicts:** Resolve the two research disagreements listed above before Phase 4 tasks are finalized.
- **Placeholder semantics and rate limits:** Make these explicit acceptance/security decisions rather than leaving them to implementation convention.

## Sources

### Primary (HIGH confidence)

- `.planning/PROJECT.md` — v1.2 goal, active requirements, constraints, trusted AI boundary, and scope exclusions.
- `concept/prd_concept_mvp.md` — AI-series reading loop, local-first behavior, contextual support, and product anti-features.
- `stack/tech_stack_mvp.md` — approved Expo Managed Workflow, Supabase, Edge Function, OpenRouter, and client/server boundaries.
- `architecture/architecture_for_ai.md` — Clean Architecture dependency direction, local-first data ownership, AI trust boundary, and error policy.
- `design/design_system.html` and `design/design_system_guidelines.md` — reader interaction, Bubble/Sorbet surfaces, accessibility, themes, and reduced-motion rules.
- Repository manifests, lockfiles, reader components, application ports/use cases, Supabase adapters, and Edge shared helpers — installed versions and existing integration patterns.
- [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [PITFALLS.md](./PITFALLS.md) — milestone-specific research synthesized here.

### Secondary (MEDIUM confidence)

- [React Native Text](https://reactnative.dev/docs/text) and [TextInput](https://reactnative.dev/docs/textinput.html) — native selection availability and observable `TextInput` range events.
- [Expo custom native code](https://docs.expo.dev/workflow/customizing/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/), and [SDK versions](https://docs.expo.dev/versions/latest/) — Expo Go/native-module boundary and SDK/runtime compatibility.
- [Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) and [accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) — RN/Worklets compatibility and reduced-motion behavior.
- [Vercel AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — schema-constrained structured generation.
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth) and [error handling](https://supabase.com/docs/guides/functions/error-handling) — authenticated request and safe transport patterns.
- Apple, Android, and W3C accessibility guidance cited in feature/stack research — control sizing, status announcements, selection interaction, and reduced motion.

### Tertiary (LOW confidence)

- Community/native selection packages considered in stack research — documented capabilities do not prove RN 0.86, Expo, live-range, or cross-platform suitability; none is recommended without a dedicated approved spike.

---
*Research completed: 2026-07-17*
*Ready for roadmap: yes, after preserving Phase 1 as a stop/go gate*
