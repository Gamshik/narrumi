import type { TranslationAnnotation, VocabularyItem } from '@domain/index';

// missingStoryWordDetail keeps legacy annotations readable without inventing dictionary data.
const missingStoryWordDetail: string = '—';

// StoryWordSheetDetails is the complete, intentionally compact Story Word card contract.
export type StoryWordSheetDetails = {
  // word is the canonical dictionary headword or the exact annotated surface fallback.
  readonly word: string;
  // transcription is the bundled pronunciation or validated annotation fallback.
  readonly transcription: string;
  // translation preserves the context-aware meaning generated for this episode.
  readonly translation: string;
  // partOfSpeech is the Oxford grammatical category for the selected Story Word.
  readonly partOfSpeech: string;
};

// createStoryWordSheetDetails merges trusted episode context with bundled dictionary metadata.
export function createStoryWordSheetDetails(
  annotation: TranslationAnnotation,
  vocabularyItem?: VocabularyItem,
): StoryWordSheetDetails {
  // transcription prefers the shared Oxford pronunciation used across vocabulary surfaces.
  const transcription: string =
    vocabularyItem?.phonetics.us ??
    vocabularyItem?.phonetics.uk ??
    annotation.transcription ??
    missingStoryWordDetail;

  return {
    word: vocabularyItem?.word ?? annotation.surfaceText,
    transcription,
    translation: annotation.translation,
    partOfSpeech: vocabularyItem?.partOfSpeech ?? missingStoryWordDetail,
  };
}
