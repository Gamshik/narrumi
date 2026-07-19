import type { CefrLevel } from './cefrLevel';
import type { LearningGenre } from './learningGenre';
import type { SeriesCharacterProfile } from './seriesCharacter';
import type { SeriesCreativeBrief } from './seriesCreativeBrief';
import type { SeriesParticipationMode } from './seriesParticipationMode';
import type { SeriesSetupDraftMeta } from './seriesSetupDraftMeta';

// newSeriesSetupDraftId is the stable local key for the unfinished create flow.
export const newSeriesSetupDraftId = 'new-series';

// LocalSeriesSetupDraft preserves an incomplete setup form without creating a Series.
export type LocalSeriesSetupDraft = {
  // draftId identifies this local-only form snapshot in device storage.
  readonly draftId: string;
  // seriesId links an editable setup draft to an existing pre-episode series when needed.
  readonly seriesId?: string;
  // title keeps incomplete user input and may be empty.
  readonly title: string;
  // genre stores the current list-selected story category.
  readonly genre: LearningGenre;
  // cefrLevel stores the current list-selected language level.
  readonly cefrLevel: CefrLevel;
  // tone keeps incomplete user input and may be empty.
  readonly tone: string;
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
