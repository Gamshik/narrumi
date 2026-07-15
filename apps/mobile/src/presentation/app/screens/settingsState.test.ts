import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { BootstrapReadyState } from '../bootstrap/bootstrapState';
import { getSettingsWarning, getSettingsSaveError } from './settingsState';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';

describe('settingsState', () => {
  const mockPreferences = {
    preferredCefrLevel: 'B1' as const,
    preferredGenre: 'short-fiction' as const,
    storyWordGoal: DEFAULT_STORY_WORD_GOAL,
    updatedAt: new Date().toISOString(),
    sync: { isDirty: false, pendingOperationId: 'none' },
  };

  describe('getSettingsWarning', () => {
    test('returns undefined for normal ready state', () => {
      const state: BootstrapReadyState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'synced',
      };
      assert.equal(getSettingsWarning(state), undefined);
    });

    test('returns recovery warning when data was recovered', () => {
      const state: BootstrapReadyState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: true,
        syncStatus: 'synced',
      };
      const warning = getSettingsWarning(state);
      assert.equal(warning?.title, 'Settings Recovered');
      assert.equal(warning?.isError, true);
    });

    test('returns sync error when sync fails', () => {
      const state: BootstrapReadyState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'failed',
        syncErrorMessage: 'preferences preferences: permission denied',
      };
      const warning = getSettingsWarning(state);
      assert.equal(warning?.title, 'Sync Failed');
      assert.equal(warning?.isError, true);
      assert.equal(
        warning?.message,
        'Your changes are saved locally. preferences preferences: permission denied',
      );
    });

    test('returns offline warning when offline', () => {
      const state: BootstrapReadyState = {
        kind: 'ready',
        preferences: mockPreferences,
        recovered: false,
        syncStatus: 'offline',
      };
      const warning = getSettingsWarning(state);
      assert.equal(warning?.title, 'Offline');
      assert.equal(warning?.isError, false);
    });
  });

  describe('getSettingsSaveError', () => {
    test('returns undefined when there is no error', () => {
      assert.equal(getSettingsSaveError(undefined), undefined);
    });

    test('returns formatted error message when error exists', () => {
      const error = getSettingsSaveError(new Error('Network error'));
      assert.equal(error, 'Unable to save settings. Changes were reverted.');
    });
  });
});
