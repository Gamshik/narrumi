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
// screenSource protects generation-time guards at the action-handler boundary.
const screenSource: string = readFileSync(
  resolve(__dirname, '../../../DailySessionScreen.tsx'),
  'utf8',
);
// panelSource protects the visible Story Words controls during generation.
const panelSource: string = readFileSync(
  resolve(__dirname, 'StoryWordsPanel.tsx'),
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

test('episode generation locks every Story Words mutation', (): void => {
  assert.match(panelSource, /isLocked \|\|\s+isShuffling/);
  assert.match(dictionaryPickerSource, /disabled=\{isChoosing \|\| isLocked\}/);
  assert.match(dictionaryPickerSource, /if \(isLocked \|\| isChoosing\)/);
  assert.match(
    screenSource,
    /<StoryWordsPanel\s+colors=\{colors\}\s+isLocked=\{isGenerating\}/,
  );
  assert.match(
    screenSource,
    /<DictionaryPickerPanel[\s\S]*?isLocked=\{isGenerating\}/,
  );
  assert.match(
    screenSource,
    /if \(!selectionState \|\| replacingWordId \|\| isShuffling \|\| isGenerating\)/,
  );
  assert.match(
    screenSource,
    /if \(!selectionState \|\| !pickerWordId \|\| isChoosing \|\| isGenerating\)/,
  );
  assert.match(screenSource, /const openDictionaryPicker[\s\S]*?if \(isEpisodeSetupBusy\)/);
});
