import {
  type EpisodePayload,
  episodePayloadSchema,
  type GenerateEpisodeRequest,
  type InteractionPayload,
  interactionPayloadSchema,
  type SubmitInteractionRequest,
} from './episodeContracts.ts';
import { resolveDecisionPrompt } from './decisionPromptPolicy.ts';
import {
  isDialogueRepeatedByNarration,
  looksLikeNarrationInDialogue,
  type ReaderFrameDraft,
  splitQuotedDialogueFromNarration,
} from './dialogueFramePolicy.ts';
import { EPISODE_INTERACTION_LIMITS } from './episodePacingPolicy.ts';
import { assertEnglishGeneratedTextFields } from './generatedLanguage.ts';

// CYRILLIC_PATTERN identifies Russian translations required by the current learner UI.
const CYRILLIC_PATTERN = /[А-Яа-яЁё]/;

// MEMORY_LIMITS keep AI-written continuity compact before it reaches the client.
const MEMORY_LIMITS = {
  // knownFacts should preserve only high-signal continuity facts.
  knownFacts: 8,
  // openQuestions should keep only active unresolved story questions.
  openQuestions: 6,
  // importantObjectsOrLocations should keep only recurring anchors.
  importantObjectsOrLocations: 6,
  // recurringStoryWordIds can be wider because ids are small and user-selected.
  recurringStoryWordIds: 24,
} as const;

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

  assertEnglishGeneratedTextFields('episode', [
    { fieldName: 'title', value: parsed.title },
    { fieldName: 'previouslyRecap', value: parsed.previouslyRecap },
    { fieldName: 'sceneText', value: parsed.sceneText },
    { fieldName: 'cliffhanger', value: parsed.cliffhanger },
    { fieldName: 'summaryUpdate', value: parsed.summaryUpdate },
    ...parsed.sentences.map((value, index) => ({
      fieldName: `sentences.${index}`,
      value,
    })),
    { fieldName: 'interaction.prompt', value: parsed.interaction.prompt },
    ...parsed.interaction.choices.flatMap((choice, index) => [
      { fieldName: `interaction.choices.${index}.label`, value: choice.label },
      {
        fieldName: `interaction.choices.${index}.outcomeHint`,
        value: choice.outcomeHint,
      },
    ]),
    {
      fieldName: 'memoryUpdate.currentConflict',
      value: parsed.memoryUpdate.currentConflict,
    },
    {
      fieldName: 'memoryUpdate.lastEpisodeSummary',
      value: parsed.memoryUpdate.lastEpisodeSummary,
    },
    {
      fieldName: 'memoryUpdate.unresolvedCliffhanger',
      value: parsed.memoryUpdate.unresolvedCliffhanger,
    },
    ...parsed.memoryUpdate.knownFacts.map((value, index) => ({
      fieldName: `memoryUpdate.knownFacts.${index}`,
      value,
    })),
    ...parsed.memoryUpdate.openQuestions.map((value, index) => ({
      fieldName: `memoryUpdate.openQuestions.${index}`,
      value,
    })),
    ...parsed.memoryUpdate.importantObjectsOrLocations.map((value, index) => ({
      fieldName: `memoryUpdate.importantObjectsOrLocations.${index}`,
      value,
    })),
  ]);

  if (parsed.title) {
    assertIndependentEpisodeTitle(parsed.title, request.seriesTitle);
  }

  const playback = normalizePlaybackFrames({
    fieldName: 'sentenceFrames',
    frames: parsed.sentenceFrames,
    sentences: parsed.sentences,
    speakerNames: getPinnedSpeakerNames(request),
  });
  const sentences = playback.sentences;
  const sentenceFrames = playback.frames;
  const sceneText = sentences.join(' ');
  const interactionPrompt: string = resolveDecisionPrompt({
    prompt: parsed.interaction.prompt,
    storyBlocks: sentences,
    participationMode: request.participationMode,
  });

  const selectedWordsById = new Map(
    request.selectedStoryWords.map((word) => [word.id, word]),
  );
  const storyWordIds = request.selectedStoryWords.map((word) => word.id);
  const annotations = filterAnnotations({
    annotations: parsed.annotations,
    selectedWordsById,
    sentences,
    sentenceIndexMap: playback.sentenceIndexMap,
  });

  const choices = uniqueById(parsed.interaction.choices);

  if (choices.length < 2) {
    throw new Error('Choice interaction requires at least two unique choices.');
  }

  const summaryUpdate = parsed.summaryUpdate;

  return {
    ...parsed,
    sceneText,
    sentences,
    sentenceFrames,
    storyWordIds,
    annotations,
    interaction: {
      ...parsed.interaction,
      kind: 'choice',
      prompt: interactionPrompt,
      choices,
    },
    summaryUpdate,
    memoryUpdate: {
      ...parsed.memoryUpdate,
      knownFacts: mergeCompactTextList(
        parsed.memoryUpdate.knownFacts,
        request.compactSeriesMemory.knownFacts,
        MEMORY_LIMITS.knownFacts,
      ),
      openQuestions: compactTextList(
        parsed.memoryUpdate.openQuestions,
        MEMORY_LIMITS.openQuestions,
      ),
      importantObjectsOrLocations: mergeCompactTextList(
        parsed.memoryUpdate.importantObjectsOrLocations,
        request.compactSeriesMemory.importantObjectsOrLocations,
        MEMORY_LIMITS.importantObjectsOrLocations,
      ),
      lastEpisodeSummary: summaryUpdate,
      unresolvedCliffhanger: parsed.cliffhanger,
      recurringStoryWordIds: compactTextList(
        [...request.compactSeriesMemory.recurringStoryWordIds, ...storyWordIds],
        MEMORY_LIMITS.recurringStoryWordIds,
      ),
    },
  };
}

