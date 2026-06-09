import type {
  Episode,
  LearningPreferences,
  LearningSignal,
  Series,
  SeriesMemory,
  WordSet,
} from '@domain/index';

import type { SyncRecordKind } from './syncQueue';

// SyncRecord is one validated domain record crossing the remote persistence boundary.
export type SyncRecord =
  | { readonly kind: 'series'; readonly value: Series }
  | { readonly kind: 'seriesMemory'; readonly value: SeriesMemory }
  | { readonly kind: 'episode'; readonly value: Episode }
  | { readonly kind: 'wordSet'; readonly value: WordSet }
  | { readonly kind: 'learningSignal'; readonly value: LearningSignal }
  | { readonly kind: 'preferences'; readonly value: LearningPreferences };

// RemoteSeriesSnapshot contains every validated cloud record visible through RLS.
export type RemoteSeriesSnapshot = {
  // series are user-owned story roots.
  readonly series: readonly Series[];
  // seriesMemories are bounded continuity records reconciled independently.
  readonly seriesMemories: readonly SeriesMemory[];
  // episodes are generated learning units.
  readonly episodes: readonly Episode[];
  // wordSets are lightweight selected vocabulary groups.
  readonly wordSets: readonly WordSet[];
  // learningSignals are append-like vocabulary events.
  readonly learningSignals: readonly LearningSignal[];
  // preferences stores the singleton user defaults when present.
  readonly preferences?: LearningPreferences;
};

// RemoteSeriesStore hides Supabase row shapes and transport behavior from sync logic.
export type RemoteSeriesStore = {
  // upsert atomically keeps the newest client version and returns the canonical remote record.
  readonly upsert: (
    ownerId: string,
    record: SyncRecord,
  ) => Promise<SyncRecord>;
  // delete removes a user-owned cloud record; database cascades handle child rows.
  readonly delete: (
    ownerId: string,
    recordKind: Extract<SyncRecordKind, 'series' | 'episode'>,
    recordId: string,
  ) => Promise<void>;
  // loadSnapshot reads the authenticated user's complete MVP cloud copy.
  readonly loadSnapshot: (ownerId: string) => Promise<RemoteSeriesSnapshot>;
};

// syncRecordKinds lists every record kind supported by the MVP sync boundary.
export const syncRecordKinds: readonly SyncRecordKind[] = [
  'series',
  'seriesMemory',
  'episode',
  'wordSet',
  'learningSignal',
  'preferences',
];
