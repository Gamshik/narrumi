import type { TranslationAnnotation } from '@domain/index';

// SentenceTextChunk is a renderable part of a sentence with optional hint data.
export type SentenceTextChunk = {
  // id keeps React text fragments stable after annotation selection changes.
  readonly id: string;
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
    return [{ id: `${sentenceIndex}:plain`, text: sentence }];
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
  });

  if (cursor < sentence.length) {
    chunks.push({
      id: `${sentenceIndex}:plain:${cursor}`,
      text: sentence.slice(cursor),
    });
  }

  return chunks.length > 0 ? chunks : [{ id: `${sentenceIndex}:plain`, text: sentence }];
}
