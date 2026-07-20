import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearEpisodeExcerptSelectionForOwner,
  createEpisodeExcerptSelection,
  createSelectionOwnerKey,
  shouldDismissReaderSelectionForScroll,
} from './episodeExcerptSelection';

test('deselection clears only the native surface that owns the active range', (): void => {
  const currentSelection = {
    ownerKey: 'episode:2:sentence:1',
    selectedText: 'quiet harbor',
  };

  assert.equal(
    clearEpisodeExcerptSelectionForOwner({
      currentSelection,
      ownerKey: 'episode:2:sentence:1',
    }),
    undefined,
  );
  assert.equal(
    clearEpisodeExcerptSelectionForOwner({
      currentSelection,
      ownerKey: 'episode:1:sentence:4',
    }),
    currentSelection,
  );
});

test('createEpisodeExcerptSelection returns only the trimmed selected text', (): void => {
  const sentence: string = 'The narrow passage led beneath the harbor wall.';
  const start: number = sentence.indexOf(' narrow');
  const end: number = sentence.indexOf(' led');

  const selection = createEpisodeExcerptSelection({
    end,
    ownerKey: createSelectionOwnerKey('episode:1', 'sentence:1'),
    start,
    text: sentence,
  });

  assert.deepEqual(selection, {
    ownerKey: createSelectionOwnerKey('episode:1', 'sentence:1'),
    selectedText: 'narrow passage',
  });
});

test('createEpisodeExcerptSelection rejects a collapsed or whitespace-only range', (): void => {
  assert.equal(
    createEpisodeExcerptSelection({
      end: 4,
      ownerKey: createSelectionOwnerKey('episode:1', 'sentence:0'),
      start: 3,
      text: 'One  scene.',
    }),
    undefined,
  );
});

test('reader selection ignores native micro-movement but closes after real scrolling', (): void => {
  assert.equal(shouldDismissReaderSelectionForScroll(120, 122), false);
  assert.equal(shouldDismissReaderSelectionForScroll(120, 124), true);
});
