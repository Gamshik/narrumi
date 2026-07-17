# Phase 4: Selection Feasibility Gate - Research

**Researched:** 2026-07-17
**Domain:** React Native native text selection, exact range observation, and physical-device feasibility
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Exact-range pass criteria
- **D-01:** The observed selection must reconstruct the exact canonical characters from the owning episode source, including punctuation. Only invisible whitespace at the two outer edges may be trimmed.
- **D-02:** Selectable canonical content consists only of story narration and spoken dialogue. A continuous selection may cross sentence and visual-layout boundaries within one episode; episode headings, speaker labels, controls, and annotation metadata are excluded.
- **D-03:** Existing annotated words remain ordinary, continuous selectable story text. A range may start, end, or pass through an annotated fragment without gaps, and selection gestures take precedence over opening the annotation while selection is active.
- **D-04:** Preserve each platform's native word and character endpoint behavior rather than forcing custom character precision or whole-word endpoints. Whatever characters the native highlight contains must be reconstructed exactly.

### Agent's Discretion
- The concrete prototype structure, range-observation mechanism, fixture corpus, and evidence-recording format may be chosen during research and planning, provided they prove D-01 through D-04 on physical iOS and Android and preserve the Phase 4 stop/go gate.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SELC-01 | User can select any non-empty continuous passage within an episode in the single-episode reader. | Use one episode-owned native selection surface, a deterministic canonical selection document, strict range validation, and physical-device cases that include punctuation, annotations, sentence boundaries, and narration/dialogue boundaries. [VERIFIED: `.planning/REQUIREMENTS.md`; `04-CONTEXT.md`] |
| SELC-02 | User can select a passage within any individual episode displayed in the multi-episode reader. | Bind the range callback to the rendered episode ID; never derive ownership from `activeEpisodeIndex`. Prove selection in an earlier episode after the compact header has focused a different episode. [VERIFIED: `EpisodeReaderScreen.tsx`; `04-CONTEXT.md`] |
| SELC-04 | User can select and adjust a passage on supported physical iOS and Android devices without breaking reader scrolling or existing reader interactions. | Use a recorded device matrix and real reader fixtures. Static tests cover range reconstruction and structural regressions; only representative physical iOS and Android runs can pass the gate. [VERIFIED: `.planning/ROADMAP.md`; `04-CONTEXT.md`] |
</phase_requirements>

## Summary

