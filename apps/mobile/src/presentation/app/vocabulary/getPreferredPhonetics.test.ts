import assert from 'node:assert/strict';
import test from 'node:test';

import { getPreferredPhonetics } from './getPreferredPhonetics';

test('preferred phonetics uses US, then UK, then an explicit fallback', (): void => {
  assert.equal(
    getPreferredPhonetics({ phonetics: { uk: '/wɜːd/', us: '/wɝːd/' } }),
    '/wɝːd/',
  );
  assert.equal(getPreferredPhonetics({ phonetics: { uk: '/wɜːd/' } }), '/wɜːd/');
  assert.equal(getPreferredPhonetics({ phonetics: {} }), 'No phonetics');
});
