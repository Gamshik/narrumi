# Feature Research

**Domain:** Contextual passage translation for a mobile language-learning reader
**Project:** Context-English — v1.2 Contextual Passage Translation
**Researched:** 2026-07-17
**Confidence:** MEDIUM

## Scope And UX Contract

This milestone should add one focused comprehension aid to the existing AI-series reader. A learner selects a continuous English passage, explicitly requests a translation, and receives only its Russian translation without leaving the reader. The translation may use the owning episode as hidden context, but the visible result must not include explanations, alternatives, grammar notes, transliteration, or follow-up actions.

The same interaction contract must exist in both reader surfaces:

- **Single-episode reader:** any selectable passage in the episode body can invoke the control panel.
- **Multi-episode reader:** any selectable passage inside any rendered episode can invoke the same panel and states; the owning episode supplies context.
- **Boundary:** selecting across two episode containers is not required. Treat each episode as one selection owner unless the product explicitly expands the requirement after a platform feasibility check.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | User-Observable Contract |
|---------|--------------|------------|--------------------------|
| Native-feeling continuous passage selection | Mobile users expect long-press, drag handles, visible highlighting, and normal copy/select behavior | HIGH | The learner can select from part of a sentence through multiple paragraphs inside one episode text region; empty or whitespace-only selection shows no custom controls. |
| Identical behavior in both reader surfaces | A translation feature that works only in one reading path feels broken | HIGH | Selection, controls, loading, result, dismissal, offline, failure, accessibility, and reduced-motion behavior match in single-episode and multi-episode readers. |
| Compact contextual action panel | Apple, Google, Readlang, and LingQ establish select-then-act as the familiar pattern | MEDIUM | A compact Bubble/Sorbet panel appears near the selection without covering selection handles or the selected text. It contains `Translate` plus two visibly inactive `?` placeholders. |
| Explicit Translate action | Learners should decide when selected text is sent for AI translation | MEDIUM | Selection alone does not start a request. `Translate` is the only active action and gives immediate pressed feedback. |
| Russian-only translation output | The milestone promises a quick comprehension aid, not an explanation mode | MEDIUM | Success shows only a natural Russian translation of the selected English passage. UI chrome may label the result, but the AI content contains no preamble, notes, alternatives, markdown, or source-text repetition. |
| Episode-context fidelity | Word-for-word translation often fails on pronouns, idioms, dialogue, and story-specific meaning | HIGH | The result reflects the meaning, speakers, tense, and references in the owning episode rather than translating the selection as an isolated string. |
| Selection/result binding | Async output must never attach to the wrong passage | HIGH | The selected passage remains identifiable while loading and after success. Changing the selection or owning episode invalidates the old result and prevents a late response from replacing the current state. |
| Local, non-blocking loading state | Network translation may take long enough to need clear feedback | MEDIUM | The panel changes to a concise translating state with a local activity cue; duplicate submission is disabled. Reading content and navigation do not disappear behind a full-screen loader. |
| Deliberate offline state | The app is local-first, but this AI capability is online-only | LOW | Reading and text selection still work offline. The panel keeps Translate visibly unavailable and explains that translation needs a connection; it does not queue a hidden request. |
| Recoverable failure state | Temporary AI or network failures are normal | MEDIUM | A compact, plain-language failure message appears beside the action/result area, preserves the selected passage, and offers retry for that same selection. |
| Predictable dismissal and replacement | Temporary help must not accumulate or clutter the story | MEDIUM | Explicit close/dismiss clears the panel and result. A new selection replaces the previous selection state. Leaving the reader clears transient translation UI. Scrolling never jumps the learner to another location. |
| Accessible controls and dynamic status | Selection and asynchronous results must work beyond touch-only, sighted interaction | HIGH | Translate has a concise accessible label, button role, enabled/busy state, and at least a comfortable 44-point iOS hit region (with Android sizing verified during implementation). Loading, success, offline, and error states are announced without unnecessary focus theft. Russian output is exposed as Russian text. |
| Reduced-motion and theme-safe behavior | The Sorbet system explicitly requires accessible motion and light/dark support | MEDIUM | Panel entry and button feedback use restrained motion; Reduce Motion replaces spatial/spring effects with immediate or subtle opacity changes. Selection, controls, status text, and result remain legible in light/dark themes and at larger text sizes. |

### Selection Lifecycle

