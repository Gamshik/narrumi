import assert from 'node:assert/strict';
import test from 'node:test';

import { darkColors, lightColors, motion } from './tokens';

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

// The test callback keeps all edge fades transparent at entry and modal fades quieter than navigation fades.
test('Sorbet edge fades preserve transparent scroll entry points', (): void => {
  assert.match(lightColors.edgeFadeTopGradient[3], /, 0\)$/);
  assert.match(darkColors.edgeFadeTopGradient[3], /, 0\)$/);
  assert.match(lightColors.edgeFadeBottomGradient[0], /, 0\)$/);
  assert.match(darkColors.edgeFadeBottomGradient[0], /, 0\)$/);
  assert.match(lightColors.modalEdgeFadeBottomGradient[0], /, 0\)$/);
  assert.match(darkColors.modalEdgeFadeBottomGradient[0], /, 0\)$/);
  assert.match(darkColors.edgeFadeTopGradient[1], /0\.86\)$/);
  assert.match(darkColors.edgeFadeTopGradient[2], /0\.56\)$/);
  assert.ok(
    lightColors.modalEdgeFadeBottomGradient[2].endsWith('0.54)'),
    'light modal fade must remain translucent at the device edge',
  );
  assert.ok(
    darkColors.modalEdgeFadeBottomGradient[2].endsWith('0.58)'),
    'dark modal fade must remain translucent at the device edge',
  );
});
