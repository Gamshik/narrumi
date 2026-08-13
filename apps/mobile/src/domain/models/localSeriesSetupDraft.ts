import type { SeriesCharacterProfile } from './seriesCharacter';
import type { SeriesCreativeBrief } from './seriesCreativeBrief';
import type { SeriesParticipationMode } from './seriesParticipationMode';
import type { SeriesSetupDraftMeta } from './seriesSetupDraftMeta';

// newSeriesSetupDraftId preserves the legacy singleton draft key for existing installations.
export const newSeriesSetupDraftId = 'new-series';

// createNewSeriesSetupDraftId creates a distinct local key for every fresh setup flow.
export function createNewSeriesSetupDraftId(
  updatedAt: string,
  entropy: number,
): string {
  // timestamp keeps generated ids sortable and debuggable without exposing form content.
  const timestamp: number = Date.parse(updatedAt);
  // normalizedEntropy bounds caller randomness before converting it into a compact suffix.
  const normalizedEntropy: number = Number.isFinite(entropy)
    ? Math.abs(entropy % 1)
    : 0;
  // nonce prevents two fresh flows opened in the same millisecond from sharing a key.
  const nonce: string = Math.floor(normalizedEntropy * 2_176_782_336)
    .toString(36)
    .padStart(6, '0');

  if (!Number.isFinite(timestamp)) {
    throw new Error('Draft timestamp must be a valid ISO date.');
  }

  return `new-series:${timestamp}:${nonce}`;
}

// LocalSeriesSetupDraft preserves an incomplete setup form without creating a Series.
export type LocalSeriesSetupDraft = {
  // draftId identifies this local-only form snapshot in device storage.
  readonly draftId: string;
  // seriesId links an editable setup draft to an existing pre-episode series when needed.
  readonly seriesId?: string;
  // title keeps incomplete user input and may be empty.
  readonly title: string;
  // premise keeps incomplete user or AI setup text and may be empty.
  readonly premise: string;
  // participationMode stores the current producer or character choice.
  readonly participationMode: SeriesParticipationMode;
  // characterProfiles preserves incomplete editable character rows.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
  // userRole keeps incomplete character-mode input and may be empty.
  readonly userRole: string;
  // creativeBrief preserves optional user-authored anchors while the form is unfinished.
  readonly creativeBrief: SeriesCreativeBrief;
  // setupDraftMeta tracks which form values remain safe for AI regeneration.
  readonly setupDraftMeta: SeriesSetupDraftMeta;
  // updatedAt orders local snapshots and supports deterministic replacement.
  readonly updatedAt: string;
};
