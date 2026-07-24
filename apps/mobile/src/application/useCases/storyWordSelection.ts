import type { VocabularyItem } from '@domain/index';

// SelectStoryWordIdsInput contains deterministic inputs for building a Story Words set.
export type SelectStoryWordIdsInput = {
  // excludeWordIds are existing visible words that should not be proposed again.
  readonly excludeWordIds?: readonly string[];
  // goal is the configured number of Story Words to propose.
  readonly goal: number;
  // random enables true user-triggered shuffles instead of deterministic daily order.
  readonly random?: () => number;
  // seed randomizes candidates while keeping the same local session reproducible.
  readonly seed: string;
  // sourceWordIds are existing user choices that should be preserved when valid.
  readonly sourceWordIds: readonly string[];
  // vocabulary is the bundled Oxford catalog.
  readonly vocabulary: readonly VocabularyItem[];
};

// selectStoryWordIds preserves valid existing choices and fills gaps from shuffled candidates.
export function selectStoryWordIds({
  excludeWordIds = [],
  goal,
  random,
  seed,
  sourceWordIds,
  vocabulary,
}: SelectStoryWordIdsInput): readonly string[] {
  const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
  const excludedWordKeys = new Set(
    excludeWordIds
      .map((wordId) => wordsById.get(wordId))
      .filter((word): word is VocabularyItem => Boolean(word))
      .map((word) => normalizeStoryWordText(word.word)),
  );
  const selected: string[] = [];
  const selectedWordKeys = new Set<string>();

  for (const wordId of unique(sourceWordIds)) {
    if (selected.length >= goal) {
      break;
    }

    const word = wordsById.get(wordId);
    const wordKey = word ? normalizeStoryWordText(word.word) : '';

    if (
      word &&
      isStoryWordCandidate(word) &&
      !excludedWordKeys.has(wordKey) &&
      !selectedWordKeys.has(wordKey)
    ) {
      selected.push(word.id);
      selectedWordKeys.add(wordKey);
    }
  }

  const selectedSet = new Set<string>(selected);
  // shuffleInput omits optional random unless it is present for exact optional typing.
  const shuffleInput: Parameters<typeof shuffleStoryWordCandidates>[0] = {
    seed,
    vocabulary,
    ...(random ? { random } : {}),
  };
  const shuffledCandidates = shuffleStoryWordCandidates(shuffleInput);

  for (const word of shuffledCandidates) {
    if (selected.length >= goal) {
      break;
    }

    appendStoryWord({
      selected,
      selectedSet,
      selectedWordKeys,
      word,
      excludedWordKeys,
    });
  }

  return selected;
}

// isStoryWordCandidate excludes words that do not work as episode vocabulary targets.
export function isStoryWordCandidate(
  word: VocabularyItem,
): boolean {
  const partOfSpeech = word.partOfSpeech.toLocaleLowerCase();

  if (word.word.length <= 1 || /[\/()]/.test(word.word)) {
    return false;
  }

  return ![
    'article',
    'auxiliary',
    'conjunction',
    'determiner',
    'modal',
    'number',
    'preposition',
    'pronoun',
  ].some((blockedPart) => partOfSpeech.includes(blockedPart));
}

// normalizeStoryWordText groups Oxford entries that share one visible headword.
export function normalizeStoryWordText(word: string): string {
  return word.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

// appendStoryWord centralizes exact id and visible headword filtering.
function appendStoryWord({
  excludedWordKeys,
  selected,
  selectedSet,
  selectedWordKeys,
  word,
}: {
  // excludedWordKeys blocks headwords from the previous set during explicit shuffle.
  readonly excludedWordKeys: ReadonlySet<string>;
  // selected stores the chosen ids in display order.
  readonly selected: string[];
  // selectedSet blocks exact duplicate Oxford ids.
  readonly selectedSet: Set<string>;
  // selectedWordKeys blocks duplicate headwords across Oxford parts of speech.
  readonly selectedWordKeys: Set<string>;
  // word is the candidate being considered for the Story Words set.
  readonly word: VocabularyItem;
}): void {
  const wordKey = normalizeStoryWordText(word.word);

  if (
    selectedSet.has(word.id) ||
    selectedWordKeys.has(wordKey) ||
    excludedWordKeys.has(wordKey)
  ) {
    return;
  }

  selected.push(word.id);
  selectedSet.add(word.id);
  selectedWordKeys.add(wordKey);
}

// shuffleStoryWordCandidates gives variety without making the daily set change on every render.
function shuffleStoryWordCandidates({
  random,
  seed,
  vocabulary,
}: {
  // random switches explicit user actions to a true runtime shuffle.
  readonly random?: () => number;
  // seed controls deterministic pseudo-random ordering.
  readonly seed: string;
  // vocabulary is the full bundled Oxford catalog.
  readonly vocabulary: readonly VocabularyItem[];
}): readonly VocabularyItem[] {
  // candidates intentionally span all CEFR levels because word choice is learner-controlled.
  const candidates = vocabulary.filter((word) => isStoryWordCandidate(word));

  if (random) {
    return shuffleWithRandom(candidates, random);
  }

  return candidates
    .map((word): { readonly rank: number; readonly word: VocabularyItem } => ({
      rank: hashString(`${seed}:${word.id}:${word.word}`),
      word,
    }))
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.word);
}

// shuffleWithRandom uses Fisher-Yates so explicit Shuffle is not tied to JSON order.
function shuffleWithRandom(
  values: readonly VocabularyItem[],
  random: () => number,
): readonly VocabularyItem[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(
      Math.max(Math.floor(random() * (index + 1)), 0),
      index,
    );
    const currentValue = shuffled[index];
    const swapValue = shuffled[swapIndex];

    if (currentValue && swapValue) {
      shuffled[index] = swapValue;
      shuffled[swapIndex] = currentValue;
    }
  }

  return shuffled;
}

// hashString is a small deterministic hash for local pseudo-random ordering.
function hashString(value: string): number {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

// unique removes duplicate ids while preserving local selection order.
function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
