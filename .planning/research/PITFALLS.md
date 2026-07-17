# Pitfalls Research

**Domain:** Cross-platform passage selection and contextual AI translation in an Expo React Native reader
**Researched:** 2026-07-17
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Treating selectable text as an observable selection API

**What goes wrong:** The operating system shows selection handles, but React Native never reports the selected range needed to open the custom action panel.

**Why it happens:** Core `Text` supports native copy selection but has no range callback; the existing reader also splits content across several `Text` and `View` boundaries.

**How to avoid:** Make a physical-device feasibility spike the first phase. Prove a read-only `TextInput`-based adapter on iOS and Android behind a focused `PassageSelectionSurface` before implementing the backend. Do not add a native package until the core path is disproved and an EAS development build is explicitly approved.

**Warning signs:** Selection works only in Expo web, offsets are unavailable, handles disappear while scrolling, or the prototype must replace rich reader content with plain text.

**Phase to address:** Selection feasibility gate.

---

### Pitfall 2: Confusing multi-episode reader support with cross-episode selection

**What goes wrong:** Context comes from the visible header rather than the selected passage, or a drag across episode boundaries creates invalid offsets and mixed ownership.

**Why it happens:** `activeEpisodeIndex` describes scroll focus, while a native selection belongs to a concrete text surface. Separate episode blocks do not form one native selection document.

**How to avoid:** Support selection inside every episode block in both reader modes, but keep one selection owned by one stable episode ID for this milestone. Clear the old selection when another episode is selected. Treat one selection spanning an episode boundary as explicitly out of scope unless a later device spike and product decision approve a unified document.

**Warning signs:** Requests reference `activeEpisodeIndex`, selection anchors omit `episodeId`, or tests accept a range whose start and end belong to different episode surfaces.

**Phase to address:** Selection contracts and reader integration.

---

### Pitfall 3: Letting asynchronous results detach from the selection

**What goes wrong:** A translation for an old passage appears after the learner changes the selection, switches episode, closes the panel, or starts another request.

**Why it happens:** UI state is modeled as unrelated booleans and Promise completions are applied without a stable request key.

**How to avoid:** Snapshot selection and episode ownership at submit time, use a discriminated UI state plus request key, reject stale completions, prevent duplicate submissions, and clear ephemeral state on reader exit.

**Warning signs:** Translation state stores only a string, double taps create concurrent calls, or changing selection does not invalidate loading and success states.

**Phase to address:** Application boundary and reader controller.

---

### Pitfall 4: Sending excessive or incorrect context

**What goes wrong:** Translation latency and cost grow, private story content is over-shared, or the model translates/explains surrounding text instead of only the selection.

**Why it happens:** The full episode, whole series history, or compact series memory is sent as a convenient substitute for deterministic local context construction.

**How to avoid:** Reconstruct the selected source from local episode data, send bounded adjacent sentence context for its owning episode, enforce character limits on mobile and Edge, and instruct the model that context is untrusted reference data rather than text to translate.

**Warning signs:** Payload size grows with series length, the client submits arbitrary free-form context, or the result contains explanations and surrounding paragraphs.

**Phase to address:** Pure context contracts and Edge boundary.

---

### Pitfall 5: Building a visually lively but inaccessible controls panel

**What goes wrong:** The floating panel obscures text, is clipped while scrolling, question-mark placeholders look actionable, or ambient motion is uncomfortable and unusable with assistive technology.

**Why it happens:** The panel is positioned inside sentence components and animation is treated as decoration without reduced-motion, focus, and disabled semantics.

**How to avoid:** Render one safe-area-aware reader overlay, keep 48 dp touch targets, animate only restrained opacity/scale/translation, honor system reduced motion, mark `?` items disabled with clear “coming soon” semantics, and keep decorative movement hidden from accessibility.

**Warning signs:** Controls jump after scroll, overlap native selection handles, placeholders can trigger callbacks, VoiceOver/TalkBack announces unlabeled buttons, or reduced-motion mode still loops animation.

**Phase to address:** Reader UI integration and device hardening.

---

### Pitfall 6: Trusting the client or model at the AI boundary

**What goes wrong:** Oversized or injected input spends provider tokens, unauthenticated calls reach OpenRouter, raw provider errors leak to the client, or non-translation prose is rendered.

**Why it happens:** The Edge Function forwards client strings directly and treats structured generation as proof of safe output.

**How to avoid:** Authenticate before generation, rate-limit deliberate Translate actions, validate strict bounded request and response schemas, keep prompts/model/secrets server-side, use low-variance non-streaming generation, return only `{ translation }`, and never log raw selected passages.

**Warning signs:** Reader code calls Supabase or OpenRouter directly, schemas allow extra fields, failures expose provider text, or success accepts labels, Markdown, or empty output.

