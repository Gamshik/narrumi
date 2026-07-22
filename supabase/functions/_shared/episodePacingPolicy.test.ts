import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { resolveEpisodeCompletion } from './episodePacingPolicy.ts';

Deno.test('episode pacing prevents completion before interaction five', (): void => {
  assertEquals(
    resolveEpisodeCompletion({
      interactionCount: 4,
      modelRequestedCompletion: true,
    }),
    false,
  );
});

Deno.test('episode pacing preserves a logical model ending inside the allowed window', (): void => {
  assertEquals(
    resolveEpisodeCompletion({
      interactionCount: 6,
      modelRequestedCompletion: true,
    }),
    true,
  );
  assertEquals(
    resolveEpisodeCompletion({
      interactionCount: 6,
      modelRequestedCompletion: false,
    }),
    false,
  );
});

Deno.test('episode pacing forces completion on interaction ten', (): void => {
  assertEquals(
    resolveEpisodeCompletion({
      interactionCount: 10,
      modelRequestedCompletion: false,
    }),
    true,
  );
});
