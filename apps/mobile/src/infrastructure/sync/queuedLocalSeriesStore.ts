import type {
  LocalLearningSignalFilter,
  LocalSeriesStore,
  LocalWordSetFilter,
  SyncQueue,
  SyncRecordKind,
} from '@application/ports';
import type {
  Episode,
  LearningPreferences,
  LearningSignal,
  Series,
  SeriesMemory,
  SyncMetadata,
  WordSet,
} from '@domain/index';

// QueuedLocalSeriesStore adds durable sync intents after successful local writes.
export class QueuedLocalSeriesStore implements LocalSeriesStore {
  // store remains the immediate source of truth for all reads and writes.
  private readonly store: LocalSeriesStore;
  // queue receives replay pointers only after local persistence succeeds.
  private readonly queue: SyncQueue;

  // constructor composes local persistence with pending-operation storage.
  constructor(store: LocalSeriesStore, queue: SyncQueue) {
    this.store = store;
    this.queue = queue;
  }

  // getPreferences forwards the local preferences read unchanged.
  getPreferences(): Promise<LearningPreferences | undefined> {
    return this.store.getPreferences();
  }

  // savePreferences persists first and queues the singleton preferences record.
  async savePreferences(preferences: LearningPreferences): Promise<void> {
    await this.store.savePreferences(preferences);
    await this.enqueue('preferences', 'preferences', preferences);
  }

  // listSeries forwards the local series list unchanged.
  listSeries(): Promise<readonly Series[]> {
    return this.store.listSeries();
  }

  // getSeries forwards one local series read unchanged.
  getSeries(seriesId: string): Promise<Series | undefined> {
    return this.store.getSeries(seriesId);
  }

  // saveSeries persists first and queues the latest series version.
  async saveSeries(series: Series): Promise<void> {
    await this.store.saveSeries(series);
    await this.enqueue('series', series.id, series);
  }

  // listEpisodes forwards local episode reads unchanged.
  listEpisodes(seriesId: string): Promise<readonly Episode[]> {
    return this.store.listEpisodes(seriesId);
  }

  // getEpisode forwards one local episode read unchanged.
  getEpisode(episodeId: string): Promise<Episode | undefined> {
    return this.store.getEpisode(episodeId);
  }

  // saveEpisode persists first and queues the latest episode version.
  async saveEpisode(episode: Episode): Promise<void> {
    await this.store.saveEpisode(episode);
    await this.enqueue('episode', episode.id, episode);
  }

  // getSeriesMemory forwards one local memory read unchanged.
  getSeriesMemory(seriesId: string): Promise<SeriesMemory | undefined> {
    return this.store.getSeriesMemory(seriesId);
  }

  // saveSeriesMemory persists first and queues bounded continuity state.
  async saveSeriesMemory(memory: SeriesMemory): Promise<void> {
    await this.store.saveSeriesMemory(memory);
    await this.enqueue('seriesMemory', memory.id, memory);
  }

  // listWordSets forwards filtered local word-set reads unchanged.
  listWordSets(
    filter?: LocalWordSetFilter,
  ): Promise<readonly WordSet[]> {
    return this.store.listWordSets(filter);
  }

  // saveWordSet persists first and queues the latest selected vocabulary group.
  async saveWordSet(wordSet: WordSet): Promise<void> {
    await this.store.saveWordSet(wordSet);
    await this.enqueue('wordSet', wordSet.id, wordSet);
  }

  // listLearningSignals forwards filtered local signal reads unchanged.
  listLearningSignals(
    filter?: LocalLearningSignalFilter,
  ): Promise<readonly LearningSignal[]> {
    return this.store.listLearningSignals(filter);
  }

  // saveLearningSignal persists first and queues the append-like signal record.
  async saveLearningSignal(signal: LearningSignal): Promise<void> {
    await this.store.saveLearningSignal(signal);
    await this.enqueue('learningSignal', signal.id, signal);
  }

  // getSyncMetadata forwards standalone metadata reads without queueing.
  getSyncMetadata(recordId: string): Promise<SyncMetadata | undefined> {
    return this.store.getSyncMetadata(recordId);
  }

  // saveSyncMetadata forwards metadata writes because they are not cloud records.
  saveSyncMetadata(
    recordId: string,
    metadata: SyncMetadata,
  ): Promise<void> {
    return this.store.saveSyncMetadata(recordId, metadata);
  }

  // enqueue stores a unique replay id while preserving the record's conflict id.
  private async enqueue(
    recordKind: SyncRecordKind,
    recordId: string,
    record: { readonly updatedAt: string; readonly sync: SyncMetadata },
  ): Promise<void> {
    await this.queue.enqueue({
      operationId: `${recordKind}:${recordId}:${record.sync.pendingOperationId}`,
      recordKind,
      recordId,
      clientUpdatedAt: record.updatedAt,
      createdAt: record.updatedAt,
    });
  }
}
