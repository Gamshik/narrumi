import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { BootstrapState } from './bootstrapState';
import { getBootstrapUiContent } from './bootstrapUiState';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';

describe('bootstrapUiState', () => {
  describe('getBootstrapUiContent', () => {
    test('maps hydrating to calm loading content', () => {
      const state: BootstrapState = { kind: 'hydrating' };
      const content = getBootstrapUiContent(state);

      assert.equal(content.title, 'Preparing your session...');
      assert.equal(content.subtitle, undefined);
      assert.equal(content.isError, false);
    });

    test('maps failed local hydration to a retryable error message', () => {
      const state: BootstrapState = { kind: 'failed' };
      const content = getBootstrapUiContent(state);

      assert.equal(content.title, 'Unable to load session');
      assert.equal(content.subtitle, 'Please try again to continue learning.');
      assert.equal(content.isError, true);
    });

    test('throws if called with a ready state', () => {
      const state: BootstrapState = {
        kind: 'ready',
        preferences: {
          preferredCefrLevel: 'B1',
          preferredGenre: 'short-fiction',
          storyWordGoal: DEFAULT_STORY_WORD_GOAL,
          updatedAt: new Date().toISOString(),
          sync: { isDirty: false, pendingOperationId: 'none' },
        },
        recovered: false,
        syncStatus: 'offline',
      };

      assert.throws(() => getBootstrapUiContent(state), {
        message: 'getBootstrapUiContent must not be called when bootstrap is ready.',
      });
    });
  });
});
