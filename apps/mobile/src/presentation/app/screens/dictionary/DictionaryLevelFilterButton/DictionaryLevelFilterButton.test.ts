import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// The test protects the visible semantic outline required by the light-theme filter trigger.
test('the unfiltered button uses the contrasting pill border', (): void => {
  // buttonSource is inspected directly so the regression check does not require a native runtime.
  const buttonSource: string = readFileSync(
    resolve(__dirname, 'DictionaryLevelFilterButton.tsx'),
    'utf8',
  );

  assert.match(
    buttonSource,
    /borderColor: isFiltered \? colors\.systemPurple : colors\.pillBorder/,
  );
  assert.doesNotMatch(
    buttonSource,
    /borderColor: isFiltered \? colors\.systemPurple : colors\.bubbleBorder/,
  );
});
