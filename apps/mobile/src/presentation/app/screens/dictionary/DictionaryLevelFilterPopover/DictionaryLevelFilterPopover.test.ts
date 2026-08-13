import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// The test protects the visible semantic outline required by unselected light-theme filter items.
test('unselected level filters use the contrasting pill border', (): void => {
  // popoverSource is the rendered filter implementation inspected without requiring a native test runtime.
  const popoverSource: string = readFileSync(
    resolve(__dirname, 'DictionaryLevelFilterPopover.tsx'),
    'utf8',
  );

  assert.match(
    popoverSource,
    /borderColor: isSelected \? colors\.systemPurple : colors\.pillBorder/,
  );
  assert.doesNotMatch(
    popoverSource,
    /borderColor: isSelected \? colors\.systemPurple : colors\.bubbleBorder/,
  );
});
