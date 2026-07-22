import assert from 'node:assert/strict';
import test from 'node:test';

import { BundledOxfordVocabularyCatalog } from './bundledOxfordVocabularyCatalog';

// This regression protects the offline Russian meaning joined to Oxford entries.
test('bundled vocabulary exposes Russian translations offline', async (): Promise<void> => {
  const catalog: BundledOxfordVocabularyCatalog =
    new BundledOxfordVocabularyCatalog();
  const words = await catalog.list({ search: 'ability' });
  const ability = words.find((word) => word.word === 'ability');

  assert.equal(ability?.translation, 'способность');
});

// This regression ensures every visible catalog result has usable translation copy.
test('every bundled vocabulary item has a non-empty translation', async (): Promise<void> => {
  const catalog: BundledOxfordVocabularyCatalog =
    new BundledOxfordVocabularyCatalog();
  const words = await catalog.list();

  assert.ok(words.length > 0);
  assert.equal(
    words.filter((word) => word.translation.trim().length === 0).length,
    0,
  );
});
