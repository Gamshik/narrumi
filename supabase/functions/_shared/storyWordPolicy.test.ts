import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { omitStoryWordExamplesFromModeration } from './storyWordPolicy.ts';

Deno.test('Story Word moderation projection omits bundled Oxford examples', (): void => {
  const projected = omitStoryWordExamplesFromModeration([
    {
      id: 'word:abuse:verb',
      word: 'abuse',
      partOfSpeech: 'verb',
      usageExamples: ['He abused his body with heroin and cocaine.'],
    },
  ]);

  assertEquals(projected, [
    {
      id: 'word:abuse:verb',
      word: 'abuse',
      partOfSpeech: 'verb',
    },
  ]);
});
