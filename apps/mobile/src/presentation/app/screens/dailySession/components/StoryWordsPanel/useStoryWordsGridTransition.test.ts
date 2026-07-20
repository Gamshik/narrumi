import assert from 'node:assert/strict';
import test from 'node:test';

import { countChangedWordSlots } from './storyWordsGridChange';

test('Story Words grid distinguishes local and full replacements', (): void => {
  assert.equal(
    countChangedWordSlots([{ id: 'one' }, { id: 'two' }], [
      { id: 'one' },
      { id: 'two' },
    ]),
    0,
  );
  assert.equal(
    countChangedWordSlots([{ id: 'one' }, { id: 'two' }], [
      { id: 'one' },
      { id: 'three' },
    ]),
    1,
  );
  assert.equal(
    countChangedWordSlots([{ id: 'one' }, { id: 'two' }], [
      { id: 'three' },
      { id: 'four' },
    ]),
    2,
  );
});
