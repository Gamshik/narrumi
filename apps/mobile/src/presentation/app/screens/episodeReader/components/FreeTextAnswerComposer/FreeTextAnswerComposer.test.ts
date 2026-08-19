import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// composerSource protects the custom-answer UI contract without a native renderer.
const composerSource: string = readFileSync(
  resolve(__dirname, 'FreeTextAnswerComposer.tsx'),
  'utf8',
);
// readerSource protects original-answer and correction presentation in episode history.
const readerSource: string = readFileSync(
  resolve(__dirname, '../../../EpisodeReaderScreen.tsx'),
  'utf8',
);

test('keeps generated choices available beside an explicit free-answer path', (): void => {
  assert.match(composerSource, /Write my own answer/);
  assert.match(composerSource, /\['speech', 'action'\]/);
  assert.match(composerSource, /'Say' : 'Do'/);
  assert.match(composerSource, /Direct the scene/);
  assert.match(composerSource, /FREE_REPLY_CHARACTER_LIMIT/);
});

test('persists drafts and keeps recoverable guidance editable', (): void => {
  assert.match(composerSource, /DRAFT_SAVE_DELAY_MS/);
  assert.match(composerSource, /onDraftChange\(draft, intent\)/);
  assert.match(composerSource, /Saved on this device while you write/);
  assert.match(composerSource, /Try a small edit/);
  assert.match(composerSource, /Use suggestion/);
});

test('shows corrected wording separately from the original answer', (): void => {
  assert.match(readerSource, /A MORE NATURAL VERSION/);
  assert.match(readerSource, /correctionOwnerKey/);
  assert.match(readerSource, /interaction\.languageFeedback\.correctedText/);
});
