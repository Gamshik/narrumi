import type { CefrLevel } from './cefrLevel';

export type VocabularyItem = {
  readonly id: string;
  readonly word: string;
  readonly partOfSpeech: string;
  readonly level: CefrLevel;
  readonly examples: readonly string[];
  readonly phonetics: {
    readonly uk?: string;
    readonly us?: string;
  };
};
