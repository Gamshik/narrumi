import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { resolveOptionalAiEnrichment } from './optionalAiEnrichment.ts';

Deno.test('optional AI enrichment returns generated output after success', async (): Promise<void> => {
  const result: string = await resolveOptionalAiEnrichment({
    stage: 'test_enrichment',
    generate: (): Promise<string> => Promise.resolve('generated'),
    fallback: 'fallback',
  });

  assertEquals(result, 'generated');
});

Deno.test('optional AI enrichment absorbs exhaustion and returns its safe fallback', async (): Promise<void> => {
  const result: readonly string[] = await resolveOptionalAiEnrichment({
    stage: 'test_enrichment',
    generate: (): Promise<readonly string[]> =>
      Promise.reject(new Error('schema mismatch')),
    fallback: [],
  });

  assertEquals(result, []);
});
