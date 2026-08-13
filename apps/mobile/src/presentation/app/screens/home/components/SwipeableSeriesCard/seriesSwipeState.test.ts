import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { resolveOpenSwipeRowId } from './seriesSwipeState';

// The suite protects single-open-row ownership across overlapping native close animations.
describe('resolveOpenSwipeRowId', (): void => {
  // A newly opened row always becomes the single source of truth.
  test('assigns ownership to the row that starts opening', (): void => {
    assert.equal(resolveOpenSwipeRowId('series-a', 'draft-b', true), 'draft-b');
  });

  // The old row can finish closing after a new row opens and must not clear the new owner.
  test('ignores a stale close callback from another row', (): void => {
    assert.equal(
      resolveOpenSwipeRowId('draft-b', 'series-a', false),
      'draft-b',
    );
  });

  // A row closing itself releases ownership normally.
  test('clears ownership when the current row closes', (): void => {
    assert.equal(resolveOpenSwipeRowId('draft-a', 'draft-a', false), undefined);
  });
});