// assertIndependentEpisodeTitle prevents model output from merging series identity into an episode label.
function assertIndependentEpisodeTitle(
  episodeTitle: string,
  seriesTitle: string,
): void {
  // episodeWords is the punctuation-independent token sequence produced by the model.
  const episodeWords: readonly string[] = normalizeTitleWords(episodeTitle);
  // seriesWords is the protected series-name sequence that must remain outside episode.title.
  const seriesWords: readonly string[] = normalizeTitleWords(seriesTitle);

  if (containsWordSequence(episodeWords, seriesWords)) {
    throw new Error(
      'Episode title must be independent and must not include the series title.',
    );
  }
}

// normalizeTitleWords makes the invariant resilient to casing and separator changes.
function normalizeTitleWords(value: string): readonly string[] {
  return value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ??
    [];
}

// containsWordSequence finds an exact contiguous phrase without matching partial words.
function containsWordSequence(
  sourceWords: readonly string[],
  protectedWords: readonly string[],
): boolean {
  if (
    protectedWords.length === 0 ||
    protectedWords.length > sourceWords.length
  ) {
    return false;
  }

  return sourceWords.some((_, startIndex): boolean =>
    protectedWords.every(
      (protectedWord, protectedIndex): boolean =>
        sourceWords[startIndex + protectedIndex] === protectedWord,
    )
  );
}