| State | Entry | Expected Behavior | Exit |
|-------|-------|-------------------|------|
| No selection | Reader opens or selection is cleared | No translation panel is visible | Learner selects non-empty episode text |
| Selected | Native selection becomes non-empty | Highlight remains visible; panel appears outside the handle path; Translate is enabled only when online | Translate, selection change, dismiss, navigation |
| Translating | Learner activates Translate | Snapshot selected text and owning episode; show local busy state; ignore repeat taps | Current request succeeds/fails, selection changes, navigation |
| Translated | Current request succeeds | Show only the Russian result near the source selection; keep source passage identifiable; announce readiness | New selection, dismiss, navigation |
| Offline unavailable | Selection exists while offline | Keep reader and selection usable; show a concise online-required state; do not enqueue | Connectivity returns, new selection, dismiss |
| Failed | Current request fails | Preserve selection; show concise error and Retry; do not display partial or stale output | Retry, new selection, dismiss, navigation |

### Control Panel Contract

| Control | Visual Behavior | Interaction | Accessibility |
|---------|-----------------|-------------|---------------|
| Translate | Primary compact jelly/bubble action with press compression; swaps to an in-place busy state during the request | Active only for a valid selection while online; one request at a time | Label `Translate selected passage`, button role, disabled/busy state, adequate hit region |
| `?` placeholder 1 | Inactive Sorbet bubble with restrained ambient animation; static under Reduce Motion | No tap action and no haptic response | Hide from the accessibility tree until it has a defined action; never expose an unlabeled question-mark button |
| `?` placeholder 2 | Same construction and state as placeholder 1 | No tap action and no haptic response | Same as placeholder 1 |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bounded episode-aware context | Produces a story-correct translation without turning the request into a full-series prompt | HIGH | Use the selected passage plus compact relevant episode context; the learner sees only the Russian result. |
| Reader-flow preservation | Learners resolve confusion without abandoning the episode, losing scroll position, or entering a study mode | MEDIUM | Prefer an anchored/adjacent bubble surface over a new route or screen-covering modal. |
| Cross-reader parity from one behavior model | Prevents subtle drift between current-episode and history/multi-episode reading | HIGH | The visual anchor may differ by layout, but state names, copy, request rules, and dismissal remain shared. |
| Stale-result protection as visible correctness | Avoids the especially damaging case where a plausible translation is shown for the wrong selection | HIGH | Response must match the selection and episode snapshot that initiated it. |
| Sorbet-native restrained motion | Makes the utility feel part of the product while keeping the story text dominant | MEDIUM | Animate the controls, not the passage; no looping translation shimmer or large background choreography. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-translate immediately on selection | Feels one tap faster | Sends text without explicit intent, raises cost/privacy concerns, fires during handle adjustment, and distracts from inference-based reading | Require explicit Translate after the selection settles |
| Grammar or vocabulary explanation in the result | Seems educational | Violates Russian-only output, duplicates existing/future support modes, expands validation, and turns a quick aid into a lecture | Return translation only; leave both `?` actions inactive |
| Multiple translation candidates, transliteration, confidence scores, or source repetition | Appears more comprehensive | Adds cognitive load and makes output shape harder to validate | Show one natural Russian translation |
| Whole-episode translation or always-visible bilingual text | Helps beginners read everything | Overpowers English immersion, clutters the reader, and weakens the AI-series reading loop | Translate only the learner-selected passage on demand |
| Cross-episode selection in the multi-episode reader | Sounds like unrestricted selection | Creates ambiguous context ownership and complex selection geometry across independently rendered episode regions | Support any passage within any one episode; revisit only with an explicit requirement |
| Dedicated translation route or full-screen modal | Offers more space | Loses reading position and makes a lightweight aid feel like a separate task | Keep output in the current reader near the selected source |
| Silent background retry or offline queue | Avoids showing failure | The selection may no longer exist when the request runs, causing surprising or stale output | Show offline/failure state and let the learner retry explicitly |
| Persistent translation history, caching, saving, sharing, copying, or export | Seems useful for study | Adds persistence, privacy, sync, and product-scope decisions unrelated to validating contextual translation | Keep translation state transient for this milestone |
| Automatic Story Word creation or learning-state changes | Connects translation to vocabulary features | Passage-level intent does not reliably indicate a word to learn and risks reintroducing queue-like behavior | Do not mutate Story Words or visible learning state from passage translation |
| Translation audio or automatic TTS interruption | Extends pronunciation support | Competes with the existing English episode audio and is not required for comprehension | Keep existing audio behavior unchanged |
| Animated placeholders that accept taps or announce vague actions | Suggests future capability | Creates dead controls, accessibility confusion, and false expectations | Keep placeholders visibly inactive and non-interactive; hide them from assistive navigation |

