import assert from 'node:assert/strict';
import test from 'node:test';

import { motion } from './tokens';

// The test callback protects visible press feedback from regressing to subtle values.
test('motion press feedback stays visible for Bubble controls', (): void => {
  assert.ok(
    motion.pressScale <= 0.94,
    'pressScale must be strong enough to notice on large rows and buttons',
  );
  assert.ok(
    motion.pressedOpacity <= 0.86,
    'pressedOpacity must visibly soften controls while preserving readability',
  );
  assert.ok(
    motion.releaseSpringBounciness > 0,
    'releaseSpringBounciness must be greater than zero to provide a tactile jelly bounce',
  );
});
