import type { TranslationAnnotation } from '@domain/index';

// SentenceTextChunk is a renderable part of a sentence with optional hint data.
export type SentenceTextChunk = {
  // endOffset is the exclusive UTF-16 boundary inside the complete sentence.
  readonly endOffset: number;
  // id keeps React text fragments stable after annotation selection changes.
  readonly id: string;
  // startOffset is the inclusive UTF-16 boundary inside the complete sentence.
  readonly startOffset: number;
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
  const sentenceAnnotations = annotations.filter(
    (annotation) => annotation.sentenceIndex === sentenceIndex,
  );

  if (sentenceAnnotations.length === 0) {
    return [
      {
        endOffset: sentence.length,
        id: `${sentenceIndex}:plain`,
        startOffset: 0,
        text: sentence,
      },
    ];
  }

  const chunks: SentenceTextChunk[] = [];
  let cursor = 0;

  sentenceAnnotations.forEach((annotation) => {
    const matchIndex = sentence
      .toLocaleLowerCase()
      .indexOf(annotation.surfaceText.toLocaleLowerCase(), cursor);

    if (matchIndex < 0) {
      return;
    }

    if (matchIndex > cursor) {
      chunks.push({
        endOffset: matchIndex,
        id: `${sentenceIndex}:plain:${cursor}`,
        startOffset: cursor,
        text: sentence.slice(cursor, matchIndex),
      });
    }

    const endIndex = matchIndex + annotation.surfaceText.length;

    chunks.push({
      annotation,
      endOffset: endIndex,
      id: `${sentenceIndex}:hint:${matchIndex}`,
      startOffset: matchIndex,
      text: sentence.slice(matchIndex, endIndex),
    });
    cursor = endIndex;
  });

  if (cursor < sentence.length) {
    chunks.push({
      endOffset: sentence.length,
      id: `${sentenceIndex}:plain:${cursor}`,
      startOffset: cursor,
      text: sentence.slice(cursor),
    });
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          endOffset: sentence.length,
          id: `${sentenceIndex}:plain`,
          startOffset: 0,
          text: sentence,
        },
      ];
}

// findSentenceAnnotationAtOffset resolves a tap cursor to an existing Story Word hint.
export function findSentenceAnnotationAtOffset({
  annotations,
  offset,
  sentence,
  sentenceIndex,
}: {
  // annotations are validated inline hints for the current episode.
  readonly annotations: readonly TranslationAnnotation[];
  // offset is the collapsed native selection cursor inside the sentence.
  readonly offset: number;
  // sentence is the exact visible text used to build annotated chunks.
  readonly sentence: string;
  // sentenceIndex scopes annotations to the visible playback unit.
  readonly sentenceIndex: number;
}): TranslationAnnotation | undefined {
  const chunks: readonly SentenceTextChunk[] = buildSentenceTextChunks({
    annotations,
    sentence,
    sentenceIndex,
  });
  let cursor: number = 0;

  for (const chunk of chunks) {
    const chunkEnd: number = cursor + chunk.text.length;

    if (chunk.annotation && offset >= cursor && offset < chunkEnd) {
      return chunk.annotation;
    }

    cursor = chunkEnd;
  }

  return undefined;
}
