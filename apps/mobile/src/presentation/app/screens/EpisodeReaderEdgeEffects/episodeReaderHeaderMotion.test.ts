import assert from 'node:assert/strict';
import test from 'node:test';

import { getFocusedEpisodeHeaderIndex } from './episodeReaderHeaderMotion';

// The test keeps compact metadata hidden until the first complete heading enters the material.
test('reader header waits for the complete first episode heading', (): void => {
  const headers = [
    { height: 54, index: 0, top: 120 },
    { height: 54, index: 1, top: 620 },
  ] as const;

  assert.equal(
    getFocusedEpisodeHeaderIndex({
      blurBottom: 100,
      headers,
      scrollOffset: 73,
    }),
    undefined,
  );
  assert.equal(
    getFocusedEpisodeHeaderIndex({
      blurBottom: 100,
      headers,
      scrollOffset: 74,
    }),
    0,
  );
});

// The test protects deterministic forward and reverse switching between episode headings.
test('reader header follows the latest episode inside the material', (): void => {
  const headers = [
    { height: 54, index: 0, top: 120 },
    { height: 68, index: 1, top: 620 },
    { height: 54, index: 2, top: 1140 },
  ] as const;

  assert.equal(
    getFocusedEpisodeHeaderIndex({
      blurBottom: 100,
      headers,
      scrollOffset: 588,
    }),
    1,
  );
  assert.equal(
    getFocusedEpisodeHeaderIndex({
      blurBottom: 100,
      headers,
      scrollOffset: 587,
    }),
    0,
  );
});
