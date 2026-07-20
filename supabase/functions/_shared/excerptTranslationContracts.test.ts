import { assertEquals } from 'jsr:@std/assert';

import {
  excerptTranslationPayloadSchema,
  translateExcerptRequestSchema,
} from './excerptTranslationContracts.ts';

Deno.test('excerpt translation contracts accept bounded plain text', (): void => {
  const requestResult = translateExcerptRequestSchema.safeParse({
    selectedText: 'a narrow escape',
  });
  const payloadResult = excerptTranslationPayloadSchema.safeParse({
    translation: 'едва удалось спастись',
  });

  assertEquals(requestResult.success, true);
  assertEquals(payloadResult.success, true);
});

Deno.test('excerpt translation contracts reject surrounding context', (): void => {
  const result = translateExcerptRequestSchema.safeParse({
    selectedText: 'a narrow escape',
    contextBefore: 'It had been',
  });

  assertEquals(result.success, false);
});
