# Phase 04: Selection Feasibility Gate - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 12 new/modified files
**Analogs found:** 11 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.ts` | utility | transform | `apps/mobile/src/presentation/app/screens/episodeReader/episodeReaderText.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts` | test | transform | `apps/mobile/src/presentation/app/screens/episodeReader/episodeInteractionPresentation.test.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.ts` | utility | transform | `apps/mobile/src/presentation/app/screens/episodeReader/episodeReaderText.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts` | test | transform | `apps/mobile/src/presentation/app/screens/episodeReader/episodeInteractionPresentation.test.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionFixture.ts` | config | batch | none | none |
| `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSelectionProbe/EpisodeSelectionProbe.tsx` | component | event-driven | `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSentence/EpisodeSentence.tsx` | role-match |
| `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSelectionProbe/EpisodeSelectionProbe.styles.ts` | config | transform | `apps/mobile/src/presentation/app/screens/episodeReader/components/StoryContinuationPrelude/StoryContinuationPrelude.styles.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSelectionProbe/EpisodeSelectionProbe.types.ts` | model | event-driven | `apps/mobile/src/presentation/app/shared/BubbleSlider/BubbleSlider.types.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSelectionProbe/index.ts` | config | transform | `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSentence/index.ts` | exact |
| `apps/mobile/src/presentation/app/screens/episodeReader/components/index.ts` | config | transform | same file's existing barrel exports | exact |
| `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx` | component | event-driven | existing episode map and focused-header integration in the same file | exact |
| `.planning/phases/04-selection-feasibility-gate/04-FEASIBILITY-EVIDENCE.md` | test | batch | `.planning/phases/04-selection-feasibility-gate/04-VALIDATION.md` | role-match |

The fixture filename is inferred from the research requirement for a deterministic real-reader fixture; research leaves its concrete path to the planner. If the planner chooses a route-level or service-injected fixture instead, preserve the same classification and development-only boundary.

## Pattern Assignments

### `selection/episodeSelectionDocument.ts` (utility, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/episodeReaderText.ts`

**Imports and public-contract pattern** (lines 1-25):

```typescript
import type { TranslationAnnotation } from '@domain/index';

// SentenceTextChunk is a renderable part of a sentence with optional hint data.
export type SentenceTextChunk = {
  // text is the exact visible sentence fragment.
  readonly text: string;
  // annotation is present when the fragment can open an inline translation hint.
  readonly annotation?: TranslationAnnotation;
};

// buildSentenceTextChunks marks known translation surfaces inside one sentence.
export function buildSentenceTextChunks({
  annotations,
  sentence,
  sentenceIndex,
}: {
  // annotations are trusted hints from the validated episode payload.
  readonly annotations: readonly TranslationAnnotation[];
  // sentence is the current validated sentence text.
  readonly sentence: string;
  // sentenceIndex scopes annotation lookup without parsing full scene text.
  readonly sentenceIndex: number;
}): readonly SentenceTextChunk[] {
```

Copy the local pure-function shape, `@domain/index` type-only import, immutable `readonly` output, explicit return annotation, and an English contract comment for every annotated member. For Phase 4, accept `Episode` or `readonly EpisodeSentenceFrame[]`, use only `frame.text`, and make the internal separator an exported/documented constant if tests and evidence need it.

**Exact-source preservation pattern** (lines 46-70):

```typescript
if (matchIndex > cursor) {
  chunks.push({
    id: `${sentenceIndex}:plain:${cursor}`,
    text: sentence.slice(cursor, matchIndex),
  });
}

const endIndex = matchIndex + annotation.surfaceText.length;

chunks.push({
  annotation,
  id: `${sentenceIndex}:hint:${matchIndex}`,
  text: sentence.slice(matchIndex, endIndex),
});
cursor = endIndex;
```

Use direct concatenation/join and `slice`; do not case-fold, normalize punctuation, remove internal whitespace, or derive canonical text from labels, annotations, `sceneText`, or active-header state.

---