// finalizeInteractionPayload enforces same-episode continuation and memory invariants.
export function finalizeInteractionPayload({
  payload,
  request,
}: FinalizeInteractionPayloadInput): InteractionPayload {
  const parsed = interactionPayloadSchema.parse(payload);

  assertEnglishGeneratedTextFields('interaction', [
    { fieldName: 'feedback', value: parsed.feedback },
    { fieldName: 'continuationText', value: parsed.continuationText },
    { fieldName: 'cliffhanger', value: parsed.cliffhanger },
    { fieldName: 'summaryUpdate', value: parsed.summaryUpdate },
    ...parsed.continuationSentences.map((value, index) => ({
      fieldName: `continuationSentences.${index}`,
      value,
    })),
    {
      fieldName: 'nextInteraction.prompt',
      value: parsed.nextInteraction?.prompt,
    },
    ...(parsed.nextInteraction?.choices ?? []).map((choice, index) => ({
      fieldName: `nextInteraction.choices.${index}.label`,
      value: choice.label,
    })),
    {
      fieldName: 'memoryUpdate.currentConflict',
      value: parsed.memoryUpdate.currentConflict,
    },
    {
      fieldName: 'memoryUpdate.lastEpisodeSummary',
      value: parsed.memoryUpdate.lastEpisodeSummary,
    },
    {
      fieldName: 'memoryUpdate.unresolvedCliffhanger',
      value: parsed.memoryUpdate.unresolvedCliffhanger,
    },
    ...parsed.memoryUpdate.knownFacts.map((value, index) => ({
      fieldName: `memoryUpdate.knownFacts.${index}`,
      value,
    })),
    ...parsed.memoryUpdate.openQuestions.map((value, index) => ({
      fieldName: `memoryUpdate.openQuestions.${index}`,
      value,
    })),
    ...parsed.memoryUpdate.importantObjectsOrLocations.map((value, index) => ({
      fieldName: `memoryUpdate.importantObjectsOrLocations.${index}`,
      value,
    })),
  ]);
  const playback = normalizePlaybackFrames({
    fieldName: 'continuationSentenceFrames',
    frames: parsed.continuationSentenceFrames,
    sentences: parsed.continuationSentences,
    speakerNames: getPinnedSpeakerNames(request),
  });
  const continuationSentences = playback.sentences;
  const continuationSentenceFrames = playback.frames;
  const continuationText = continuationSentences.join(' ');
  const selectedWordsById = new Map(
    request.selectedStoryWords.map((word) => [word.id, word]),
  );
  const continuationAnnotations = filterAnnotations({
    annotations: parsed.continuationAnnotations,
    selectedWordsById,
    sentences: continuationSentences,
    sentenceIndexMap: playback.sentenceIndexMap,
  });
  const summaryUpdate = parsed.summaryUpdate;
  const shouldForceCompletion = request.interactionCount >=
    EPISODE_INTERACTION_LIMITS.maximumBeforeCompletion;
  const isEpisodeComplete = parsed.isEpisodeComplete || shouldForceCompletion;

  if (
    isEpisodeComplete &&
    request.interactionCount <
      EPISODE_INTERACTION_LIMITS.minimumBeforeCompletion
  ) {
    throw new Error(
      'Episode cannot complete before five meaningful learner interactions.',
    );
  }

  const completionCliffhanger = parsed.cliffhanger ??
    parsed.memoryUpdate.unresolvedCliffhanger;

  if (isEpisodeComplete && !completionCliffhanger) {
    throw new Error('Completed episode requires a final cliffhanger.');
  }

  const nextInteraction = parsed.nextInteraction
    ? {
      ...parsed.nextInteraction,
      prompt: resolveDecisionPrompt({
        prompt: parsed.nextInteraction.prompt,
        storyBlocks: continuationSentences,
        participationMode: request.participationMode,
      }),
      choices: uniqueById(parsed.nextInteraction.choices),
    }
    : undefined;

  if (
    !isEpisodeComplete &&
    (!nextInteraction || nextInteraction.choices.length < 2)
  ) {
    throw new Error(
      'Continuing episode requires at least two unique next choices.',
    );
  }

  const commonPayload = {
    feedback: parsed.feedback,
    continuationText,
    continuationSentences,
    continuationSentenceFrames,
    continuationAnnotations,
    isEpisodeComplete,
    summaryUpdate,
    memoryUpdate: {
      ...parsed.memoryUpdate,
      knownFacts: mergeCompactTextList(
        parsed.memoryUpdate.knownFacts,
        request.compactSeriesMemory.knownFacts,
        MEMORY_LIMITS.knownFacts,
      ),
      openQuestions: compactTextList(
        parsed.memoryUpdate.openQuestions,
        MEMORY_LIMITS.openQuestions,
      ),
      importantObjectsOrLocations: mergeCompactTextList(
        parsed.memoryUpdate.importantObjectsOrLocations,
        request.compactSeriesMemory.importantObjectsOrLocations,
        MEMORY_LIMITS.importantObjectsOrLocations,
      ),
      lastEpisodeSummary: summaryUpdate,
      ...(isEpisodeComplete && completionCliffhanger
        ? { unresolvedCliffhanger: completionCliffhanger }
        : {}),
      recurringStoryWordIds: compactTextList(
        [
          ...request.compactSeriesMemory.recurringStoryWordIds,
          ...parsed.memoryUpdate.recurringStoryWordIds,
        ],
        MEMORY_LIMITS.recurringStoryWordIds,
      ),
    },
  };

  return isEpisodeComplete
    ? {
      ...commonPayload,
      isEpisodeComplete: true,
      cliffhanger: completionCliffhanger,
    }
    : {
      ...commonPayload,
      isEpisodeComplete: false,
      nextInteraction: nextInteraction!,
    };
}

