import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canNavigateToEpisodeSetupStep,
  getEpisodeSetupStepIndex,
  getEpisodeSetupSummaryItems,
} from './episodeSetupSteps';

test('episode setup keeps details before Story Words', (): void => {
  assert.equal(getEpisodeSetupStepIndex('details'), 0);
  assert.equal(getEpisodeSetupStepIndex('words'), 1);
});

test('episode setup opens only reached steps', (): void => {
  assert.equal(canNavigateToEpisodeSetupStep('details', 0), true);
  assert.equal(canNavigateToEpisodeSetupStep('words', 0), false);
  assert.equal(canNavigateToEpisodeSetupStep('words', 1), true);
});

test('episode setup summaries use compact user-facing labels', (): void => {
  assert.deepEqual(getEpisodeSetupSummaryItems('B1', 'cozy-mystery'), [
    { label: 'Level', value: 'B1' },
    { label: 'Genre', value: 'Cozy Mystery' },
  ]);
});