### `selection/episodeSelectionDocument.test.ts` (test, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/episodeInteractionPresentation.test.ts`

**Test structure** (lines 1-16):

```typescript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldRenderSettledEpisodeAnswer } from './episodeInteractionPresentation';

describe('shouldRenderSettledEpisodeAnswer', (): void => {
  it('keeps a reopened reader in generation state after a new choice', (): void => {
    assert.equal(
      shouldRenderSettledEpisodeAnswer({
        hasFeedback: false,
        hasSavedAnswer: true,
        isReadOnly: true,
        isSubmitting: true,
      }),
      false,
    );
  });
});
```

Use Node's built-in runner and strict assertions, colocate the test with the utility, and annotate callbacks with `(): void`. Cover narration/dialogue inclusion, deterministic separators, exclusion of title/speaker/control/annotation metadata, repeated text, punctuation, Unicode, and immutability of the input fixture.

---

### `selection/episodeSelectionRange.ts` (utility, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/episodeReaderText.ts`

**Boundary handling pattern** (lines 30-43, 63-70):

```typescript
if (sentenceAnnotations.length === 0) {
  return [{ id: `${sentenceIndex}:plain`, text: sentence }];
}

sentenceAnnotations.forEach((annotation) => {
  const matchIndex = sentence
    .toLocaleLowerCase()
    .indexOf(annotation.surfaceText.toLocaleLowerCase(), cursor);

  if (matchIndex < 0) {
    return;
  }
});

if (cursor < sentence.length) {
  chunks.push({
    id: `${sentenceIndex}:plain:${cursor}`,
    text: sentence.slice(cursor),
  });
}
```

Follow the pure early-return pattern, but apply stricter validation than the annotation helper: require finite integer offsets, `0 <= start < end <= document.text.length`, matching episode/document identity or revision, then return `document.text.slice(start, end)`. Return a typed rejection (`undefined` or a focused discriminated result) for empty, reversed, fractional, out-of-bounds, or stale ranges; never clamp or normalize an invalid event.

---

### `selection/episodeSelectionRange.test.ts` (test, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/episodeInteractionPresentation.test.ts`

Use the same imports and `describe`/`it` layout shown above. The observable matrix must include valid punctuation, start `0`, end `text.length`, empty, reversed, negative, fractional, `NaN`/infinite, out-of-bounds, stale document revision, repeated text, and Unicode/UTF-16 offsets. Assert the exact raw substring; only separately assert the allowed outer-edge-trimmed evidence form.

---

### `selection/episodeSelectionFixture.ts` (config, batch)

**Analog:** none. The codebase has unit-test fixtures but no development-only real-reader fixture path.

The closest data-shape reference is `apps/mobile/src/application/useCases/loadEpisodeReader.test.ts` lines 9-33:

```typescript
// timestamp is the deterministic version for the reader lookup fixture.
const timestamp = '2026-07-16T12:00:00.000Z';

// episode keeps a legacy URL-sensitive id to prove routing no longer depends on it.
const episode: Episode = {
  id: 'episode:series:test:generation:episode%3Aseries:test:123:1',
  seriesId: 'series:test',
  orderIndex: 2,
  sceneText: 'Mira opened the second door.',
  sentences: ['Mira opened the second door.'],
  sentenceFrames: [
    { kind: 'narration', text: 'Mira opened the second door.' },
  ],
  storyWordIds: [],
  annotations: [],
  interactions: [],
  isComplete: false,
  summaryUpdate: 'Mira opened the second door.',
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'episode:test',
  },
};
```

Build at least two fully typed synthetic `Episode` objects with stable IDs/timestamps, narration, dialogue, repeated annotated words, punctuation, interactions, and enough content to scroll. Do not copy real user episodes or persist the fixture. Gate any reader injection explicitly to development/feasibility use so the probe cannot silently ship as production behavior.

---

### `components/EpisodeSelectionProbe/EpisodeSelectionProbe.tsx` (component, event-driven)

