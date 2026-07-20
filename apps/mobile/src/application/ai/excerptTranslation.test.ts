import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseExcerptTranslationPayload,
  translateExcerptRequestSchema,
} from './excerptTranslation';

test('parseExcerptTranslationPayload accepts one concise translation', (): void => {
  assert.deepEqual(parseExcerptTranslationPayload({ translation: 'Тихая гавань' }), {
    translation: 'Тихая гавань',
  });
});

test('parseExcerptTranslationPayload rejects missing translation text', (): void => {
  assert.throws((): void => {
    parseExcerptTranslationPayload({ explanation: 'A note' });
  });
});

test('translateExcerptRequestSchema strips fields outside the exact text contract', (): void => {
  const result = translateExcerptRequestSchema.safeParse({
    selectedText: 'the harbor',
    contextBefore: 'The model must not receive surrounding prose.',
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { selectedText: 'the harbor' });
});
