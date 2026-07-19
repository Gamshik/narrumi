import assert from 'node:assert/strict';
import test from 'node:test';

import { describeDraftStrategy } from './draftStrategyDescription';

// This test protects the visible explanation when Fill gaps cannot remove characters.
test('Fill gaps explains a smaller cast-size conflict', (): void => {
  assert.equal(
    describeDraftStrategy('fill-missing', 1, 4),
    'Keeps your 4 existing characters. Use Refine or Rebuild to reduce the cast to 1.',
  );
});

// This test keeps numeric Refine preferences explicit instead of discretionary.
test('Refine describes the selected cast size as exact', (): void => {
  assert.equal(
    describeDraftStrategy('refine', 1, 4),
    'Fills gaps, selectively improves the draft, and applies exactly 1 character.',
  );
  assert.match(describeDraftStrategy('refine', 4, 1), /exactly 4 characters/);
});