**Phase to address:** Edge Function and infrastructure integration.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Clipboard polling | Avoids a selection adapter | Stale, permission-sensitive, inaccessible input | Never |
| Custom JavaScript drag handles | Full visual control | Reimplements platform selection, scrolling, Unicode offsets, and accessibility | Never |
| Put all state in `EpisodeReaderScreen` | Fewer initial files | Enlarges an already broad component and makes stale-response bugs likely | Never |
| Persist translations immediately | Easy revisit behavior | Adds schema, sync, privacy, invalidation, and conflict scope | Only in a future approved milestone |
| Add a native selection package before the spike | Fast-looking escape hatch | Breaks Expo Go assumptions and may still lack live ranges/platform parity | Only after the core spike fails and EAS runtime change is approved |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| React Native selection | Assume `Text selectable` reports offsets | Normalize a proven platform selection event behind `PassageSelectionSurface` |
| Multi-episode reader | Use active scroll index for context | Carry stable selection-owned `episodeId` and immutable anchors |
| Supabase Edge Functions | Invoke from presentation or trust client context | Reader calls an application use case; Edge repeats authentication and validation |
| OpenRouter / AI SDK | Parse arbitrary prose or stream a short result | Request one bounded structured translation and validate it before returning |
| Existing word translation | Reuse durable word annotation contracts | Keep arbitrary passage translation ephemeral and mutually exclusive in UI |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending full series history | Slow requests and rising token cost | Adjacent sentence windows with aggregate caps | As soon as a series has several episodes |
| Repeated calls on double tap | Duplicate results and provider spend | Single-flight state and disabled Translate while loading | Any noticeable network latency |
| Rebuilding a unified document on every scroll frame | Reader jank and lost selection | Memoize deterministic per-episode documents by stable content version | Long multi-episode reader content |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Generate before authentication | Unpaid abuse and token spend | Authenticate before provider invocation and apply per-user rate limits |
| Treat story content as prompt instructions | Prompt injection and incorrect output | Serialize selection/context as bounded untrusted data under a fixed system contract |
| Log raw selections or prompts | Unnecessary story-content retention | Log IDs, sizes, latency, and error categories only |
| Trust structured model output blindly | Explanations, Markdown, or invalid payloads reach UI | Strict Edge and mobile response parsing with bounded `translation` only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Selection disappears on Translate | Learner cannot connect result to source | Preserve the selection snapshot and reader position through loading/retry |
| Generic offline failure after tap | Feature feels broken | Show Translate as explicitly online-only while preserving local selection |
| Panel covers source or selection handles | Editing the range becomes frustrating | Position at reader overlay level and verify placement during scroll on both platforms |
| Question marks resemble active mystery actions | Users tap controls that do nothing | Use disabled semantics, restrained animation, and accessible “coming soon” labels |
| Word sheet and passage result compete | Overlapping sheets and unclear source | Make the two reader surfaces mutually exclusive |

## "Looks Done But Isn't" Checklist

- [ ] **Selection:** Verify real range events, Unicode offsets, handle dragging, scrolling, and dismissal on physical iOS and Android devices.
- [ ] **Reader coverage:** Verify selection inside every episode in single-episode and multi-episode reader modes, including an earlier episode while another header is active.
- [ ] **Async safety:** Verify changed selection, retry, navigation, and duplicate taps cannot display stale output.
- [ ] **Translation contract:** Verify output contains only a natural Russian translation with no label, explanation, Markdown, or surrounding context.
- [ ] **Accessibility:** Verify touch targets, labels, disabled placeholders, live state announcements, dynamic type, reduced motion, VoiceOver, and TalkBack.
- [ ] **Trust boundary:** Verify offline admission, authentication, rate/input/output limits, safe errors, and absence of raw passage logging.
- [ ] **Regression:** Verify word annotations, reader navigation, story choices, continuation loading, and Expo export remain intact.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Core selection spike fails | HIGH | Stop backend work, document evidence, obtain approval for EAS development build, and test a narrow native adapter |
| Stale result reaches UI | MEDIUM | Introduce request-key state machine, clear detached results, and add deterministic race tests |
| Context payload is excessive | LOW | Centralize bounds, rebuild adjacent context from episode anchors, and add aggregate-limit tests |
| Panel is inaccessible or obstructive | MEDIUM | Move it to the reader overlay, simplify motion, add disabled semantics, and repeat physical-device accessibility UAT |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Unobservable native selection | Selection feasibility gate | Physical iOS/Android range and scrolling matrix passes |
| Wrong episode ownership | Selection/context contracts | Stable-ID and multi-episode fixtures pass; cross-boundary selection is rejected |
| Stale async result | Application/controller integration | Race, retry, double-tap, and navigation tests pass |
| Excessive or wrong context | Context and Edge boundaries | Aggregate caps and ambiguity fixtures pass |
| Inaccessible animated panel | Reader UI and hardening | Reduced-motion, assistive-tech, dynamic-type, and placement UAT passes |
| Untrusted client/model data | Edge Function integration | Auth, strict schema, injection, provider failure, and safe-output tests pass |

## Sources

- `.planning/research/STACK.md` — verified stack and platform constraints
- `.planning/research/FEATURES.md` — expected behavior and scope boundaries
- `.planning/research/ARCHITECTURE.md` — existing integration points and trust boundaries
- `architecture/architecture_for_ai.md` — canonical dependency and AI boundary rules
- `design/design_system_guidelines.md` — Bubble/Sorbet motion and surface constraints
- React Native 0.86 core `Text` and `TextInput` contracts, as verified in stack research

---
*Pitfalls research for: Context-English v1.2 Contextual Passage Translation*
*Researched: 2026-07-17*
