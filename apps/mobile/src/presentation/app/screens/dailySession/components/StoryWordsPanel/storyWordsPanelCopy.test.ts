import assert from 'node:assert/strict';
import test from 'node:test';

import { getSelectedStoryWordsLabel } from './storyWordsPanelCopy';

test('Story Words badge reports the visible episode selection count', (): void => {
  assert.equal(getSelectedStoryWordsLabel(7), '7 selected');
});