// containsText checks that an annotation surface exists in its referenced sentence.
function containsText(text: string, surfaceText: string): boolean {
  return text.toLocaleLowerCase().includes(surfaceText.toLocaleLowerCase());
}

// filterAnnotations keeps only trustworthy hints for words actually present in generated text.
function filterAnnotations({
  annotations,
  selectedWordsById,
  sentenceIndexMap,
  sentences,
}: {
  // annotations are AI-written translation hints to validate before storage.
  readonly annotations: EpisodePayload['annotations'];
  // selectedWordsById restricts Story Word annotations to the requested episode words.
  readonly selectedWordsById: ReadonlyMap<string, { readonly word: string }>;
  // sentenceIndexMap remaps each original AI index to one or more normalized playback indexes.
  readonly sentenceIndexMap: readonly (readonly number[])[];
  // sentences are the canonical text units referenced by annotation sentenceIndex.
  readonly sentences: readonly string[];
}): EpisodePayload['annotations'] {
  return annotations.flatMap((annotation) => {
    if (
      annotation.surfaceText === undefined ||
      annotation.translation === undefined ||
      annotation.sentenceIndex === undefined
    ) {
      return [];
    }

    const mappedSentenceIndexes: readonly number[] | undefined =
      sentenceIndexMap[annotation.sentenceIndex];

    if (!mappedSentenceIndexes) {
      return [];
    }

    // surfaceText is known after the boundary checks above and stays stable during remapping.
    const surfaceText: string = annotation.surfaceText;
    // mappedSentenceIndex selects the split block that still owns this annotation surface.
    const mappedSentenceIndex: number | undefined = mappedSentenceIndexes.find(
      (candidateIndex: number): boolean => {
        const candidateSentence: string | undefined = sentences[candidateIndex];

        return candidateSentence !== undefined &&
          containsText(candidateSentence, surfaceText);
      },
    );

    if (mappedSentenceIndex === undefined) {
      return [];
    }

    if (!CYRILLIC_PATTERN.test(annotation.translation)) {
      return [];
    }

    if (annotation.wordId === undefined) {
      return [
        {
          surfaceText: annotation.surfaceText,
          translation: annotation.translation,
          ...(annotation.transcription
            ? { transcription: annotation.transcription }
            : {}),
          sentenceIndex: mappedSentenceIndex,
        },
      ];
    }

    const selectedWord = selectedWordsById.get(annotation.wordId);

    if (
      selectedWord === undefined ||
      annotation.surfaceText.toLocaleLowerCase() !==
        selectedWord.word.toLocaleLowerCase()
    ) {
      return [];
    }

    return [
      {
        wordId: annotation.wordId,
        surfaceText: annotation.surfaceText,
        translation: annotation.translation,
        ...(annotation.transcription
          ? { transcription: annotation.transcription }
          : {}),
        sentenceIndex: mappedSentenceIndex,
      },
    ];
  });
}

// uniqueText removes duplicate text values while preserving model order.
function uniqueText(values: readonly string[]): string[] {
  return [...new Set(values)];
}

// compactTextList deduplicates and caps AI memory arrays for bounded context.
function compactTextList(values: readonly string[], limit: number): string[] {
  return uniqueText(values).slice(0, limit);
}

