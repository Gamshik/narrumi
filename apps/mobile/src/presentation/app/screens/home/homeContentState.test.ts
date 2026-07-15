import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getHomeContentState } from './homeContentState';

// The suite protects the Home loading gate from regressing to an empty-state flash.
describe('getHomeContentState', (): void => {
  // An unresolved query must win even though the initial series collection is empty.
  test('returns loading before an empty initial collection has settled', (): void => {
    assert.equal(getHomeContentState(true, 0), 'loading');
  });

  // A settled empty collection is the only state allowed to show the Create story empty view.
  test('returns empty after loading finishes without saved series', (): void => {
    assert.equal(getHomeContentState(false, 0), 'empty');
  });

  // A settled populated collection renders the user's saved-series list.
  test('returns ready after saved series finish loading', (): void => {
    assert.equal(getHomeContentState(false, 2), 'ready');
  });
});
