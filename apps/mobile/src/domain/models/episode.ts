import type { EpisodeInteraction } from './episodeInteraction';
import type { CefrLevel } from './cefrLevel';
import type { LearningGenre } from './learningGenre';
import type { SyncMetadata } from './syncMetadata';

// EpisodeSentenceFrame stores the explicit reader layout contract for one playback sentence.
export type EpisodeSentenceFrame =
  | {
      // kind keeps ordinary story prose visually unframed.
      readonly kind: 'narration';
      // text is the exact sentence text shown and spoken for this frame.
      readonly text: string;
    }
  | {
      // kind marks a sentence as a character utterance instead of inferred prose.
      readonly kind: 'dialogue';
      // speaker is the validated display name shown above the utterance.
      readonly speaker: string;
      // text is the exact utterance shown and spoken for this frame.
      readonly text: string;
    };

// TranslationAnnotation stores a trusted inline hint after validation.
export type TranslationAnnotation = {
  // wordId links story text to the bundled Oxford item when available.
  readonly wordId?: string;
  // surfaceText is the exact word or phrase shown in the episode.
  readonly surfaceText: string;
  // translation is the context-appropriate learner-language hint.
  readonly translation: string;
  // transcription stores pronunciation help when available.
  readonly transcription?: string;
  // sentenceIndex identifies where the annotated word appears.
  readonly sentenceIndex: number;
};

// Episode is a generated learning unit linked to one personal series.
export type Episode = {
  // id is created locally before any future Supabase sync.
  readonly id: string;
  // seriesId links the episode to its continuity root.
  readonly seriesId: string;
  // orderIndex stores deterministic reading order inside the series.
  readonly orderIndex: number;
  // cefrLevel is the language target selected specifically for this episode.
  readonly cefrLevel: CefrLevel;
  // genre is the story direction selected specifically for this episode.
  readonly genre: LearningGenre;
  // previouslyRecap optionally summarizes prior context for continuity.
  readonly previouslyRecap?: string;
  // title is an optional story-facing episode label.
  readonly title?: string;
  // sceneText stores the validated adaptive main episode content.
  readonly sceneText: string;
  // sentences stores the playback and karaoke-sync units.
  readonly sentences: readonly string[];
  // sentenceFrames stores explicit narration/dialogue layout for every playback unit.
  readonly sentenceFrames: readonly EpisodeSentenceFrame[];
  // storyWordIds are the selected words the episode should use naturally.
  readonly storyWordIds: readonly string[];
  // annotations power tap-to-translate without leaving the reader.
  readonly annotations: readonly TranslationAnnotation[];
  // interactions store ordered learner decisions inside the same episode.
  readonly interactions: readonly EpisodeInteraction[];
  // isComplete tells whether AI ended the current episode arc.
  readonly isComplete: boolean;
  // cliffhanger stores the reason to continue after the episode is complete.
  readonly cliffhanger?: string;
  // summaryUpdate is compact context for updating SeriesMemory.
  readonly summaryUpdate: string;
  // createdAt records local-first creation time.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};
