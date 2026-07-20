import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// panelSource protects the contract that global controls react only to a full shuffle.
const panelSource: string = readFileSync(
  resolve(__dirname, 'StoryWordsPanel.tsx'),
  'utf8',
);
// cardSource protects the local transition and accessible reduced-motion fallback.
const cardSource: string = readFileSync(
  resolve(__dirname, 'StoryWordCard/StoryWordCard.tsx'),
  'utf8',
);
// screenSource protects the word-id state that identifies only the active replacement.
const screenSource: string = readFileSync(
  resolve(__dirname, '../../../DailySessionScreen.tsx'),
  'utf8',
);

test('a single Story Word shuffle keeps feedback local to its card', (): void => {
  assert.match(screenSource, /const \[replacingWordId, setReplacingWordId\]/);
  assert.match(panelSource, /isReplacing=\{word\.id === replacingWordId\}/);
  assert.doesNotMatch(
    panelSource,
    /replacingWordId && styles\.disabledControl/,
  );
  assert.match(cardSource, /displayedWordIdRef/);
  assert.match(cardSource, /replacementIconRotation/);
  assert.match(cardSource, /useReducedMotionPreference/);
});

test('Shuffle all swaps one stable grid without per-card springs', (): void => {
  assert.match(panelSource, /useStoryWordsGridTransition\(words, reduceMotion\)/);
  assert.match(panelSource, /displayedWords\.map/);
  assert.match(panelSource, /opacity: gridOpacity/);
  assert.match(panelSource, /animateWordChanges=\{animateCardChanges\}/);
  assert.doesNotMatch(panelSource, /isShuffling && styles\.disabledControl/);
  assert.match(cardSource, /reduceMotion \|\| !animateWordChanges/);
});
