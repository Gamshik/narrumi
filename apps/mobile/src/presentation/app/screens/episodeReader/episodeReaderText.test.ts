import assert from 'node:assert/strict';
import test from 'node:test';

import type { TranslationAnnotation } from '@domain/index';

import {
  buildSentenceTextChunks,
  findSentenceAnnotationAtOffset,
} from './episodeReaderText';

test('annotated chunks preserve their exact selectable sentence offsets', (): void => {
  const sentence: string = 'They crossed the narrow bridge.';
  const annotation: TranslationAnnotation = {
    sentenceIndex: 0,
    surfaceText: 'narrow',
    translation: 'узкий',
    wordId: 'narrow',
  };
  const annotatedChunk = buildSentenceTextChunks({
    annotations: [annotation],
    sentence,
    sentenceIndex: 0,
  }).find((chunk) => chunk.annotation === annotation);

  assert.deepEqual(
    annotatedChunk
      ? {
          endOffset: annotatedChunk.endOffset,
          startOffset: annotatedChunk.startOffset,
        }
      : undefined,
    {
      endOffset: sentence.indexOf('narrow') + 'narrow'.length,
      startOffset: sentence.indexOf('narrow'),
    },
  );
});

test('findSentenceAnnotationAtOffset resolves a cursor inside an annotated word', (): void => {
  const sentence: string = 'They crossed the narrow bridge.';
  const annotation: TranslationAnnotation = {
    sentenceIndex: 0,
    surfaceText: 'narrow',
    translation: 'узкий',
    wordId: 'narrow',
  };

  assert.equal(
    findSentenceAnnotationAtOffset({
      annotations: [annotation],
      offset: sentence.indexOf('narrow') + 2,
      sentence,
      sentenceIndex: 0,
    }),
    annotation,
  );
});

test('findSentenceAnnotationAtOffset ignores plain text cursors', (): void => {
  assert.equal(
    findSentenceAnnotationAtOffset({
      annotations: [],
      offset: 2,
      sentence: 'Plain sentence.',
      sentenceIndex: 0,
    }),
    undefined,
  );
});
