import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// translationSheetSource protects the intentionally minimal visible content contract.
const translationSheetSource: string = readFileSync(
  resolve(__dirname, 'TranslationSheet.tsx'),
  'utf8',
);

test('renders all four Story Word fields and no explanatory teaching copy', (): void => {
  assert.match(translationSheetSource, /details\.word/);
  assert.match(translationSheetSource, /details\.transcription/);
  assert.match(translationSheetSource, /details\.translation/);
  assert.match(translationSheetSource, /details\.partOfSpeech/);
  assert.doesNotMatch(translationSheetSource, /Context-aware hint/);
  assert.doesNotMatch(translationSheetSource, /OXFORD EXAMPLES/);
});
