import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// storyWordCardSource protects pronunciation-first content inside selected cards.
const storyWordCardSource: string = readFileSync(
  resolve(__dirname, 'StoryWordCard/StoryWordCard.tsx'),
  'utf8',
);
// dictionaryPickerSource protects the same content hierarchy in replacement results.
const dictionaryPickerSource: string = readFileSync(
  resolve(__dirname, '../DictionaryPickerPanel/DictionaryPickerPanel.tsx'),
  'utf8',
);

test('Story Words surfaces show phonetics instead of example sentences', (): void => {
  assert.match(storyWordCardSource, /displayedWord\.translation/);
  assert.match(storyWordCardSource, /getPreferredPhonetics\(displayedWord\)/);
  assert.match(storyWordCardSource, /localStyles\.phonetics/);
  assert.match(storyWordCardSource, /color: colors\.labelTertiary/);
  assert.doesNotMatch(storyWordCardSource, /displayedWord\.examples\[0\]/);

  assert.match(dictionaryPickerSource, /word\.translation/);
  assert.match(dictionaryPickerSource, /targetWord\?\.translation/);
  assert.match(dictionaryPickerSource, /getPreferredPhonetics\(word\)/);
  assert.match(dictionaryPickerSource, /panelStyles\.wordPhonetics/);
  assert.match(dictionaryPickerSource, /color: colors\.labelTertiary/);
  assert.doesNotMatch(dictionaryPickerSource, /word\.examples\[0\]/);
});