**Primary analog:** `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSentence/EpisodeSentence.tsx`

**Imports and typed component contract** (lines 1-12, 59-70):

```typescript
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { EpisodeSentenceFrame, TranslationAnnotation } from '@domain/index';
import { JellyPressable } from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';

import { buildSentenceTextChunks } from '../../episodeReaderText';
import type { SentenceTextChunk } from '../../episodeReaderText';

// EpisodeSentence renders one sentence with dimming and tappable hint fragments.
export function EpisodeSentence({
  annotations,
  sentenceFrame,
  sentenceIndex,
  styles,
  onPressAnnotation,
  onSelectSentence,
}: EpisodeSentenceProps): ReactElement {
```

Use React Native and alias imports for cross-area modules, relative imports only within the local reader feature, a typed `ReactElement` return, and a focused props contract imported from the local `.types.ts` file.

**Rich-text/annotation seam to preserve** (lines 169-232):

```typescript
function SentenceText({
  annotations,
  sentenceIndex,
  styles,
  text,
  variant,
  onPressAnnotation,
}: SentenceTextProps): ReactElement {
  const chunks = buildSentenceTextChunks({
    annotations,
    sentence: text,
    sentenceIndex,
  });

  return (
    <Text style={[styles.readerSentenceText, variant === 'dialogue' && styles.readerDialogueText]}>
      {chunks.map((chunk) => (
        <SentenceTextFragment
          chunk={chunk}
          key={chunk.id}
          styles={styles}
          onPressAnnotation={onPressAnnotation}
        />
      ))}
    </Text>
  );
}

if (annotation) {
  return (
    <Text onPress={() => onPressAnnotation(annotation)} style={styles.readerAnnotatedWord}>
      {chunk.text}
    </Text>
  );
}
```

The probe must preserve the exact visible text and annotated fragments while experimenting with one episode-owned native selectable container. Native selection events are untrusted input: forward stable episode/document ownership plus raw offsets to the range utility. Do not derive ownership from `activeEpisodeIndex`, persist selected text, or call services. Annotation press should work when no selection is active and yield to selection gestures while a range is active.

---

### `components/EpisodeSelectionProbe/EpisodeSelectionProbe.styles.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/components/StoryContinuationPrelude/StoryContinuationPrelude.styles.ts`

**Local style contract** (lines 1-8, 43-54):

```typescript
import { StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import type { AppColors } from '@presentation/theme';
import { fontFamilies, radii } from '@presentation/theme';

// StoryContinuationPreludeStyles defines the complete visual contract for the inline generation cue.
export type StoryContinuationPreludeStyles = {
  readonly container: ViewStyle;
};

// createStoryContinuationPreludeStyles maps semantic theme colors to the local generation cue.
export function createStoryContinuationPreludeStyles(
  colors: AppColors,
): StoryContinuationPreludeStyles {
  return StyleSheet.create<StoryContinuationPreludeStyles>({
    container: {
      gap: 9,
      marginTop: 10,
      overflow: 'hidden',
      paddingHorizontal: 2,
      paddingVertical: 10,
    },
  });
}
```

Use semantic theme tokens and typed `StyleSheet.create`; preserve Dynamic Type by not setting `allowFontScaling={false}` or fixed heights around story text. Keep selection diagnostics visually subordinate to the reader and avoid duplicating global `AppStyles` unless the experiment truly requires local styles.

---

### `components/EpisodeSelectionProbe/EpisodeSelectionProbe.types.ts` (model, event-driven)

**Analog:** `apps/mobile/src/presentation/app/shared/BubbleSlider/BubbleSlider.types.ts`

**Controlled interaction contract** (lines 3-30):

```typescript
// BubbleSliderProps exposes a bounded, step-based value control without owning persistence.
export type BubbleSliderProps = {
  // value is the externally persisted setting value.
  readonly value: number;
  // onValueChange reports transient drag values before persistence.
  readonly onValueChange?: ((value: number) => void) | undefined;
  // onInteractionStart lets parent scroll containers pause while dragging.
  readonly onInteractionStart?: (() => void) | undefined;
  // onInteractionEnd lets parent scroll containers resume after dragging.
  readonly onInteractionEnd?: (() => void) | undefined;
};
```

