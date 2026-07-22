import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// componentSource captures the presentation contract without requiring a native renderer.
const componentSource: string = readFileSync(
  resolve(__dirname, 'StoryContinuationPrelude.tsx'),
  'utf8',
);
// readerSource confirms the generation cue remains connected to the persisted answer flow.
const readerSource: string = readFileSync(
  resolve(__dirname, '../../../EpisodeReaderScreen.tsx'),
  'utf8',
);

test('renders the continuation prelude after a saved choice', (): void => {
  assert.match(
    readerSource,
    /isGenerating \? \([\s\S]*?<StoryContinuationPrelude \/>/,
  );
  assert.match(readerSource, /applyOptimisticChoice/);
  assert.match(readerSource, /shouldRenderSettledEpisodeAnswer/);
  assert.match(readerSource, /findPendingEpisodeContinuation\(episodes\)/);
  assert.match(readerSource, /resumePendingContinuation/);
  assert.doesNotMatch(readerSource, /InlineGenerationShimmer/);
});

test('reveals the first generated sentence without jumping to the reader end', (): void => {
  assert.match(readerSource, /requestScrollToGeneratedContent/);
  assert.match(readerSource, /handleSentenceLayout\(episode\.id, sentenceIndex, event\)/);
  assert.match(readerSource, /sentenceIndex:\s*previousSentenceCount/);
  assert.match(readerSource, /screenEdgeDepths\.readerTop \+ GENERATED_CONTENT_TOP_GAP/);

  // generatedScrollSource isolates the completed-response behavior from restored loading-state scrolling.
  const generatedScrollSource: string = readerSource.slice(
    readerSource.indexOf('// requestScrollToGeneratedContent'),
  );
  assert.doesNotMatch(generatedScrollSource, /scrollToEnd/);
});

test('reveals a restored pending continuation after its loading state is laid out', (): void => {
  assert.match(
    readerSource,
    /pendingContinuationScrollRef\.current = operationKey/,
  );
  assert.match(readerSource, /handlePendingContinuationLayout/);
  assert.match(readerSource, /onLayout=\{onGeneratingLayout\}/);
  assert.match(readerSource, /scrollToEnd\(\{ animated: true \}\)/);
});

test('keeps the first temporary continuation failure inside the loading state', (): void => {
  assert.match(readerSource, /submitInteractionWithSilentRetry/);
  assert.doesNotMatch(readerSource, /console\.error/);
  assert.doesNotMatch(readerSource, /Story interaction stopped/);
});

test('keeps the atmospheric motion accessible and optional', (): void => {
  assert.match(componentSource, /useReducedMotionPreference/);
  assert.match(componentSource, /if \(reduceMotion\)/);
  assert.match(componentSource, /accessibilityRole="progressbar"/);
  assert.match(componentSource, /accessibilityLiveRegion="polite"/);
  assert.match(componentSource, /Animated\.loop/);
});
