import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore } from '@application/ports';
import type { Episode } from '@domain/index';

import { createSaveEpisodeReplyDraft } from './saveEpisodeReplyDraft';

// timestamp is the deterministic version used by local draft persistence tests.
const timestamp: string = '2026-08-13T10:00:00.000Z';

// episode contains one unanswered decision that may own a local free-text draft.
const episode: Episode = {
  id: 'episode:draft',
  seriesId: 'series:draft',
  orderIndex: 1,
  cefrLevel: 'B1',
  genre: 'short-fiction',
  sceneText: 'Mira waits beside the door.',
  sentences: ['Mira waits beside the door.'],
  sentenceFrames: [
    { kind: 'narration', text: 'Mira waits beside the door.' },
  ],
  storyWordIds: [],
  annotations: [],
  interactions: [
    {
      id: 'interaction:draft:1',
      episodeId: 'episode:draft',
      kind: 'choice',
      prompt: 'What happens next?',
      choices: [
        { id: 'open', label: 'Open the door.' },
        { id: 'wait', label: 'Wait outside.' },
      ],
      sentenceEndIndex: 1,
      replyGuidance: {
        reason: 'unclear',
        message: 'Make the action clearer.',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  isComplete: false,
  summaryUpdate: 'Mira waits beside the door.',
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: { isDirty: false, pendingOperationId: 'episode:draft' },
};

describe('saveEpisodeReplyDraft', () => {
  it('saves normalized text and clears guidance for the edited draft', async () => {
    let storedEpisode: Episode = episode;
    const store: LocalSeriesStore = createStore(
      (): Episode => storedEpisode,
      (value: Episode): void => {
        storedEpisode = value;
      },
    );
    const useCase = createSaveEpisodeReplyDraft(store, {
      now: (): Date => new Date(timestamp),
    });

    const result = await useCase.execute({
      episodeId: episode.id,
      interactionId: episode.interactions[0]!.id,
      text: '  Mira   opens the door.  ',
      intent: 'direction',
    });

    assert.equal(
      result.episode.interactions[0]?.replyDraft,
      'Mira opens the door.',
    );
    assert.equal(result.episode.interactions[0]?.replyIntent, 'direction');
    assert.equal(result.episode.interactions[0]?.replyGuidance, undefined);
  });
});

// createStore supplies the focused local episode behavior and inert unrelated ports.
function createStore(
  readEpisode: () => Episode,
  saveEpisode: (episode: Episode) => void,
): LocalSeriesStore {
  return {
    getSeriesSetupDraft: async () => undefined,
    saveSeriesSetupDraft: async () => undefined,
    deleteSeriesSetupDraft: async () => undefined,
    getPreferences: async () => undefined,
    readBootstrapPreferences: async () => ({
      preferences: undefined,
      recovered: false,
    }),
    savePreferences: async () => undefined,
    listSeries: async () => [],
    getSeries: async () => undefined,
    saveSeries: async () => undefined,
    deleteSeries: async () => undefined,
    listEpisodes: async () => [readEpisode()],
    getEpisode: async () => readEpisode(),
    saveEpisode: async (value: Episode) => saveEpisode(value),
    deleteEpisode: async () => undefined,
    getSeriesMemory: async () => undefined,
    saveSeriesMemory: async () => undefined,
    listWordSets: async () => [],
    saveWordSet: async () => undefined,
    listLearningSignals: async () => [],
    saveLearningSignal: async () => undefined,
    getSyncMetadata: async () => undefined,
    saveSyncMetadata: async () => undefined,
  };
}
