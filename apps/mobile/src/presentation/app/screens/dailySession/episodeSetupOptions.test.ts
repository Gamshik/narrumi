import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEpisodeSetupDefaults } from './episodeSetupOptions';

test('first episode uses settings CEFR and the first genre', (): void => {
  assert.deepEqual(resolveEpisodeSetupDefaults(undefined, 'A2'), {
    cefrLevel: 'A2',
    genre: 'daily-life',
  });
});

test('next episode remembers both choices from the previous episode', (): void => {
  assert.deepEqual(
    resolveEpisodeSetupDefaults(
      { cefrLevel: 'B2', genre: 'science-fiction' },
      'A2',
    ),
    { cefrLevel: 'B2', genre: 'science-fiction' },
  );
});
