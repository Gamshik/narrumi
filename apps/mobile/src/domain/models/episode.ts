import type { EpisodeInteraction } from './episodeInteraction';
import type { SyncMetadata } from './syncMetadata';

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
  // previouslyRecap optionally summarizes prior context for continuity.
  readonly previouslyRecap?: string;
  // title is an optional story-facing episode label.
  readonly title?: string;
  // sceneText stores the validated adaptive main episode content.
  readonly sceneText: string;
  // sentences stores the playback and karaoke-sync units.
  readonly sentences: readonly string[];
  // storyWordIds are the selected words the episode should use naturally.
  readonly storyWordIds: readonly string[];
  // annotations power tap-to-translate without leaving the reader.
  readonly annotations: readonly TranslationAnnotation[];
  // interaction is the single MVP point where the learner influences the story.
  readonly interaction: EpisodeInteraction;
  // cliffhanger stores the reason to continue the series.
  readonly cliffhanger: string;
  // summaryUpdate is compact context for updating SeriesMemory.
  readonly summaryUpdate: string;
  // createdAt records local-first creation time.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};
