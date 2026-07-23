import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GenerateEpisodeResult } from '@application/index';
import type { Episode, WordSet } from '@domain/index';

import { createEpisodeGenerationTracker } from './episodeGenerationTracker';

// timestamp is the stable version used by the route-lifecycle regression fixture.
const timestamp = '2026-07-16T12:00:00.000Z';

// episode is the completed generation result retained after a screen unmounts.
const episode: Episode = {
  id: 'episode:series:test:1',
  seriesId: 'series:test',
  orderIndex: 1,
  cefrLevel: 'B1',
  genre: 'daily-life',
  sceneText: 'Mira found a quiet door.',
  sentences: ['Mira found a quiet door.'],
  sentenceFrames: [{ kind: 'narration', text: 'Mira found a quiet door.' }],
  storyWordIds: [],
  annotations: [],
  interactions: [],
  isComplete: false,
  summaryUpdate: 'Mira found a quiet door.',
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: true,
    pendingOperationId: 'episode:test:create',
  },
};

// episodeWordSet is the minimum valid request context tracked above navigation.
const episodeWordSet: WordSet = {
  id: 'episode-words:test',
  kind: 'episode',
  seriesId: 'series:test',
  wordIds: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'episode-words:test',
  },
};

describe('episodeGenerationTracker', () => {
  it('keeps one request and its loading state across route subscriptions', async () => {
    // resolveGeneration lets the test inspect the tracker before the request settles.
    let resolveGeneration: ((result: GenerateEpisodeResult) => void) | undefined;
    // executeCallCount proves a remounted route joins rather than restarts generation.
    let executeCallCount: number = 0;
    const tracker = createEpisodeGenerationTracker(
      (): Promise<GenerateEpisodeResult> => {
        executeCallCount += 1;

        return new Promise<GenerateEpisodeResult>((resolve) => {
          resolveGeneration = resolve;
        });
      },
    );
    const input = {
      cefrLevel: 'B1',
      episodeWordSet,
      genre: 'daily-life',
      seriesId: 'series:test',
    } as const;

    const firstRequest = tracker.start(input);
    const secondRequest = tracker.start(input);

    assert.equal(firstRequest, secondRequest);
    assert.equal(
      tracker.getSnapshot().get('series:test')?.kind,
      'generating',
    );

    await Promise.resolve();
    assert.equal(executeCallCount, 1);
    assert.ok(resolveGeneration);
    resolveGeneration({ episode });
    await firstRequest;

    assert.equal(
      tracker.getSnapshot().get('series:test')?.kind,
      'completed',
    );

    tracker.clear('series:test');
    assert.equal(tracker.getSnapshot().has('series:test'), false);
  });
});
