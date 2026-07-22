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
  assert.match(readerSource, /isGenerating \? <StoryContinuationPrelude \/>/);
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
  assert.doesNotMatch(readerSource, /scrollToEnd/);
});

test('keeps the atmospheric motion accessible and optional', (): void => {
  assert.match(componentSource, /useReducedMotionPreference/);
  assert.match(componentSource, /if \(reduceMotion\)/);
  assert.match(componentSource, /accessibilityRole="progressbar"/);
  assert.match(componentSource, /accessibilityLiveRegion="polite"/);
  assert.match(componentSource, /Animated\.loop/);
});