Define immutable props that receive canonical episode data and report a typed observed range upward. Keep event ownership explicit (`episodeId`, document revision/id, start, end); do not let the component own persistence or infer current episode from screen state.

---

### `components/EpisodeSelectionProbe/index.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSentence/index.ts` line 1:

```typescript
export * from './EpisodeSentence';
```

Export the public component and any intentionally public types from the folder entry point. Other reader modules should import through this index, not `EpisodeSelectionProbe/EpisodeSelectionProbe.tsx`.

---

### `components/index.ts` (config, transform)

**Analog:** the existing file, lines 1-4:

```typescript
export * from './AudioControls';
export * from './EpisodeSentence';
export * from './StoryContinuationPrelude';
export * from './TranslationSheet';
```

Add `export * from './EpisodeSelectionProbe';` and keep `EpisodeReaderScreen` importing from `./episodeReader/components`. This is required by the repository's public component export rule.

---

### `EpisodeReaderScreen.tsx` (component, event-driven)

**Analog:** the existing integration target.

**Public barrel import pattern** (lines 26-49):

```typescript
import type {
  Episode,
  EpisodeSentenceFrame,
  EpisodeInteraction,
  TranslationAnnotation,
} from '@domain/index';

import {
  EpisodeSentence,
  StoryContinuationPrelude,
  TranslationSheet,
} from './episodeReader/components';
```

Import the probe from the component barrel. Do not add persistence, Supabase, audio adapters, or native-module dependencies to the selection seam.

**Episode-owned map and header separation** (lines 549-580):

```typescript
{episodes.map((episode, episodeIndex) => {
  const isLastEpisode = episodeIndex === episodes.length - 1;
  const renderedFrames = buildReaderSentenceFrames(episode.sentenceFrames);

  return (
    <View
      key={episode.id}
      style={styles.readerEpisodeBlock}
      onLayout={(event: LayoutChangeEvent): void =>
        handleEpisodeBlockLayout(episode.id, event)
      }
    >
      {!isSingleEpisode ? (
        <View style={styles.readerEpisodeHeading}>
          <Text style={styles.readerEpisodeBadge}>EPISODE {episode.orderIndex}</Text>
          <Text style={styles.readerEpisodeTitle}>{episode.title ?? 'Untitled Episode'}</Text>
        </View>
      ) : null}
```

Create one selection document/probe inside each mapped episode block and close callbacks over `episode.id`. The header remains non-selectable metadata. The existing `activeEpisodeIndex` update at lines 431-447 is scroll/header state only and must never be used as selection ownership.

**Regression surfaces** (lines 583-637, 651-670): keep the `Animated.ScrollView`, dialogue/narration rendering, annotation callback, interactions, `EpisodeReaderEdgeEffects`, and `TranslationSheet` behavior intact. Preserve a baseline for narration: the current screen explicitly passes `isActive={false}`, `isDimmed={false}`, and a no-op sentence callback at lines 602-612, so the planner must not claim live narration was tested without first resolving that artifact/code discrepancy.

---

### `04-FEASIBILITY-EVIDENCE.md` (test artifact, batch)

**Analog:** `.planning/phases/04-selection-feasibility-gate/04-VALIDATION.md`

**Evidence gate pattern** (lines 63-70):

```markdown
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Select and adjust an exact non-empty continuous passage in the single-episode reader while scrolling. | SELC-01, SELC-04 | Native selection handles, gesture arbitration, and observable offsets differ by platform and require representative hardware. | On representative physical iOS and Android devices, load the synthetic fixture, select across narration/dialogue and multiple sentences, adjust both handles, scroll, record escaped selected text plus offsets, and capture evidence. |
| Select inside any one episode in the multi-episode reader, including an earlier episode, without active-header ownership. | SELC-02, SELC-04 | Virtualization, mounted episode boundaries, and active-header changes require the real multi-episode surface on hardware. | Load at least two episodes, select within the earlier and later episode independently, scroll until the active header changes, adjust handles, and verify the emitted episode ID still owns the exact selected range. |
```

