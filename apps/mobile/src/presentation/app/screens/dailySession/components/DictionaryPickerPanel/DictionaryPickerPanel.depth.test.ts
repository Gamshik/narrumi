import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// pickerSource protects the intentionally asymmetric upper and lower edge depth.
const pickerSource: string = readFileSync(
  resolve(__dirname, 'DictionaryPickerPanel.tsx'),
  'utf8',
);

test('dictionary picker keeps a shorter lower span with the same edge effect', (): void => {
  assert.match(pickerSource, /pickerTopEdgeDepth: number = 36/);
  assert.match(pickerSource, /pickerBottomEdgeDepth: number = 12/);
  assert.match(pickerSource, /outputRange: \[0\.08, 1, 1, 0\.08\]/);
  assert.match(pickerSource, /outputRange: \[0\.98, 1, 1, 0\.98\]/);
});
