import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { LearningPreferences } from '@domain/index';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';
import type { Clock } from '@application/ports';
import { createHydrateBootstrapSession, type BootstrapPreferenceStore } from './hydrateBootstrapSession';

describe('createHydrateBootstrapSession', () => {
  const mockTimestamp = '2026-07-06T18:00:00.000Z';
  const mockClock: Clock = {
    now: () => new Date(mockTimestamp),
  };

  const validPreferences: LearningPreferences = {
    preferredCefrLevel: 'B1',
    preferredGenre: 'short-fiction',
    storyWordGoal: DEFAULT_STORY_WORD_GOAL,
    updatedAt: mockTimestamp,
    sync: {
      isDirty: true,
      pendingOperationId: 'test-sync-id',
    },
  };

  test('returns loaded result without creating new defaults when preferences exist', async () => {
    let savedPreferences: LearningPreferences | undefined;
    const mockStore: BootstrapPreferenceStore = {
      readBootstrapPreferences: async () => ({
        preferences: validPreferences,
        recovered: false,
      }),
      savePreferences: async (prefs) => {
        savedPreferences = prefs;
      },
    };

    const useCase = createHydrateBootstrapSession(mockStore, mockClock);
    const result = await useCase.execute();

    assert.deepEqual(result, {
      kind: 'loaded',
      preferences: validPreferences,
    });
    assert.equal(savedPreferences, undefined, 'Should not save new defaults');
  });

  test('creates product defaults and identifies as created data when missing', async () => {
    let savedPreferences: LearningPreferences | undefined;
    const mockStore: BootstrapPreferenceStore = {
      readBootstrapPreferences: async () => ({
        preferences: undefined,
        recovered: false,
      }),
      savePreferences: async (prefs) => {
        savedPreferences = prefs;
      },
    };

    const useCase = createHydrateBootstrapSession(mockStore, mockClock);
    const result = await useCase.execute();

    assert.equal(result.kind, 'created');
    assert.ok(result.preferences);
    assert.equal(result.preferences.preferredCefrLevel, 'B1');
    assert.equal(result.preferences.storyWordGoal, DEFAULT_STORY_WORD_GOAL);
    assert.deepEqual(savedPreferences, result.preferences, 'Should save new defaults');
    assert.equal(result.preferences.sync.isDirty, true);
  });

  test('creates fresh defaults and identifies as recovered data when invalid', async () => {
    let savedPreferences: LearningPreferences | undefined;
    const mockStore: BootstrapPreferenceStore = {
      readBootstrapPreferences: async () => ({
        preferences: undefined,
        recovered: true,
      }),
      savePreferences: async (prefs) => {
        savedPreferences = prefs;
      },
    };

    const useCase = createHydrateBootstrapSession(mockStore, mockClock);
    const result = await useCase.execute();

    assert.equal(result.kind, 'recovered');
    assert.ok(result.preferences);
    assert.equal(result.preferences.preferredCefrLevel, 'B1');
    assert.deepEqual(savedPreferences, result.preferences, 'Should save recovered defaults');
    assert.equal(result.preferences.sync.isDirty, true);
  });
});
