// SeriesParticipationMode is the decision wording mode shared by episode generation flows.
export type SeriesParticipationMode = 'director' | 'character';

// DecisionPromptInput contains the generated decision cue and the story it must not repeat.
export type DecisionPromptInput = {
  // prompt is the model-written text displayed above the available choices.
  readonly prompt: string;
  // storyBlocks are the final semantic reader blocks preceding the decision.
  readonly storyBlocks: readonly string[];
  // participationMode selects a safe fallback from the learner's perspective.
  readonly participationMode: SeriesParticipationMode;
};

// resolveDecisionPrompt removes repeated prose while preserving a distinct model-written question.
export function resolveDecisionPrompt({
  prompt,
  storyBlocks,
  participationMode,
}: DecisionPromptInput): string {
  const fallbackPrompt: string = participationMode === 'character'
    ? 'What do you do next?'
    : 'What happens next?';
  const promptSentences: readonly string[] = splitSentences(prompt);
  const storySentences: readonly string[] = storyBlocks
    .flatMap(splitSentences)
    .slice(-4);
  const repeatedPrefixLength: number = findRepeatedPrefixLength(
    promptSentences,
    storySentences,
  );
  const distinctPrompt: string = promptSentences
    .slice(repeatedPrefixLength)
    .join(' ')
    .trim();

  if (
    distinctPrompt.length === 0 ||
    isNearDuplicateOfStoryEnding(distinctPrompt, storySentences)
  ) {
    return fallbackPrompt;
  }

  return distinctPrompt;
}

// findRepeatedPrefixLength finds the longest prompt prefix copied from the story suffix.
function findRepeatedPrefixLength(
  promptSentences: readonly string[],
  storySentences: readonly string[],
): number {
  const maximumLength: number = Math.min(
    promptSentences.length,
    storySentences.length,
  );

  for (let length = maximumLength; length >= 1; length -= 1) {
    const promptPrefix: readonly string[] = promptSentences.slice(0, length);
    const storySuffix: readonly string[] = storySentences.slice(-length);
    const matches: boolean = promptPrefix.every(
      (sentence: string, index: number): boolean =>
        normalizeText(sentence) === normalizeText(storySuffix[index] ?? ''),
    );

    if (matches) {
      return length;
    }
  }

  return 0;
}

// isNearDuplicateOfStoryEnding catches punctuation changes and tiny rewrites of recent prose.
function isNearDuplicateOfStoryEnding(
  prompt: string,
  storySentences: readonly string[],
): boolean {
  const promptWords: readonly string[] = normalizeText(prompt).split(' ')
    .filter(Boolean);

  if (promptWords.length < 4) {
    return false;
  }

  const maximumSuffixLength: number = Math.min(3, storySentences.length);

  for (let length = 1; length <= maximumSuffixLength; length += 1) {
    const storyWords: readonly string[] = normalizeText(
      storySentences.slice(-length).join(' '),
    ).split(' ').filter(Boolean);

    if (wordDiceSimilarity(promptWords, storyWords) >= 0.9) {
      return true;
    }
  }

  return false;
}

// wordDiceSimilarity measures repeated wording while respecting duplicate word counts.
function wordDiceSimilarity(
  leftWords: readonly string[],
  rightWords: readonly string[],
): number {
  if (leftWords.length === 0 || rightWords.length === 0) {
    return 0;
  }

  const remainingRightWords: string[] = [...rightWords];
  let matches = 0;

  leftWords.forEach((word: string): void => {
    const matchIndex: number = remainingRightWords.indexOf(word);

    if (matchIndex >= 0) {
      matches += 1;
      remainingRightWords.splice(matchIndex, 1);
    }
  });

  return (2 * matches) / (leftWords.length + rightWords.length);
}

// splitSentences preserves readable punctuation while exposing repeated leading prose.
function splitSentences(text: string): readonly string[] {
  return (text.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence: string): string => sentence.trim())
    .filter((sentence: string): boolean => sentence.length > 0);
}

// normalizeText makes duplicate detection insensitive to case and punctuation.
function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
