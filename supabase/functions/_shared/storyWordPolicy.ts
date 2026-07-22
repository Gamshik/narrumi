// STORY_WORD_USAGE_RULES preserve the selected Oxford entry instead of treating a headword as an untyped string.
export const STORY_WORD_USAGE_RULES: readonly string[] = [
  'Treat every Story Word object as one exact Oxford dictionary entry, even when another entry has the same headword.',
  'Use the supplied partOfSpeech as a strict grammatical constraint and, when usageExamples are present, use the meaning they demonstrate.',
  'Use the exact headword in a grammatically natural sentence; reshape the sentence rather than using the word as another part of speech.',
  'Usage examples are sense references only. Never copy an example sentence into the story.',
];

// StoryWordWithUsageExamples is the minimum dictionary context accepted by the moderation projection.
type StoryWordWithUsageExamples = {
  // usageExamples are catalog reference text rather than learner-authored story instructions.
  readonly usageExamples?: readonly string[];
};

// omitStoryWordExamplesFromModeration prevents bundled dictionary prose from creating user strikes.
export function omitStoryWordExamplesFromModeration<
  TStoryWord extends StoryWordWithUsageExamples,
>(storyWords: readonly TStoryWord[]): readonly Omit<TStoryWord, 'usageExamples'>[] {
  return storyWords.map(({ usageExamples: _usageExamples, ...storyWord }) =>
    storyWord
  );
}
