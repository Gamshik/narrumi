import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { resolveDecisionPrompt } from './decisionPromptPolicy.ts';

Deno.test('decision prompt removes copied story sentences before a real question', (): void => {
  assertEquals(
    resolveDecisionPrompt({
      prompt:
        'The blue door opened into a silent corridor. What should Mira do?',
      storyBlocks: [
        'Mira touched the handle.',
        'The blue door opened into a silent corridor.',
      ],
      participationMode: 'character',
    }),
    'What should Mira do?',
  );
});

Deno.test('decision prompt replaces a copied story ending with a short mode-aware cue', (): void => {
  assertEquals(
    resolveDecisionPrompt({
      prompt: 'The blue door opened into a silent corridor.',
      storyBlocks: ['The blue door opened into a silent corridor.'],
      participationMode: 'character',
    }),
    'What do you do next?',
  );
  assertEquals(
    resolveDecisionPrompt({
      prompt: 'The blue door opened into a silent corridor!',
      storyBlocks: ['The blue door opened into a silent corridor.'],
      participationMode: 'director',
    }),
    'What happens next?',
  );
});

Deno.test('decision prompt preserves a concise distinct question', (): void => {
  assertEquals(
    resolveDecisionPrompt({
      prompt: 'Which route should Vlad choose?',
      storyBlocks: ['Two dark passages opened ahead of Vlad.'],
      participationMode: 'character',
    }),
    'Which route should Vlad choose?',
  );
});
