import { assertEquals, assertNotEquals } from 'jsr:@std/assert';

import { fingerprintGenerationRequest } from './generationIdempotency.ts';

Deno.test('generation fingerprint ignores object key order', async (): Promise<void> => {
  const left = await fingerprintGenerationRequest({
    seriesId: 'series:1',
    orderIndex: 3,
    nested: { tone: 'calm', words: ['one', 'two'] },
  });
  const right = await fingerprintGenerationRequest({
    nested: { words: ['one', 'two'], tone: 'calm' },
    orderIndex: 3,
    seriesId: 'series:1',
  });

  assertEquals(left, right);
});

Deno.test('generation fingerprint changes with logical input', async (): Promise<void> => {
  const episodeThree = await fingerprintGenerationRequest({ orderIndex: 3 });
  const episodeFour = await fingerprintGenerationRequest({ orderIndex: 4 });

  assertNotEquals(episodeThree, episodeFour);
});