Use a table-driven artifact keyed by platform, device model, OS version, Expo Go version, app commit, fixture ID, reader mode, owning episode ID, raw `{start,end}`, escaped exact substring, visible-match result, Dynamic Type setting, interaction regression result, and linked screenshot/recording. Every iOS/Android and single/multi-reader row must be complete before a single explicit `GO` or `NO-GO`. Simulator-only evidence cannot pass. Use only synthetic fixture text and do not commit raw user content or production logs.

## Shared Patterns

### Strict TypeScript and English contract comments

**Sources:** `episodeReaderText.ts` lines 3-25; `EpisodeSentence.tsx` lines 14-37; `BubbleSlider.types.ts` lines 3-30.

Apply to every TypeScript file. Public and important local types use `readonly`; functions/components/callbacks have explicit parameter and return annotations; every explicit annotation has a nearby English comment explaining the contract or protected rule. Avoid `any` and broad inferred external/native event shapes.

### Path aliases and public exports

**Sources:** `apps/mobile/tsconfig.json` lines 3-15; `EpisodeReaderScreen.tsx` lines 26-49; `episodeReader/components/index.ts` lines 1-4.

Use `@domain/*`, `@presentation/*`, and other configured aliases across architectural areas. Use short relative imports inside the same feature. Reusable components own a folder-level `index.ts` and are re-exported from the reader component barrel.

### Native events are untrusted

**Source pattern:** `EpisodeSentence.tsx` forwards presentation intent upward instead of performing service work; the Phase 4 range utility owns integer/bounds/revision validation.

Apply to all selection callbacks. Validate before slicing; preserve raw offsets for evidence; reject invalid/stale input without clamping. Bind stable episode ownership at render time.

### Structural tests supplement, never replace, device proof

**Source:** `apps/mobile/src/presentation/theme/layout.test.ts` lines 255-318.

```typescript
// The test keeps focused episode metadata in the header for both Reader modes.
test('reader header follows focused metadata without hiding full-series headings', (): void => {
  const readerSource = readFileSync(
    resolve(__dirname, '../app/screens/EpisodeReaderScreen.tsx'),
    'utf8',
  );

  assert.match(readerSource, /const isSingleEpisode: boolean = episodes\.length === 1/);
  assert.match(readerSource, /getFocusedEpisodeHeaderIndex/);
  assert.match(readerSource, /<Animated\.ScrollView/);
  assert.match(readerSource, /<EpisodeReaderEdgeEffects/);
});
```

Add focused unit/structural assertions only for deterministic mapping, ownership wiring, preserved reader composition, and forbidden fallbacks. Physical handles, gesture arbitration, scrolling coexistence, annotation precedence, and Dynamic Type remain manual physical-device requirements.

### No new runtime dependency or native fallback

The core probe uses installed React Native primitives only. Do not add a package, WebView, committed `ios/` or `android/` projects, EAS configuration, or a native adapter. A native fallback is a separate post-`NO-GO` decision requiring explicit approval.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionFixture.ts` | config | batch | Existing fixtures live inside unit tests; there is no established development-only real-reader fixture injection pattern. Planner must choose the narrowest explicit dev-only seam and prevent production persistence or user-data capture. |

## Metadata

**Analog search scope:** `apps/mobile/src/presentation/app/screens`, `apps/mobile/src/presentation/theme`, `apps/mobile/src/application/useCases`, `apps/mobile/src/domain/models`, `.planning/phases`, archived phase validation/UAT artifacts
**Files scanned:** 250+ paths; 14 candidate files inspected; 5 strong analog families retained
**Pattern extraction date:** 2026-07-17
**Canonical verification commands for implementation:** `cd apps/mobile && npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; quick selection suite: `npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts"`