## Feature Dependencies

```text
[Selectable episode text in both readers]
    └──requires──> [Stable selection + owning episode identity]
                       └──requires──> [Shared translation state model]
                                          ├──requires──> [Trusted online AI translation boundary]
                                          ├──requires──> [Current-request / stale-result guard]
                                          └──drives────> [Loading, offline, failure, success states]

[Bubble/Sorbet action panel] ──presents──> [Shared translation state model]
[Accessibility semantics] ────applies───> [Selection, controls, statuses, Russian output]
[Reduce Motion] ──────────────constrains─> [Panel and placeholder animation]

[Automatic translation] ─────conflicts──> [Explicit learner intent]
[Persistent history] ────────conflicts──> [Tightly scoped transient reader aid]
```

### Dependency Notes

- **Selectable text requires stable episode ownership:** the request needs both the exact selected passage and the episode that supplies its context.
- **Both reader surfaces require one shared state contract:** separate implementations are likely to drift on offline, error, dismissal, and stale-response behavior.
- **Translation UI requires the trusted online boundary:** direct client LLM calls remain forbidden; this feature is unavailable offline even though reading remains available.
- **Loading and retry require request identity:** retry must use the currently visible selection snapshot, and a late prior response must be ignored.
- **Animation requires accessibility preferences first:** the panel cannot ship with spring/ambient behavior unless it has a static or subtle reduced-motion presentation.

## MVP Definition

### Launch With (v1.2)

- [ ] Continuous selectable episode passages in both single-episode and multi-episode readers
- [ ] Compact Bubble/Sorbet panel with one active Translate control and two inactive `?` placeholders
- [ ] Explicit online request that uses bounded owning-episode context
- [ ] Validated Russian-only translation result shown without leaving the reader
- [ ] Shared no-selection, selected, translating, translated, offline, and failed states
- [ ] Selection/request binding that rejects stale results and duplicate submissions
- [ ] Predictable dismiss, replace-selection, navigation, and retry behavior
- [ ] Accessible labels, roles, hit regions, announcements, text scaling, theme contrast, and Reduce Motion behavior

### Add After Validation (Not Committed)

- [ ] Explicit Copy Translation action — only if learner testing shows repeated need and platform copy feedback can remain unobtrusive
- [ ] Short-lived in-session result restoration after accidental view remount — only if UAT finds disruptive loss; do not create synced history

### Future Consideration (Outside This Milestone)

- [ ] Define actions for the two `?` controls — requires separate product decisions and AI output contracts
- [ ] Configurable target language — conflicts with the current Russian-only contract and requires settings/localization work
- [ ] Offline translation — requires a quality, storage, Expo compatibility, and privacy evaluation
- [ ] Cross-episode selection — requires explicit product approval plus platform feasibility research

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Passage selection in both readers | HIGH | HIGH | P1 |
| Translate action and Russian-only result | HIGH | HIGH | P1 |
| Episode-aware context | HIGH | HIGH | P1 |
| Loading/offline/failure/retry states | HIGH | MEDIUM | P1 |
| Stale-result protection | HIGH | HIGH | P1 |
| Accessibility and reduced motion | HIGH | MEDIUM | P1 |
| Animated inactive `?` placeholders | LOW | MEDIUM | P1 only because milestone scope explicitly requires them |
| Copy translation | MEDIUM | LOW | P2 after validation |
| Persistent history or offline model | LOW for current goal | HIGH | P3 / out of scope |

**Priority key:**

- P1: Must have for milestone acceptance
- P2: Consider only after learner validation
- P3: Future consideration, not roadmap scope for v1.2

## Competitor And Platform Pattern Analysis

| Pattern | Apple / Google Translate | Readlang / LingQ | Context-English Approach |
|---------|--------------------------|-----------------|--------------------------|
| Invocation | Select/highlight text, then explicitly choose translation | Tap words or select phrases/sentences inside the reader | Select any continuous passage within one episode, then tap Translate |
| Context preservation | Translation can remain in the current app/system surface | Reader-integrated meanings and sentence/phrase translation | Keep the learner on the same episode and preserve scroll position |
| Output breadth | Often offers copy, listen, favorites, language choice, or app handoff | Often adds dictionaries, explanations, vocabulary saving, review, or audio | Deliberately narrower: one Russian translation only |
| Selection obstruction risk | System selection UI owns familiar handles/actions | Current LingQ feedback reports popups interfering with phrase selection | Place custom panel outside the handle path and never open on touch-down |
| Offline behavior | Some products support downloaded languages | Varies by product/tier | Explicitly online-only; reader remains usable and communicates unavailability |

