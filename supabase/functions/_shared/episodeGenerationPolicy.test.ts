import { assertEquals } from 'jsr:@std/assert';

import { evaluateEpisodeGenerationPolicy } from './episodeGenerationPolicy.ts';

Deno.test('episode generation allows only the first position in an empty series', () => {
  assertEquals(evaluateEpisodeGenerationPolicy(undefined, 1), 'allowed');
  assertEquals(
    evaluateEpisodeGenerationPolicy(undefined, 2),
    'episode_out_of_order',
  );
});

Deno.test('episode generation blocks every next position until current completion', () => {
  assertEquals(
    evaluateEpisodeGenerationPolicy(
      { isComplete: false, orderIndex: 1 },
      2,
    ),
    'episode_incomplete',
  );
});

Deno.test('episode generation allows exactly the next position after completion', () => {
  assertEquals(
    evaluateEpisodeGenerationPolicy(
      { isComplete: true, orderIndex: 1 },
      2,
    ),
    'allowed',
  );
  assertEquals(
    evaluateEpisodeGenerationPolicy(
      { isComplete: true, orderIndex: 1 },
      3,
    ),
    'episode_out_of_order',
  );
});
