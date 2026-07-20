import type { VocabularyItem } from '@domain/index';

// preferredPhoneticsFallback keeps missing offline pronunciation data explicit.
const preferredPhoneticsFallback: string = 'No phonetics';

// getPreferredPhonetics returns the same US-first pronunciation across vocabulary surfaces.
export function getPreferredPhonetics(
  word: Pick<VocabularyItem, 'phonetics'>,
): string {
  return word.phonetics.us ?? word.phonetics.uk ?? preferredPhoneticsFallback;
}