## Acceptance-Oriented UX Expectations

1. Selecting text never triggers AI by itself.
2. The selected source remains clear while the learner waits and reads the result.
3. The panel never hides the drag handles or prevents expanding/shrinking the selection.
4. In multi-episode reading, the result belongs visibly and logically to the episode where selection began.
5. Changing selection during a request cannot produce a mismatched visible translation.
6. Offline and failure states preserve the reader, selection, and retry path.
7. Success content is Russian translation only; explanations and future actions are absent.
8. The two `?` controls look intentionally inactive, do nothing on tap, and do not create assistive-technology dead ends.
9. Loading and control motion remain local and quiet; Reduce Motion yields a stable presentation.
10. Dismissal or navigation leaves no floating panel, pending result insertion, or altered Story Words behind.

## Research Flags For Roadmap

- **Selection feasibility in the current React Native reader composition:** HIGH implementation risk. Verify exact text boundaries, nested pressable word behavior, and selection callbacks before promising multi-paragraph ranges.
- **Multi-episode rendering boundaries:** confirm each episode can independently own a range, panel anchor, and context identifier without cross-episode ambiguity.
- **Accessible selection testing:** manual VoiceOver and TalkBack verification is required; native selectable text alone does not validate custom panel discoverability or async announcements.
- **AI output validation:** ensure the trusted server boundary can enforce non-empty Russian-only plain text and reject explanations or malformed responses.
- **Cancellation/stale response behavior:** define request identity and lifecycle before UI polish; this is correctness, not an optional optimization.

## Sources

### Canonical Project Sources (HIGH confidence)

- `.planning/PROJECT.md` — v1.2 goal, active requirements, trusted AI boundary, and scope limits
- `concept/prd_concept_mvp.md` — AI-series core loop, inline contextual support, bounded series memory, local-first behavior, and anti-flashcard scope
- `design/design_system.html` — reader legibility, inline word translation, sentence helper, audio, and existing interaction reference
- `design/design_system_guidelines.md` — Bubble/Sorbet surfaces, motion, Reduce Motion, reader priority, light/dark themes, and anti-patterns

### Current External Sources (MEDIUM confidence; websearch findings cross-checked)

- [Apple: Translate text in apps on iPhone](https://support.apple.com/en-lamr/guide/iphone/iphab4dcff1d/ios) — explicit select-then-translate interaction and in-context result actions
- [Google Translate Help: Translate text in other apps](https://support.google.com/translate/answer/6350658?hl=en) — explicit user activation and dismissible in-place translation pattern
- [Readlang: Learn a Language by Reading](https://readlang.com/) — immediate word/phrase translation and separation of translation from deeper AI explanation
- [LingQ iOS App Support](https://www.lingq.com/en/ios-app-support/) — phrase selection, sentence translation, and reader-integrated language support
- [LingQ support: phrase selection and obstructing popups](https://forum.lingq.com/t/how-to-see-sentence-translation-in-app/2621292) — recent user-observed selection interference; supporting evidence only
- [DeepL API: Translate Text](https://developers.deepl.com/api-reference/translate) — additional context can influence translation without being translated; contiguous text can contain multiple sentences
- [React Native: Text](https://reactnative.dev/docs/text) — native selectable text and selection color support
- [React Native: AccessibilityInfo](https://reactnative.dev/docs/next/accessibilityinfo) — Reduce Motion state and screen-reader announcements
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) — control sizing, labels, simple gestures, explicit dismissal, and reduced motion
- [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons?changes=latest_1__8) — minimum hit region, press states, and in-button activity indication
- [Apple HIG: Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators) — transient loading feedback, consistent placement, and actionable stalled/failure states
- [Android Developers: Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first) — online-only action availability and explicit failure communication
- [W3C: Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) — announce waiting, success, and error status without unnecessary context changes
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) — disable nonessential interaction motion under user preferences

---
*Feature research for: Context-English v1.2 contextual passage translation*
*Researched: 2026-07-17*
