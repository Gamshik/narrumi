import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// panelSource protects the mounted picker until its coordinated exit finishes.
const panelSource: string = readFileSync(
  resolve(__dirname, 'DictionaryPickerPanel.tsx'),
  'utf8',
);
// transitionSource protects staged Sorbet motion and its reduced-motion fallback.
const transitionSource: string = readFileSync(
  resolve(__dirname, 'useDictionaryPickerTransition.ts'),
  'utf8',
);

test('dictionary picker stages its material entrance and completes its exit', (): void => {
  assert.match(panelSource, /useDictionaryPickerTransition\(reduceMotion, onClose\)/);
  assert.match(panelSource, /const wasChosen: boolean = await onChooseWord\(wordId\)/);
  assert.match(panelSource, /pointerEvents=\{isClosing \? 'none' : 'auto'\}/);
  assert.match(transitionSource, /Animated\.spring\(surfaceProgress/);
  assert.match(transitionSource, /delay: pickerContentEnterDelayMs/);
  assert.match(transitionSource, /onClosedRef\.current\(\)/);
  assert.match(transitionSource, /if \(reduceMotion\)/);
});
