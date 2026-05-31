import type { CefrLevel } from './cefrLevel';

// VocabularyItem is the normalized domain shape produced from the Oxford seed.
export type VocabularyItem = {
  // id is stable inside the bundled vocabulary file and route params.
  readonly id: string;
  // word is the dictionary headword shown in lists and details.
  readonly word: string;
  // partOfSpeech stores Oxford's grammatical category for the headword.
  readonly partOfSpeech: string;
  // level is the CEFR bucket used by dictionary filters and badges.
  readonly level: CefrLevel;
  // examples contains Oxford example sentences shipped for offline lookup.
  readonly examples: readonly string[];
  // phonetics stores optional region-specific pronunciations from the seed.
  readonly phonetics: {
    // uk is the British pronunciation when provided by the seed.
    readonly uk?: string;
    // us is the American pronunciation when provided by the seed.
    readonly us?: string;
  };
};
