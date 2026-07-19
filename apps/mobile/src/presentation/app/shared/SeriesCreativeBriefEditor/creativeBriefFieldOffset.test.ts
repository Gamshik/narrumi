import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCreativeBriefFieldOffset } from './creativeBriefFieldOffset';

describe('resolveCreativeBriefFieldOffset', (): void => {
  it('keeps the main idea below the controls that precede the editor', (): void => {
    assert.equal(
      resolveCreativeBriefFieldOffset({
        sectionOffsetY: 420,
        groupOffsetY: 0,
        fieldOffsetY: 58,
      }),
      478,
    );
  });

  it('includes the expanded anchors group for nested fields', (): void => {
    assert.equal(
      resolveCreativeBriefFieldOffset({
        sectionOffsetY: 420,
        groupOffsetY: 250,
        fieldOffsetY: 96,
      }),
      766,
    );
  });
});