// mergeCompactTextList fills omitted stable memory from the prior state without reviving open questions.
function mergeCompactTextList(
  preferredValues: readonly string[],
  retainedValues: readonly string[],
  limit: number,
): string[] {
  // values keeps fresh model priorities first and uses prior continuity only for remaining capacity.
  const values: readonly string[] = [...preferredValues, ...retainedValues];
  const seenKeys: Set<string> = new Set<string>();

  return values.filter((value: string): boolean => {
    const key: string = normalizeMemoryTextKey(value);

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);

    return true;
  }).slice(0, limit);
}

// normalizeMemoryTextKey deduplicates equivalent memory wording across casing and punctuation noise.
function normalizeMemoryTextKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// uniqueById removes duplicate choice ids while preserving model order.
function uniqueById<T extends { readonly id: string }>(
  values: readonly T[],
): T[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (seen.has(value.id)) {
      return false;
    }

    seen.add(value.id);

    return true;
  });
}

// NormalizedSentenceFrame preserves explicit speaker metadata while using canonical sentence text.
type NormalizedSentenceFrame =
  InteractionPayload['continuationSentenceFrames'][number];

// IndexedSentenceFrame retains the source index when one mixed frame becomes several blocks.
type IndexedSentenceFrame = {
  // frame is one normalized narration or dialogue block.
  readonly frame: NormalizedSentenceFrame;
  // sourceIndex identifies the original model frame for annotation remapping.
  readonly sourceIndex: number;
};

// normalizePlaybackFrames makes sentences the source of truth while merging repeated dialogue.
function normalizePlaybackFrames({
  fieldName,
  frames,
  sentences,
  speakerNames,
}: {
  // fieldName identifies the AI field when count validation fails.
  readonly fieldName: string;
  // frames carry explicit narration/dialogue metadata from AI output.
  readonly frames: readonly NormalizedSentenceFrame[];
  // sentences are the canonical playback and reader text units.
  readonly sentences: readonly string[];
  // speakerNames are the canonical labels pinned in the series setup.
  readonly speakerNames: readonly string[];
}): {
  // frames are the merged reader units returned to the client.
  frames: NormalizedSentenceFrame[];
  // sentenceIndexMap maps each original sentence to its normalized playback indexes.
  sentenceIndexMap: number[][];
  // sentences are the merged playback and reader text units.
  sentences: string[];
} {
  if (frames.length !== sentences.length) {
    throw new Error(`${fieldName} must match the sentence count.`);
  }

  const normalizedFrames: IndexedSentenceFrame[] = frames.flatMap(
    (frame: NormalizedSentenceFrame, index: number): IndexedSentenceFrame[] => {
      const normalizedFrame: NormalizedSentenceFrame = normalizeFrameText({
        frame,
        sentence: sentences[index]!,
        speakerNames,
      });
      const splitFrames: readonly ReaderFrameDraft[] =
        normalizedFrame.kind === 'narration'
          ? splitQuotedDialogueFromNarration(
            normalizedFrame.text,
            speakerNames,
          )
          : [normalizedFrame];

      return splitFrames.map(
        (splitFrame: ReaderFrameDraft): IndexedSentenceFrame => ({
          frame: splitFrame,
          sourceIndex: index,
        }),
      );
    },
  );

  return mergeAdjacentDialogueFrames(normalizedFrames, sentences.length);
}

// normalizeFrameText strips quote markers while preserving frame meaning.
function normalizeFrameText({
  frame,
  sentence,
  speakerNames,
}: {
  // frame is the AI-written narration/dialogue marker.
  readonly frame: NormalizedSentenceFrame;
  // sentence is the canonical text for this playback unit.
  readonly sentence: string;
  // speakerNames are the canonical labels pinned in the series setup.
  readonly speakerNames: readonly string[];
}): NormalizedSentenceFrame {
  if (frame.kind === 'dialogue') {
    const normalizedSpeaker: string = normalizePinnedSpeakerName(
      frame.speaker,
      speakerNames,
    );

    if (
      looksLikeNarrationInDialogue(sentence, frame.speaker) ||
      looksLikeNarrationInDialogue(sentence, normalizedSpeaker)
    ) {
      return {
        kind: 'narration',
        text: stripSpeechQuotes(sentence),
      };
    }

    return {
      kind: 'dialogue',
      speaker: normalizedSpeaker,
      text: stripSpeechQuotes(sentence),
    };
  }

  return {
    kind: 'narration',
    text: stripSpeechQuotes(sentence),
  };
}