Phase 4 should be planned as an empirical stop/go experiment in the existing `EpisodeReaderScreen`, not as ordinary selection feature delivery. React Native core exposes native selection on `Text` through `selectable`, but the public `Text` contract does not expose selected offsets or an `onSelectionChange` event. React Native core exposes `{ start, end }` selection offsets only on `TextInput`. [CITED: https://reactnative.dev/docs/text#selectable] [CITED: https://reactnative.dev/docs/textinput#onselectionchange] The installed React Native 0.86 source confirms the same split: `TextProps` has `selectable`/`selectionColor`, while `TextInput` exports `onSelectionChange`; selectable `Text` is routed to a native selectable text view without adding a JavaScript range event. [VERIFIED: installed `react-native@0.86.0` source]

The existing reader makes the feasibility problem harder than a plain-text demo: every sentence is wrapped in a separate `View`/`JellyPressable`, narration and dialogue use different view layouts, and annotation fragments are nested pressable `Text` spans. [VERIFIED: `EpisodeReaderScreen.tsx`; `EpisodeSentence.tsx`] React Native documents that nested `Text` is flattened into one attributed native string, while `Text` nodes separated by `View` containers remain separate layout blocks. [CITED: https://reactnative.dev/docs/text#nested-text] Therefore the current per-sentence tree cannot, by itself, yield one native range that crosses sentence/view boundaries; that conclusion is an inference from the documented native text-container boundary and the inspected reader tree. [VERIFIED: codebase grep; React Native Text documentation]

**Primary recommendation:** plan two real-reader Expo Go probes in order: (1) a `Text selectable` baseline to establish native handles, gesture coexistence, and rich nested-text behavior, then (2) one episode-owned multiline `TextInput` candidate to establish observable offsets. A candidate passes only if the same surface simultaneously preserves dialogue/narration presentation, annotation taps, scrolling, Dynamic Type, and exact canonical reconstruction. If neither core candidate passes on both physical platforms, record NO-GO and stop for explicit native-adapter approval; do not begin Phase 5 or backend work. [VERIFIED: `.planning/ROADMAP.md`; `04-CONTEXT.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Native highlight and endpoint handles | Browser / Client (platform-native React Native view) | OS text system | React Native core delegates the visible selection affordance to the native text control; the phase must not implement custom handles. [CITED: https://reactnative.dev/docs/text#selectable] |
| Range observation and validation | Browser / Client | — | The presentation-facing selection surface emits offsets; a pure typed helper validates them before reconstructing text. No backend is involved. [CITED: https://reactnative.dev/docs/textinput#onselectionchange] |
| Canonical episode text mapping | Browser / Client | Application/domain data | The mapper consumes already-loaded `Episode.sentenceFrames` and returns plain typed data; it must not add persistence or transport behavior. [VERIFIED: `architecture/architecture_for_ai.md`; `episode.ts`] |
| Multi-episode ownership | Browser / Client | — | Each rendered episode closes over its stable `episode.id`; the scroll-focused header remains presentation metadata only. [VERIFIED: `EpisodeReaderScreen.tsx`; `04-CONTEXT.md`] |
| Feasibility evidence and go/no-go decision | Planning/test artifact | Physical iOS and Android devices | The milestone contract explicitly makes representative device evidence the gate before downstream work. [VERIFIED: `.planning/ROADMAP.md`] |

## Standard Stack

No new package is recommended for the Expo Managed core probe. Use the versions already installed and locked by the project. [VERIFIED: `apps/mobile/package.json`; `package-lock.json`]

### Core

| Library | Version | Published | Purpose | Why Standard |
|---------|---------|-----------|---------|--------------|
| React Native | `0.86.0` | 2026-06-09 | Native `Text`, `TextInput`, `ScrollView`, selection events, and platform rendering | It is the project runtime and is the only approved first-pass selection surface. Registry version and date were checked in this session. [VERIFIED: npm registry; `apps/mobile/package.json`] |
| Expo | `57.0.6` (`~57.0.6`) | 2026-07-15 | Managed runtime and Expo Go device delivery | The stack artifact locks Expo Managed Workflow and Expo Go as the core feasibility path. Registry version and date were checked in this session. [VERIFIED: npm registry; `stack/tech_stack_mvp.md`] |
| React | `19.2.3` | 2025-12-11 | Component and state model | This is the installed peer runtime; no selection-specific state library is needed. Registry version and date were checked in this session. [VERIFIED: npm registry; `apps/mobile/package.json`] |
| TypeScript | `6.0.3` (`~6.0.3`) | installed | Typed selection document, range, evidence, and component contracts | Strict TypeScript is mandatory in `AGENTS.md`. [VERIFIED: `apps/mobile/package.json`; `AGENTS.md`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | `4.22.4` (`^4.22.4`) | Runs the existing Node test suite | Use for pure range/document tests and existing layout-contract regressions. [VERIFIED: `apps/mobile/package.json`] |
| Node test runner | Node `24.14.0` available | Unit tests without a mobile renderer | Use for deterministic canonical-text and range-validation cases; it cannot prove native selection. [VERIFIED: environment probe; `apps/mobile/package.json`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expo Go + React Native core | EAS development build + narrow native adapter | This is not an authorized implementation alternative yet. It becomes eligible only after recorded core NO-GO evidence and explicit user approval; EAS supports custom native code that Expo Go cannot load. [VERIFIED: `.planning/ROADMAP.md`] [CITED: https://docs.expo.dev/develop/development-builds/introduction/] |
| Native reader surface | WebView reader | Prohibited by the milestone and would replace the React Native reader rather than prove it. [VERIFIED: `.planning/REQUIREMENTS.md`; `04-CONTEXT.md`] |
| Exact range | Sentence-only action | Prohibited because selections may cross sentence boundaries and must reproduce the native highlight exactly. [VERIFIED: `04-CONTEXT.md`] |

**Installation:** none for the recommended Phase 4 core probe. Do not install `expo-dev-client`, a selection package, or a native adapter during the core plan. [VERIFIED: `.planning/ROADMAP.md`; `04-CONTEXT.md`]

## Architecture Patterns

### System Architecture Diagram

```text
Physical long-press / handle drag / scroll
                  |
                  v
      [Real EpisodeReaderScreen]
                  |
          one rendered episode
                  |
        +---------+----------+
        |                    |
        v                    v
[Text selectable probe]  [TextInput range probe]
 native handles/fidelity   native handles + {start,end}
 no public range event     physical behavior unproven
        |                    |
        +---------+----------+
                  |
                  v
 [episodeId-bound selection callback]
                  |
                  v
 [validate integer bounds and start < end]
          | invalid        | valid
          v                v
      reject/clear   canonicalText.slice(start,end)
                           |
                           v
 [escaped range + visible highlight evidence]
                           |
             +-------------+-------------+
             |                           |
             v                           v
  exact + interactions stable      mismatch / UI regression
             |                           |
             v                           v
 physical iOS + Android matrix    record NO-GO and STOP
             |                           |
             v                           v
      Phase 4 GO gate       explicit approval checkpoint
                                         |
                               optional later EAS/native work
```

The diagram is deliberately a decision flow: the phase does not automatically proceed from failed core probes into native implementation. [VERIFIED: `.planning/ROADMAP.md`]

### Recommended Project Structure

```text
apps/mobile/src/presentation/app/screens/episodeReader/
├── selection/
│   ├── episodeSelectionDocument.ts      # Pure episode-to-canonical-text mapping
│   ├── episodeSelectionDocument.test.ts # Exact text and boundary fixtures
│   ├── episodeSelectionRange.ts         # Strict offset validation/reconstruction
│   └── episodeSelectionRange.test.ts    # Empty, reversed, OOB, punctuation, Unicode
└── components/
    └── EpisodeSelectionProbe/
        ├── EpisodeSelectionProbe.tsx    # Real-reader core candidate surface
        ├── EpisodeSelectionProbe.styles.ts
        ├── EpisodeSelectionProbe.types.ts
        └── index.ts

.planning/phases/04-selection-feasibility-gate/
└── 04-FEASIBILITY-EVIDENCE.md            # Device matrix, recordings, exact ranges, verdict
```

This keeps deterministic mapping separate from the native presentation experiment and follows the repository rule that reusable UI owns a folder and public `index.ts`. [VERIFIED: `AGENTS.md`]

### Pattern 1: Episode-Owned Canonical Selection Document

**What:** Build one immutable document per episode from selectable `sentenceFrame.text` only. Insert an explicit, deterministic internal separator between frames; never include episode headings, speaker labels, controls, annotation metadata, or active-header text. The same document must drive the candidate native surface and range reconstruction so render text and offset text cannot drift. [VERIFIED: `04-CONTEXT.md`; `episode.ts`]

**When to use:** Both single-episode and multi-episode probes. In the multi-episode map, bind the callback to `episode.id` at render time. [VERIFIED: `04-CONTEXT.md`]

**Planning note:** The internal separator is part of the canonical string and must be shown escaped in evidence. D-01 permits trimming invisible whitespace only at the two outer edges, not silently removing internal separators. [VERIFIED: `04-CONTEXT.md`]

### Pattern 2: Range Event as Untrusted Boundary Input

**What:** Accept only integer offsets satisfying `0 <= start < end <= canonicalText.length`; reconstruct with `slice(start, end)` and retain both raw and edge-trimmed forms for evidence. Reject empty, reversed, fractional, stale, or out-of-bounds ranges. [CITED: https://reactnative.dev/docs/textinput#onselectionchange] [VERIFIED: `architecture/architecture_for_ai.md` trust-boundary rules]

**When to use:** Every `TextInput` selection event, including physical probe instrumentation. A stale callback must not be reinterpreted against a newly rendered episode document. [VERIFIED: `architecture/architecture_for_ai.md`; `04-CONTEXT.md`]

### Pattern 3: Candidate Matrix, Not a Premature Abstraction

Use the two candidates to answer different questions. [VERIFIED: React Native public API and installed source]

| Candidate | Proves | Cannot Be Assumed | Pass Rule |
|-----------|--------|-------------------|-----------|
| `Text selectable` with nested annotated spans | Native handles/highlight, native endpoints, nested press behavior, selection-vs-scroll behavior | Observable `{start,end}` offsets; cross-`View` selection | Baseline only unless an officially supported range mechanism is found. [CITED: https://reactnative.dev/docs/text#selectable] |
| One multiline `TextInput` per episode with `onSelectionChange` | Observable offsets within one episode | Read-only selection behavior, rich child rendering, annotation press precedence, outer ScrollView coexistence, no keyboard/layout jump, dialogue fidelity | Must pass all device and presentation cases; offset observation alone is insufficient. [CITED: https://reactnative.dev/docs/textinput#onselectionchange] |

The installed `TextInput` implementation accepts children and rejects specifying both `value` and children, but rich child rendering is not documented as the public reader API. Treat it as an experiment, not a stable fact to design around before device evidence. [VERIFIED: installed `react-native@0.86.0` `TextInput.js`] 

### Pattern 4: Evidence-Coupled Physical Test Matrix

For every case, record device model, OS version, Expo Go version, app commit, fixture ID, reader mode, owning episode ID, raw `{start,end}`, escaped reconstructed text, visible match result, and a screenshot or short screen recording showing the native highlight and handles. Screenshots alone do not prove exact offsets; logs alone do not prove the visible native range. This pairing follows the phase's exact-range and physical-evidence gate. [VERIFIED: `.planning/ROADMAP.md`; `04-CONTEXT.md`]

Minimum cases per physical platform: [VERIFIED: derived directly from D-01 through D-04 and SELC-01/02/04]

1. Select and adjust punctuation inside narration.
2. Extend across a sentence boundary.
3. Start inside, end inside, and pass through an annotated fragment.
4. Extend across narration-to-dialogue and dialogue-to-narration boundaries without selecting the speaker label.
5. Scroll normally before selection; drag handles near viewport edges; dismiss selection; scroll again.
6. Tap an annotation with no active selection; long-press/drag the same annotation while selecting; verify selection wins only while active.
7. In full-series mode, select an earlier episode while the compact header is focused on another episode; verify the callback still reports the earlier episode ID.
8. Repeat at default text size and at least one large Dynamic Type/font-scale setting; verify no clipping, duplicate overlay, or offset drift.
9. Exercise every currently usable nearby control and narration/highlight behavior from the pre-change baseline.

### Anti-Patterns to Avoid

- **Per-sentence selection surfaces:** they cannot satisfy the locked cross-sentence passage rule because each current sentence is a separate native view subtree. [VERIFIED: `EpisodeSentence.tsx`; `04-CONTEXT.md`]
- **Header-derived ownership:** `activeEpisodeIndex` is updated by scroll-focused header geometry and can differ from the episode under the user's selection. [VERIFIED: `EpisodeReaderScreen.tsx`]
- **Invisible duplicate overlay:** separately rendering selectable text over the rich reader creates two layout engines that can drift under wrapping, fonts, dialogue margins, and Dynamic Type. [VERIFIED: current reader styles; D-01/D-04]
- **Re-rendering the text tree on every handle move:** changing the native text subtree can invalidate or dismiss the native selection. Keep probe instrumentation outside the selected text tree and verify this behavior physically. [ASSUMED]
- **Clipboard polling as observation:** copy availability is not a stable selection-change event, depends on user menu action, and cannot bind the range to an owning episode reliably. [VERIFIED: React Native `Text` documents selection for copy/paste only; D-01/SELC-02]
- **Custom pan gestures and painted handles:** this violates the native-feeling endpoint decision and recreates platform text selection. [VERIFIED: D-04]
- **Treating simulator success as gate success:** the roadmap explicitly requires representative physical iOS and Android evidence. [VERIFIED: `.planning/ROADMAP.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Endpoint handles and highlight | Custom PanResponder/Gesture Handler ranges and painted handles | Platform-native selection from React Native core | D-04 makes native platform behavior the visible truth. [VERIFIED: `04-CONTEXT.md`] |
| Range geometry | Character hit-testing from `onTextLayout` line boxes | Native `TextInput.onSelectionChange` offsets if the candidate passes | `onTextLayout` reports line geometry, not the user's selected character endpoints. [CITED: https://reactnative.dev/docs/text#ontextlayout] [CITED: https://reactnative.dev/docs/textinput#onselectionchange] |
| Cross-sentence fallback | Sentence taps or whole-sentence selection | One episode-owned continuous native selection surface | Sentence-only substitution is explicitly prohibited. [VERIFIED: `.planning/REQUIREMENTS.md`; `04-CONTEXT.md`] |
| Range ownership | Scroll header state or string search across all episodes | Episode ID captured by the rendered selection surface | Duplicate text and a changing header make inference ambiguous; the phase requires selection inside any displayed episode. [VERIFIED: `EpisodeReaderScreen.tsx`; SELC-02]
| Rich-reader replacement | WebView or HTML selection bridge | Existing React Native reader plus core probe | WebView is explicitly out of scope. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| Native fallback without gate | Opportunistic native package/config plugin | Explicit approval, then a separately planned narrow adapter in an EAS development build | Expo Go has a fixed native runtime and cannot load arbitrary custom native code. [CITED: https://docs.expo.dev/develop/development-builds/introduction/] [VERIFIED: `.planning/ROADMAP.md`] |

**Key insight:** React Native core currently offers native handles and observable offsets on different public component contracts. The phase exists to prove whether one approved core surface can satisfy both halves without losing the real reader. Building custom selection before that proof would bypass the gate. [VERIFIED: React Native docs; `.planning/ROADMAP.md`]

## Common Pitfalls

### Pitfall 1: Declaring `selectable` a complete solution

**What goes wrong:** Native highlighting appears, but the app cannot obtain the exact selected offsets or reconstruct the passage. [CITED: https://reactnative.dev/docs/text#selectable]

**Why it happens:** `Text` exposes `selectable`, `selectionColor`, press events, and layout events, but no public selection-change event. [VERIFIED: installed `react-native@0.86.0` types/source] [CITED: https://reactnative.dev/docs/text]

**How to avoid:** Treat `Text selectable` as the handle/gesture baseline only. Require an observable range before GO. [VERIFIED: D-01]

**Warning signs:** The prototype can copy text, but its state never contains stable `{start,end}` and episode ID. [VERIFIED: D-01/SELC-02]

### Pitfall 2: Making every sentence independently selectable

**What goes wrong:** A user cannot extend one selection across sentences or narration/dialogue view boundaries. [VERIFIED: current `EpisodeSentence` tree; D-02]

**Why it happens:** Native selection belongs to a native text container; the current reader creates a separate `View`/text subtree for each sentence. This is an inference from the documented nested-Text versus View-container behavior. [CITED: https://reactnative.dev/docs/text#containers] [VERIFIED: `EpisodeSentence.tsx`]

**How to avoid:** A passing candidate needs one continuous selection container per episode, not per sentence. [VERIFIED: D-02]

**Warning signs:** Handles stop at the end of one sentence or selecting the next sentence replaces the first highlight. [VERIFIED: D-02]

### Pitfall 3: Letting `TextInput` semantics change the reader

**What goes wrong:** The keyboard appears, text becomes editable, Android resizes the edge-to-edge screen, the inner input scrolls instead of the reader, or dialogue/annotation visuals are flattened. React Native explicitly warns that Android selection in an input can change `windowSoftInputMode` to `adjustResize`. [CITED: https://reactnative.dev/docs/textinput]

**Why it happens:** `TextInput` is designed as an input control, even though it supplies the required selection offsets. [CITED: https://reactnative.dev/docs/textinput]

**How to avoid:** Probe `readOnly`, `multiline`, parent-scroll behavior, keyboard suppression, annotation taps, and rendering fidelity on both physical platforms. Reject the candidate if preventing edits or keyboard behavior also prevents native selection. [VERIFIED: D-03/D-04/SELC-04]

**Warning signs:** Soft keyboard flash, viewport jump, caret with empty selection, internal scroll, lost bubble styles, or mutation events. [CITED: https://reactnative.dev/docs/textinput]

### Pitfall 4: Using display state as episode ownership

**What goes wrong:** Selecting an earlier episode is attributed to whichever episode title is currently compacted in the header. [VERIFIED: `EpisodeReaderScreen.tsx`; SELC-02]

**Why it happens:** `activeEpisodeIndex` is intentionally updated from measured header positions during scrolling. [VERIFIED: `EpisodeReaderScreen.tsx`; `episodeReaderHeaderMotion.ts`]

**How to avoid:** Capture `episode.id` in the selection surface callback and store `{ episodeId, start, end }` together. [VERIFIED: `04-CONTEXT.md`]

**Warning signs:** The evidence episode ID changes when the header changes but the native highlight remains in place. [VERIFIED: SELC-02]

### Pitfall 5: Normalizing away mismatches

**What goes wrong:** Lowercasing, collapsing whitespace, trimming punctuation, or searching by selected text makes an incorrect range appear correct. [VERIFIED: D-01]

**Why it happens:** Human-visible text often looks equivalent after normalization even when offsets or punctuation differ. [VERIFIED: D-01]

**How to avoid:** Compare `canonicalText.slice(start,end)` exactly. Preserve raw text and show escaped internal whitespace; only a separately reported outer-edge trim is permitted. [VERIFIED: D-01]

**Warning signs:** Pass logic uses `.trim()` before slicing, regex whitespace collapse, case-insensitive `indexOf`, or annotation surface-text search as the range source. [VERIFIED: D-01]

### Pitfall 6: Annotation press wins over selection

**What goes wrong:** Long-pressing an annotated word opens `TranslationSheet` instead of starting/adjusting selection, or the annotated span becomes a gap. [VERIFIED: `EpisodeSentence.tsx`; D-03]

**Why it happens:** Annotated chunks currently own nested `Text.onPress`, and the complete sentence is wrapped in `JellyPressable`. [VERIFIED: `EpisodeSentence.tsx`]

**How to avoid:** Test tap and long-press separately. While a non-empty selection is active, suppress annotation opening; after dismissal, a normal tap must still open the annotation. Remove or neutralize responder wrappers only as narrowly as the passing native surface requires. [VERIFIED: D-03]

**Warning signs:** `TranslationSheet` appears during handle drag, annotations cannot be selected through, or selection disables annotation taps permanently. [VERIFIED: D-03]

### Pitfall 7: Evidence that cannot be audited

**What goes wrong:** A note says “works on iPhone/Android” without device versions, visible handles, exact offsets, owning episode, or reconstructed text. [VERIFIED: `.planning/ROADMAP.md`; D-01]

**Why it happens:** Manual testing is treated as a final checkbox instead of a first-class deliverable. [VERIFIED: Phase 4 gate]

**How to avoid:** Make `04-FEASIBILITY-EVIDENCE.md` and linked screen recordings explicit plan outputs; require every matrix row before GO. [VERIFIED: Phase 4 gate]

**Warning signs:** Only simulator screenshots, only console output, or missing earlier-episode cases. [VERIFIED: SELC-02/SELC-04]

### Pitfall 8: Assuming narration is already wired in this screen

**What goes wrong:** The plan claims narration/audio regression coverage that the current screen cannot exercise. [VERIFIED: codebase grep]

**Why it happens:** `AudioControls` and an `AudioNarrator` adapter exist, but `EpisodeReaderScreen` currently passes `isActive={false}`, `isDimmed={false}`, and `onSelectSentence={() => undefined}`, and does not render `AudioControls`. [VERIFIED: `EpisodeReaderScreen.tsx`; `AudioControls.tsx`; `localAppServices.ts`]

**How to avoid:** Record the actual physical-device baseline before editing and resolve with the user/planner whether “preserve narration” means preserve dormant interfaces/styles or requires a separately scoped repair. Do not silently add audio work to this phase. [VERIFIED: `AGENTS.md` contradiction rule]

**Warning signs:** Phase 4 expands into implementing narration or marks narration “passed” without an executable baseline. [VERIFIED: phase scope; `AGENTS.md`]

## Code Examples

Verified patterns from project contracts and official React Native APIs:

### Strict range reconstruction

```typescript
// Source: Phase 4 D-01/D-02 and the current Episode sentence-frame contract.

// EpisodeSelectionRange is the validated non-empty native range for one episode document.
export type EpisodeSelectionRange = {
  readonly start: number;
  readonly end: number;
};

// reconstructEpisodeSelection rejects stale or malformed native offsets before slicing canonical text.
export function reconstructEpisodeSelection(
  canonicalText: string,
  range: EpisodeSelectionRange,
): string | undefined {
  const hasIntegerOffsets: boolean =
    Number.isInteger(range.start) && Number.isInteger(range.end);
  const isWithinDocument: boolean =
    range.start >= 0 && range.start < range.end && range.end <= canonicalText.length;

  return hasIntegerOffsets && isWithinDocument
    ? canonicalText.slice(range.start, range.end)
    : undefined;
}
```

This preserves JavaScript string offsets without case, punctuation, or internal-whitespace normalization. [VERIFIED: D-01]

### Episode-bound `TextInput` observation probe

```typescript
// Source: https://reactnative.dev/docs/textinput#onselectionchange

import type { ReactElement } from 'react';
import { TextInput } from 'react-native';
import type { TextInputSelectionChangeEvent } from 'react-native';

// EpisodeRangeProbeProps binds every emitted range to the episode that owns the native surface.
type EpisodeRangeProbeProps = {
  readonly canonicalText: string;
  readonly episodeId: string;
  readonly onRangeChange: (
    episodeId: string,
    start: number,
    end: number,
  ) => void;
};

// EpisodeRangeProbe is an experiment; physical evidence must prove read-only selection and scroll coexistence.
export function EpisodeRangeProbe({
  canonicalText,
  episodeId,
  onRangeChange,
}: EpisodeRangeProbeProps): ReactElement {
  // handleSelectionChange forwards native offsets without deriving ownership from reader header state.
  function handleSelectionChange(event: TextInputSelectionChangeEvent): void {
    const { start, end } = event.nativeEvent.selection;
    onRangeChange(episodeId, start, end);
  }

  return (
    <TextInput
      multiline
      readOnly
      scrollEnabled={false}
      value={canonicalText}
      onSelectionChange={handleSelectionChange}
    />
  );
}
```

Do not treat this minimal probe as the final reader: it proves the offset event but not rich dialogue, annotations, Dynamic Type, or gesture compatibility. Those are physical pass criteria. [VERIFIED: D-02 through D-04]

### Multi-episode ownership

```typescript
// Source: current EpisodeReaderScreen map and SELC-02.

{episodes.map((episode: Episode): ReactElement => (
  <EpisodeSelectionProbe
    episode={episode}
    key={episode.id}
    onRangeChange={(start: number, end: number): void => {
      recordObservedRange({ episodeId: episode.id, start, end });
    }}
  />
))}
```

The callback closes over the rendered episode ID; it does not read `activeEpisodeIndex`. [VERIFIED: SELC-02; current reader map]

## State of the Art

| Old/insufficient approach | Current relevant approach | When confirmed | Impact |
|---------------------------|---------------------------|----------------|--------|
| Assuming `Text selectable` also reports selected text | `Text` provides native selection/copy; `TextInput` provides the documented range callback | React Native docs checked 2026-07-17; installed RN 0.86 inspected | The plan must test a surface that combines native behavior and observable offsets; enabling `selectable` alone cannot pass D-01. [CITED: https://reactnative.dev/docs/text] [CITED: https://reactnative.dev/docs/textinput] |
| Treating Expo Go as extensible native runtime | Expo Go has a fixed native library set; custom native code requires a development build | Expo docs updated 2026-05/06 | Core probe stays in Expo Go; native fallback requires an EAS development build and explicit approval. [CITED: https://docs.expo.dev/develop/development-builds/introduction/] |
| Testing component logic only | Device/user-perspective tests cover native runtime behavior; this phase further requires physical devices | React Native testing docs plus Phase 4 roadmap | Unit tests protect mapping, but cannot award GO. [CITED: https://reactnative.dev/docs/0.77/testing-overview] [VERIFIED: `.planning/ROADMAP.md`] |

**Deprecated/outdated for this phase:**

- Treating the browser design-system HTML as selectable production code is invalid; HTML artifacts are references only and WebView is prohibited. [VERIFIED: `AGENTS.md`; `.planning/REQUIREMENTS.md`]
- A custom native adapter in the current core plan is unauthorized. It is a conditional follow-up only after NO-GO evidence and explicit approval. [VERIFIED: `.planning/ROADMAP.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Re-rendering the selected text subtree during handle movement may invalidate native selection. | Architecture anti-patterns | The probe might over-constrain instrumentation; physical testing must confirm whether external state updates are safe. |
| A2 | A core candidate that passes only by relying on undocumented rich `TextInput` children may still require a human supportability decision. | Open Questions | The planner could incorrectly declare GO from empirical behavior that is not a documented public contract, or reject a viable pinned-runtime solution too early. |

All other implementation and gate claims above were verified against project artifacts, inspected source, official documentation, or the current environment. A1 and A2 must not become locked decisions without device evidence or explicit human resolution. [VERIFIED: research provenance audit]

## Open Questions

1. **Which representative physical devices and OS versions are available?**
   - What we know: the stack names an iPhone via Expo Go, and the gate requires physical iOS and Android. [VERIFIED: `stack/tech_stack_mvp.md`; `.planning/ROADMAP.md`]
   - What's unclear: no device model, OS version, Android device, or Expo Go installation is discoverable from the Windows workspace. [VERIFIED: environment audit]
   - Recommendation: the first plan checkpoint must record at least one physical iPhone and one physical Android device, their OS/Expo Go versions, and who will execute the matrix. Stop if either platform is unavailable. [VERIFIED: Phase 4 gate]

2. **What is the accepted baseline for narration in this gate?**
   - What we know: the phase contract says narration/highlighting must not degrade, but the live reader currently hard-codes inactive sentence state and does not render its existing `AudioControls`. [VERIFIED: `04-CONTEXT.md`; `EpisodeReaderScreen.tsx`]
   - What's unclear: whether the user expects Phase 4 only to preserve dormant seams or to test an interaction available in another intended flow. [VERIFIED: code/artifact discrepancy]
   - Recommendation: baseline on a physical device before implementation and ask for direction if narration is absent; do not silently expand Phase 4. [VERIFIED: `AGENTS.md` contradiction rule]

3. **Is an undocumented rich-children `TextInput` implementation acceptable if it passes the device matrix?**
   - What we know: installed RN 0.86 accepts children internally, but the public docs present `TextInput` as a text input and do not document it as a rich reader surface. [VERIFIED: installed `TextInput.js`] [CITED: https://reactnative.dev/docs/textinput]
   - What's unclear: whether empirical success on the pinned runtime is sufficient for a GO, or whether reliance on this internal behavior itself requires the narrow native-adapter decision. [ASSUMED]
   - Recommendation: record this as a human checkpoint in the plan if the only passing core candidate relies on undocumented children behavior. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | lint/typecheck/test/build and Expo CLI | ✓ | `24.14.0` | — [VERIFIED: environment probe] |
| npm | project scripts | ✓ | `11.9.0` | — [VERIFIED: environment probe] |
| Local Expo CLI | Expo Go core probe | ✓ | `57.0.8` | Project-local binary in `apps/mobile/node_modules/.bin`. [VERIFIED: environment probe] |
| Expo account | Expo tooling | ✓ | authenticated as `gamshik-k` | — [VERIFIED: `expo whoami`] |
| Physical iOS device with compatible Expo Go | Gate evidence | ? | not discoverable | None; simulator evidence cannot pass the gate. [VERIFIED: `.planning/ROADMAP.md`] |
| Physical Android device with compatible Expo Go | Gate evidence | ? | not discoverable | None; emulator evidence cannot pass the gate. [VERIFIED: `.planning/ROADMAP.md`] |
| Android Debug Bridge | USB/device inspection | ✗ | — | Expo Go QR/LAN can run the core probe without ADB; device metadata must be recorded manually. [CITED: https://docs.expo.dev/develop/development-builds/use-development-builds/] |
| Java/JDK | Local Android native build | ✗ | — | Not needed for Expo Go. Native fallback is not authorized; EAS would be the later Windows-compatible route. [CITED: https://docs.expo.dev/develop/development-builds/create-a-build/] |
| EAS CLI and `eas.json` | Conditional native fallback | ✗ | — | Do not install/configure until explicit approval. [VERIFIED: environment probe; Phase 4 gate] |
| Paid Apple Developer account | Conditional physical iOS development build | ? | not discoverable | EAS physical iPhone builds require signing; no Windows local-build fallback. [CITED: https://docs.expo.dev/develop/development-builds/create-a-build/] |

**Missing dependencies with no fallback:**

- Confirmed access to representative physical iOS and Android devices is required before the gate can execute; this remains unresolved. [VERIFIED: Phase 4 gate; environment audit]

**Missing dependencies with fallback:**

- ADB and Java are absent, but the authorized core experiment can run through Expo Go QR/LAN. [VERIFIED: environment audit] [CITED: https://docs.expo.dev/develop/development-builds/use-development-builds/]
- EAS tooling is absent by design; it is conditional on an explicit post-NO-GO approval. [VERIFIED: Phase 4 gate]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node test runner through `tsx 4.22.4` [VERIFIED: `apps/mobile/package.json`] |
| Config file | none; script glob is declared in `apps/mobile/package.json` [VERIFIED: codebase scan] |
| Quick run command | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts"` [VERIFIED: existing test runner pattern] |
| Full suite command | `cd apps/mobile && npm test` [VERIFIED: `apps/mobile/package.json`] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SELC-01 | Canonical episode document contains narration/dialogue only; valid non-empty offsets reconstruct exact characters | unit + physical manual | `npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts"` | ❌ Wave 0 |
| SELC-02 | Range event retains rendered episode owner and ignores active header | unit/structural + physical manual | `npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts"` plus existing `src/presentation/theme/layout.test.ts` in full suite | ❌ Wave 0 |
| SELC-04 | Handles, adjustment, scrolling, annotation tap precedence, reader controls, and Dynamic Type work on both physical platforms | physical manual gate | No automated command can substitute; `npm test` protects deterministic/static regressions only | manual-only by requirement |

React Native describes E2E checks as running from the user's perspective on a device or simulator, but this phase's roadmap deliberately requires physical devices, which is stricter than the generic E2E definition. [CITED: https://reactnative.dev/docs/0.77/testing-overview] [VERIFIED: `.planning/ROADMAP.md`]

### Sampling Rate

- **Per task commit:** run the new selection unit files plus `npm run typecheck`. [VERIFIED: `AGENTS.md`; existing scripts]
- **Per wave merge:** run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` from `apps/mobile`. [VERIFIED: `AGENTS.md`; `apps/mobile/package.json`]
- **Phase gate:** all automated commands green and every required physical iOS/Android evidence row complete with a single explicit GO or NO-GO verdict. [VERIFIED: `.planning/ROADMAP.md`]

### Wave 0 Gaps

- [ ] `src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts` — frame inclusion/exclusion, separators, annotations, repeated text, punctuation.
- [ ] `src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts` — valid/empty/reversed/fractional/out-of-bounds/stale/Unicode ranges.
- [ ] `04-FEASIBILITY-EVIDENCE.md` — physical device metadata, scenario matrix, linked recordings/screenshots, exact escaped ranges, and verdict.
- [ ] A deterministic real-reader fixture path that loads at least two episodes with narration, dialogue, repeated annotated words, punctuation, interactions, and enough text to scroll; it must use synthetic content rather than user episodes. [VERIFIED: D-01 through D-04; security constraint]

No mobile component test or E2E harness currently exists, so adding one solely for this feasibility phase would not replace physical proof and is not recommended. [VERIFIED: codebase scan; Phase 4 gate]

## Security Domain

OWASP ASVS is primarily an application-security verification standard for web applications and services; this local presentation gate does not add authentication, sessions, access control, cryptography, persistence, or a network boundary. [CITED: https://github.com/OWASP/ASVS] The relevant control is strict validation of native selection offsets and safe handling of evidence data. [VERIFIED: `architecture/architecture_for_ai.md`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth behavior changes in this phase. [VERIFIED: phase scope] |
| V3 Session Management | no | Selection probe state is local and ephemeral; persistence is out of scope. [VERIFIED: phase scope; milestone requirements] |
| V4 Access Control | no | No protected resource or backend action is added. [VERIFIED: phase scope] |
| V5 Input Validation | yes | Validate native offsets as finite integers, enforce ordered in-bounds non-empty range, bind them to an existing episode/document revision, and reject stale events. [VERIFIED: `architecture/architecture_for_ai.md`; D-01] |
| V6 Cryptography | no | No cryptographic operation or secret is introduced. [VERIFIED: phase scope] |

### Known Threat Patterns for React Native Selection Probe

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/stale native offsets produce wrong or out-of-bounds passage | Tampering | Strict integer/bounds/document-revision validation before `slice`. [VERIFIED: architecture trust-boundary rule] |
| Evidence captures raw user-created episode passages | Information Disclosure | Use synthetic fixtures; never persist or commit real selected passages or production console logs. [VERIFIED: milestone SAFE-03 direction; `AGENTS.md` untrusted-data rules] |
| Debug probe ships as a hidden production interaction | Elevation of functionality / information disclosure | Keep instrumentation explicitly development-only and remove or gate it before GO handoff; evidence artifact stores only synthetic fixture text. [VERIFIED: phase scope] |

## Project Constraints (from AGENTS.md)

The planner must verify these directives in every Phase 4 task. [VERIFIED: `AGENTS.md`]

- Follow artifact precedence: PRD for product scope, stack for technical constraints, `architecture_for_ai.md` for boundaries, and design artifacts for presentation. HTML files are references, not production code. Stop and ask if artifacts conflict. [VERIFIED: `AGENTS.md`]
- Do not add features, dependencies, architectural layers, abstractions, or backlog work beyond the selection feasibility gate. Preserve the AI-series loop and do not reintroduce flashcard/SRS mechanics. [VERIFIED: `AGENTS.md`]
- Stay in Expo Managed Workflow; do not create or modify committed `ios/` or `android/` projects. Native fallback requires the roadmap's separate explicit decision. [VERIFIED: `AGENTS.md`; `.planning/ROADMAP.md`]
- Use strict TypeScript; avoid `any`; validate all external/native event data at boundaries. [VERIFIED: `AGENTS.md`]
- Keep presentation free of persistence, Supabase, sync, SDK, AI prompt, and domain business rules. Components render state and forward intent through focused contracts. [VERIFIED: `AGENTS.md`; `architecture_for_ai.md`]
- Keep files/functions/components/hooks/types/modules focused; no god files, duplicated logic, dead code, speculative abstractions, or mixed UI/business/data concerns. [VERIFIED: `AGENTS.md`]
- Reusable UI must live in its own folder with component, non-trivial styles, types/helpers as needed, and `index.ts`; other modules import through public exports and configured path aliases rather than deep relative chains. [VERIFIED: `AGENTS.md`]
- Explicit TypeScript annotations are mandatory for functions, components, hooks, parameters, returns, exported constants, public contracts, shared types/DTOs/schemas, and important intermediates; each explicit annotation requires an English comment explaining the contract or protected rule. [VERIFIED: `AGENTS.md`]
- Comments must be English and explain non-obvious constraints, trust boundaries, workarounds, or public contracts; do not comment obvious code. [VERIFIED: `AGENTS.md`]
- Tests are required for non-trivial range logic, validation, critical reader behavior, and practical regressions; tests must protect observable behavior rather than inflate coverage. [VERIFIED: `AGENTS.md`]
- Deliberately handle loading/empty/success/error states where changed, and preserve accessibility, responsive layout, light/dark themes, shared background, dimensional Bubble/Sorbet surfaces, typography, and restrained motion. [VERIFIED: `AGENTS.md`; `design_system_guidelines.md`]
- Reader text must prioritize legibility; dialogue accents and annotations must not overpower or fragment the story, and Dynamic Type/font scaling must not be disabled to make the probe pass. [VERIFIED: `design_system_guidelines.md`; D-03/D-04]
- Never hardcode secrets or add client LLM calls. No backend, persistence, sync, or Oxford data changes are part of this phase. [VERIFIED: `AGENTS.md`; phase scope]
- Before completion, identify and run canonical lint, typecheck, build, and relevant tests; report exact results and do not claim device feasibility without device evidence. [VERIFIED: `AGENTS.md`; Phase 4 gate]
- Preserve unrelated dirty worktree changes; commit only coherent Phase 4 artifacts with an English Conventional Commit message. [VERIFIED: `AGENTS.md`; current git status]

## Sources

### Primary (HIGH confidence)

- `04-CONTEXT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — exact selection rules, phase boundary, and stop/go gate.
- `AGENTS.md`, `concept/prd_concept_mvp.md`, `stack/tech_stack_mvp.md`, `architecture/architecture_for_ai.md`, `design/design_system_guidelines.md` — project scope, Expo boundary, architecture, and reader presentation constraints.
- Installed `react-native@0.86.0` source and types — exact exported `Text`/`TextInput` props and native selectable-text routing checked against the pinned runtime.
- Current reader source: `EpisodeReaderScreen.tsx`, `EpisodeSentence.tsx`, `episodeReaderText.ts`, `episode.ts`, reader styles, and layout tests — real composition and ownership seams.

### Secondary (MEDIUM confidence)

- https://reactnative.dev/docs/text — `selectable`, nested text, container behavior, layout events, and font scaling.
- https://reactnative.dev/docs/textinput — `onSelectionChange`, `readOnly`, selection props, responder behavior, and Android resize warning.
- https://docs.expo.dev/develop/development-builds/introduction/ — fixed Expo Go native runtime and custom native-code boundary; updated 2026-05-23.
- https://docs.expo.dev/develop/development-builds/create-a-build/ — EAS device-build requirements from Windows; updated 2026-06-29.
- https://docs.expo.dev/develop/development-builds/use-development-builds/ — physical-device development-build workflow; updated 2026-06-03.
- https://reactnative.dev/docs/0.77/testing-overview — distinction between static/unit checks and device-level E2E evidence.
- https://github.com/OWASP/ASVS — ASVS scope and current stable-version context.

### Tertiary (LOW confidence)

- None used as authoritative implementation evidence.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions were read from the installed manifest/source and verified against npm registry publication metadata.
- Architecture: HIGH — component boundaries and ownership behavior were traced in the live reader and locked project artifacts.
- Core feasibility outcome: MEDIUM — API capabilities are verified, but read-only `TextInput` selection, rich composition, gestures, and exact range stability remain intentionally unproven until physical iOS/Android runs.
- Pitfalls: MEDIUM — most follow directly from public API/code structure; the re-render/selection interaction remains an explicit assumption for device validation.

**Research date:** 2026-07-17
**Valid until:** 2026-08-16 for the pinned Expo 57 / React Native 0.86 stack; repeat API/source review after any runtime upgrade.
