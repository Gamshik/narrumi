import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { LearningPreferences } from '@domain/index';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';
import {
  canRenderGuardedSurfaces,
  applyBootstrapPreferences,
  applyBootstrapSyncOutcome,
  getBootstrapSyncWarning,
  startBootstrapSync,
  type BootstrapState,
} from './bootstrapState';

describe('bootstrapState', () => {
  const mockPreferences: LearningPreferences = {
    preferredCefrLevel: 'B1',
    preferredGenre: 'short-fiction',
    storyWordGoal: DEFAULT_STORY_WORD_GOAL,
    updatedAt: new Date().toISOString(),
    sync: {
      isDirty: false,
      pendingOperationId: 'none',
    },
  };

  describe('canRenderGuardedSurfaces', () => {
    test('blocks guarded surfaces when hydrating', () => {
      const state: BootstrapState = { kind: 'hydrating' };
      assert.equal(canRenderGuardedSurfaces(state), false);
    });

    test('blocks guarded surfaces when local hydration failed', () => {
      const state: BootstrapState = { kind: 'failed' };
      assert.equal(canRenderGuardedSurfaces(state), false);
    });

    test('releases guarded surfaces when ready regardless of sync status', () => {
      const readyStateSyncing: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'syncing',
      };
      assert.equal(canRenderGuardedSurfaces(readyStateSyncing), true);

      const readyStateOffline: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: true,
        syncStatus: 'offline',
      };
      assert.equal(canRenderGuardedSurfaces(readyStateOffline), true);

      const readyStateFailedSync: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'failed',
      };
      assert.equal(canRenderGuardedSurfaces(readyStateFailedSync), true);
    });
  });

  describe('getBootstrapSyncWarning', () => {
    test('returns undefined when hydrating or failed locally', () => {
      assert.equal(getBootstrapSyncWarning({ kind: 'hydrating' }), undefined);
      assert.equal(getBootstrapSyncWarning({ kind: 'failed' }), undefined);
    });

    test('returns undefined for quiet sync outcomes (synced, offline, syncing, unauthenticated)', () => {
      const state: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'offline',
      };
      assert.equal(getBootstrapSyncWarning(state), undefined);

      assert.equal(
        getBootstrapSyncWarning({ ...state, syncStatus: 'synced' }),
        undefined,
      );
      assert.equal(
        getBootstrapSyncWarning({ ...state, syncStatus: 'syncing' }),
        undefined,
      );
      assert.equal(
        getBootstrapSyncWarning({ ...state, syncStatus: 'unauthenticated' }),
        undefined,
      );
    });

    test('returns warning context when sync explicitly failed', () => {
      const state: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'failed',
      };
      assert.deepEqual(getBootstrapSyncWarning(state), {
        warning: 'sync_failed',
      });
    });
  });

  describe('preference and sync transitions', () => {
    test('keeps newly saved preferences through syncing and failure states', () => {
      const initialState: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'synced',
      };
      const savedPreferences: LearningPreferences = {
        ...mockPreferences,
        preferredCefrLevel: 'C1',
        storyWordGoal: 10,
        updatedAt: '2026-07-16T00:00:00.000Z',
        sync: {
          isDirty: true,
          pendingOperationId: 'preferences:new',
        },
      };
      const savedState = applyBootstrapPreferences(
        initialState,
        savedPreferences,
      );
      const syncingState = startBootstrapSync(savedState);
      const failedState = applyBootstrapSyncOutcome(syncingState, {
        status: 'failed',
        errorMessage: 'preferences preferences: permission denied',
      });

      assert.equal(failedState.kind, 'ready');
      if (failedState.kind !== 'ready') return;
      assert.equal(failedState.preferences.preferredCefrLevel, 'C1');
      assert.equal(failedState.preferences.storyWordGoal, 10);
      assert.equal(
        failedState.syncErrorMessage,
        'preferences preferences: permission denied',
      );
    });

    test('clears the previous sync error when retrying', () => {
      const failedState: BootstrapState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'failed',
        syncErrorMessage: 'old failure',
      };
      const syncingState = startBootstrapSync(failedState);

      assert.equal(syncingState.kind, 'ready');
      if (syncingState.kind !== 'ready') return;
      assert.equal(syncingState.syncStatus, 'syncing');
      assert.equal(syncingState.syncErrorMessage, undefined);
    });
  });
});
