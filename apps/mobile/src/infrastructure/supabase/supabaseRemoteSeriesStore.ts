import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  RemoteSeriesSnapshot,
  RemoteSeriesStore,
  SyncRecord,
} from '@application/ports';

import {
  parseRemoteSnapshot,
  parseUpsertedRecord,
  serializeSyncRecord,
} from './remoteRecordMapper';

// SupabaseRemoteSeriesStore persists the authenticated cloud copy behind RLS.
export class SupabaseRemoteSeriesStore implements RemoteSeriesStore {
  // client owns PostgREST and auth transport details outside application logic.
  private readonly client: SupabaseClient;

  // constructor receives the shared environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // upsert relies on database triggers to keep the newest deterministic version.
  async upsert(ownerId: string, record: SyncRecord): Promise<SyncRecord> {
    const write = serializeSyncRecord(ownerId, record);
    const { data, error } = await this.client
      .from(write.table)
      .upsert(write.row)
      .select()
      .single();

    if (error) {
      throw new Error(`Remote ${record.kind} sync failed: ${error.message}`);
    }

    return parseUpsertedRecord(ownerId, record, data);
  }

  // delete removes a root story or generated episode through RLS-protected tables.
  async delete(
    ownerId: string,
    recordKind: 'series' | 'episode',
    recordId: string,
  ): Promise<void> {
    const table = recordKind === 'series' ? 'series' : 'episodes';
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', recordId)
      .eq('user_id', ownerId);

    if (error) {
      throw new Error(`Remote ${recordKind} delete failed: ${error.message}`);
    }
  }

  // loadSnapshot reads all MVP records visible to the authenticated user.
  async loadSnapshot(ownerId: string): Promise<RemoteSeriesSnapshot> {
    const [
      seriesResult,
      memoryResult,
      episodeResult,
      wordSetResult,
      signalResult,
      preferenceResult,
    ] = await Promise.all([
      this.client.from('series').select('*'),
      this.client.from('series_memory').select('*'),
      this.client.from('episodes').select('*'),
      this.client.from('word_sets').select('*'),
      this.client.from('learning_signals').select('*'),
      this.client.from('preferences').select('*'),
    ]);
    const firstError = [
      seriesResult.error,
      memoryResult.error,
      episodeResult.error,
      wordSetResult.error,
      signalResult.error,
      preferenceResult.error,
    ].find((error) => error !== null);

    if (firstError) {
      throw new Error(`Remote snapshot could not be loaded: ${firstError.message}`);
    }

    return parseRemoteSnapshot(ownerId, {
      series: seriesResult.data,
      seriesMemories: memoryResult.data,
      episodes: episodeResult.data,
      wordSets: wordSetResult.data,
      learningSignals: signalResult.data,
      preferences: preferenceResult.data,
    });
  }
}
