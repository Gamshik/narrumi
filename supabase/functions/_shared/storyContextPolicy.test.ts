import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { buildStoryDecisionHistory } from './storyContextPolicy.ts';

Deno.test('story context excludes tutor feedback and keeps the latest decisions', (): void => {
  const result = buildStoryDecisionHistory(
    [
      {
        prompt: 'What should Mira inspect?',
        answer: 'The map',
        feedback:
          'Good choice. Explain these directions more clearly next time.',
      },
      {
        prompt: 'Who should Mira call?',
        answer: 'Leo',
        feedback: 'The answer is natural and correct.',
      },
    ],
    1,
  );

  assertEquals(result, [
    {
      prompt: 'Who should Mira call?',
      answer: 'Leo',
    },
  ]);
});

Deno.test('story context returns no decisions for a zero limit', (): void => {
  assertEquals(
    buildStoryDecisionHistory(
      [{ prompt: 'What now?', answer: 'Wait', feedback: 'Correct.' }],
      0,
    ),
    [],
  );
});
