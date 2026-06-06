import {
  episodePayloadSchema,
  interactionPayloadSchema,
  type EpisodePayload,
  type GenerateEpisodeRequest,
  type InteractionPayload,
  type SubmitInteractionRequest,
} from './episodeContracts.ts';

// CYRILLIC_PATTERN identifies Russian translations required by the current learner UI.
const CYRILLIC_PATTERN = /[А-Яа-яЁё]/;

// FinalizeEpisodePayloadInput joins validated AI output with trusted request context.
export type FinalizeEpisodePayloadInput = {
  // payload is the structured output produced by the model.
  readonly payload: unknown;
  // request is the validated generation request from the mobile client.
  readonly request: GenerateEpisodeRequest;
};

// FinalizeInteractionPayloadInput joins validated AI output with trusted request context.
export type FinalizeInteractionPayloadInput = {
  // payload is the structured output produced by the model.
  readonly payload: unknown;
  // request is the validated learner interaction request.
  readonly request: SubmitInteractionRequest;
};

// finalizeEpisodePayload enforces cross-field episode invariants before returning JSON.
export function finalizeEpisodePayload({
  payload,
  request,
}: FinalizeEpisodePayloadInput): EpisodePayload {
  const parsed = episodePayloadSchema.parse(payload);
  const sentences = uniqueText(parsed.sentences);
  const sceneText = sentences.join(' ');

  const selectedWordsById = new Map(
    request.selectedStoryWords.map((word) => [word.id, word]),
  );
  const storyWordIds = request.selectedStoryWords.map((word) => word.id);

  for (const word of request.selectedStoryWords) {
    if (!containsWord(sceneText, word.word)) {
      throw new Error(`Selected Story Word was not used: ${word.id}`);
    }
  }

  const annotations = parsed.annotations.filter((annotation) => {
    const sentence = sentences[annotation.sentenceIndex];

    if (!sentence || !containsText(sentence, annotation.surfaceText)) {
      return false;
    }

    if (!CYRILLIC_PATTERN.test(annotation.translation)) {
      return false;
    }

    if (annotation.wordId === undefined) {
      return true;
    }

    const selectedWord = selectedWordsById.get(annotation.wordId);

    return (
      selectedWord !== undefined &&
      annotation.surfaceText.toLocaleLowerCase() ===
        selectedWord.word.toLocaleLowerCase()
    );
  });
  const annotatedWordIds = new Set(
    annotations.flatMap((annotation) =>
      annotation.wordId ? [annotation.wordId] : [],
    ),
  );

  for (const wordId of storyWordIds) {
    if (!annotatedWordIds.has(wordId)) {
      throw new Error(`Selected Story Word annotation is missing: ${wordId}`);
    }
  }

  const choices = uniqueById(parsed.interaction.choices);

  if (choices.length < 2) {
    throw new Error('Choice interaction requires at least two unique choices.');
  }

  const summaryUpdate = parsed.summaryUpdate;

  return {
    ...parsed,
    sceneText,
    sentences,
    storyWordIds,
    annotations,
    interaction: {
      ...parsed.interaction,
      kind: 'choice',
      choices,
    },
    summaryUpdate,
    memoryUpdate: {
      ...parsed.memoryUpdate,
      knownFacts: uniqueText(parsed.memoryUpdate.knownFacts),
      openQuestions: uniqueText(parsed.memoryUpdate.openQuestions),
      importantObjectsOrLocations: uniqueText(
        parsed.memoryUpdate.importantObjectsOrLocations,
      ),
      lastEpisodeSummary: summaryUpdate,
      unresolvedCliffhanger: parsed.cliffhanger,
      recurringStoryWordIds: uniqueText([
        ...request.compactSeriesMemory.recurringStoryWordIds,
        ...storyWordIds,
      ]),
    },
  };
}

// finalizeInteractionPayload enforces same-episode continuation and memory invariants.
export function finalizeInteractionPayload({
  payload,
  request,
}: FinalizeInteractionPayloadInput): InteractionPayload {
  const parsed = interactionPayloadSchema.parse(payload);
  const continuationSentences = uniqueText(parsed.continuationSentences);
  const continuationText = continuationSentences.join(' ');
  const summaryUpdate = parsed.summaryUpdate;

  return {
    ...parsed,
    continuationText,
    continuationSentences,
    summaryUpdate,
    memoryUpdate: {
      ...parsed.memoryUpdate,
      knownFacts: uniqueText(parsed.memoryUpdate.knownFacts),
      openQuestions: uniqueText(parsed.memoryUpdate.openQuestions),
      importantObjectsOrLocations: uniqueText(
        parsed.memoryUpdate.importantObjectsOrLocations,
      ),
      lastEpisodeSummary: summaryUpdate,
      recurringStoryWordIds: uniqueText([
        ...request.compactSeriesMemory.recurringStoryWordIds,
        ...parsed.memoryUpdate.recurringStoryWordIds,
      ]),
    },
  };
}

// containsWord checks a selected headword as a complete case-insensitive token.
function containsWord(text: string, word: string): boolean {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`\\b${escapedWord}\\b`, 'i').test(text);
}

// containsText checks that an annotation surface exists in its referenced sentence.
function containsText(text: string, surfaceText: string): boolean {
  return text.toLocaleLowerCase().includes(surfaceText.toLocaleLowerCase());
}

// uniqueText removes duplicate text values while preserving model order.
function uniqueText(values: readonly string[]): string[] {
  return [...new Set(values)];
}

// uniqueById removes duplicate choice ids while preserving model order.
function uniqueById<T extends { readonly id: string }>(values: readonly T[]): T[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (seen.has(value.id)) {
      return false;
    }

    seen.add(value.id);

    return true;
  });
}
