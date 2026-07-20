import type { VocabularyItem } from '@domain/index';

// countChangedWordSlots separates one local replacement from a full-grid update.
export function countChangedWordSlots(
  currentWords: readonly Pick<VocabularyItem, 'id'>[],
  nextWords: readonly Pick<VocabularyItem, 'id'>[],
): number {
  const slotCount: number = Math.max(currentWords.length, nextWords.length);
  let changedSlotCount: number = 0;

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    if (currentWords[slotIndex]?.id !== nextWords[slotIndex]?.id) {
      changedSlotCount += 1;
    }
  }

  return changedSlotCount;
}
