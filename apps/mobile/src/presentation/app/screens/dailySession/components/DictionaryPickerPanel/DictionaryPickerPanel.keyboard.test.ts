import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// screenSource protects the parent scroll boundary that otherwise consumes the first keyboard-visible tap.
const screenSource: string = readFileSync(
  resolve(__dirname, '../../../DailySessionScreen.tsx'),
  'utf8',
);
// pickerSource protects the nested result list that forwards a handled word-row tap.
const pickerSource: string = readFileSync(
  resolve(__dirname, 'DictionaryPickerPanel.tsx'),
  'utf8',
);

test('dictionary results receive the first tap while search owns the keyboard', (): void => {
  assert.match(
    screenSource,
    /<Animated\.ScrollView\s+contentContainerStyle=\{\[styles\.screenContent, setupContentInsets\]\}\s+keyboardShouldPersistTaps="handled"/,
  );
  assert.match(pickerSource, /keyboardShouldPersistTaps="handled"/);
});