// getPinnedSpeakerNames selects canonical labels from profiles, falling back to legacy names.
function getPinnedSpeakerNames(
  request: GenerateEpisodeRequest | SubmitInteractionRequest,
): readonly string[] {
  const profiles = 'characterProfiles' in request
    ? request.characterProfiles
    : request.compactSeriesMemory.characterProfiles;
  const profileNames = profiles.map((profile) => profile.name);

  return profileNames.length > 0
    ? profileNames
    : request.compactSeriesMemory.mainCharacters;
}

// normalizePinnedSpeakerName maps variants like "Detective Corbin" to "Corbin".
function normalizePinnedSpeakerName(
  speaker: string,
  speakerNames: readonly string[],
): string {
  const normalizedSpeaker = normalizeSpeakerKey(speaker);
  const exactMatch = speakerNames.find(
    (name) => normalizeSpeakerKey(name) === normalizedSpeaker,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const suffixMatch = speakerNames.find((name) => {
    const key = normalizeSpeakerKey(name);

    return normalizedSpeaker.endsWith(` ${key}`);
  });

  return suffixMatch ?? speaker;
}

// normalizeSpeakerKey makes speaker matching resilient to titles, casing, and spacing.
function normalizeSpeakerKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(mr|mrs|ms|miss|dr|doctor|detective|professor|captain|officer)\b/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

// mergeAdjacentDialogueFrames joins consecutive same-speaker dialogue into one playback unit.
function mergeAdjacentDialogueFrames(
  frames: readonly IndexedSentenceFrame[],
  sourceSentenceCount: number,
): {
  // frames are the merged reader units returned to the client.
  frames: NormalizedSentenceFrame[];
  // sentenceIndexMap maps each original sentence to its normalized playback indexes.
  sentenceIndexMap: number[][];
  // sentences are the merged playback and reader text units.
  sentences: string[];
} {
  const mergedFrames: NormalizedSentenceFrame[] = [];
  const mergedSentences: string[] = [];
  const sentenceIndexMap: number[][] = Array.from(
    { length: sourceSentenceCount },
    (): number[] => [],
  );

  frames.forEach(({ frame, sourceIndex }: IndexedSentenceFrame): void => {
    const currentSentence = frame.text.trim();
    const previousFrame = mergedFrames[mergedFrames.length - 1];

    if (
      frame.kind === 'dialogue' &&
      previousFrame?.kind === 'narration' &&
      isDialogueRepeatedByNarration(previousFrame.text, currentSentence)
    ) {
      // The repeated source index still points at the narration retained for annotations.
      sentenceIndexMap[sourceIndex]?.push(mergedFrames.length - 1);

      return;
    }

    if (
      frame.kind === 'dialogue' &&
      previousFrame?.kind === 'dialogue' &&
      previousFrame.speaker === frame.speaker
    ) {
      previousFrame.text = `${previousFrame.text} ${frame.text}`.trim();
      mergedSentences[mergedSentences.length - 1] = `${
        mergedSentences[mergedSentences.length - 1]
      } ${currentSentence}`.trim();
      sentenceIndexMap[sourceIndex]?.push(mergedFrames.length - 1);

      return;
    }

    mergedFrames.push(
      frame.kind === 'dialogue'
        ? {
          kind: 'dialogue',
          speaker: frame.speaker,
          text: frame.text,
        }
        : {
          kind: 'narration',
          text: frame.text,
        },
    );
    mergedSentences.push(currentSentence);
    sentenceIndexMap[sourceIndex]?.push(mergedFrames.length - 1);
  });

  return {
    frames: mergedFrames,
    sentenceIndexMap,
    sentences: mergedSentences,
  };
}

// stripSpeechQuotes removes accidental wrapping quotes from spoken text.
function stripSpeechQuotes(text: string): string {
  return text
    .trim()
    .replace(/^["'“”]+/, '')
    .replace(/["'“”]+$/, '')
    .trim();
}
