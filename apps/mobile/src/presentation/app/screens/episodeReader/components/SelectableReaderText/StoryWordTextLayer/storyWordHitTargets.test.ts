import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSentenceTextChunks } from '../../../episodeReaderText';
import type { TranslationAnnotation } from '@domain/index';
import type { SentenceTextChunk } from '../../../episodeReaderText';

import {
  createStoryWordHitSegments,
  type StoryWordHitSegment,
} from './storyWordHitTargets';

// This regression protects a Story Word embedded inside a visible hyphenated phrase.
test('creates a precise target for electronic inside electronic-looking', (): void => {
  const text: string =
    "They weren't random; they formed a complex, almost electronic-looking circuit.";
  const annotation: TranslationAnnotation = {
    sentenceIndex: 0,
    surfaceText: 'electronic',
    translation: 'электронный',
    wordId: 'electronic',
  };
  const chunks: readonly SentenceTextChunk[] = buildSentenceTextChunks({
    annotations: [annotation],
    sentence: text,
    sentenceIndex: 0,
  });
  const segments: readonly StoryWordHitSegment[] = createStoryWordHitSegments({
    chunks,
    lines: [
      {
        height: 28,
        text: "They weren't random; they formed a complex,",
        x: 0,
        y: 0,
      },
      {
        height: 28,
        text: 'almost electronic-looking circuit.',
        x: 0,
        y: 28,
      },
    ],
    text,
  });

  assert.equal(segments.length, 1);
  assert.equal(segments[0]?.prefixText, 'almost ');
  assert.equal(segments[0]?.segmentText, 'electronic');
  assert.equal(segments[0]?.y, 28);
});
