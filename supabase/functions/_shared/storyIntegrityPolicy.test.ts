import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { reviewDeterministicStoryIntegrity } from './storyIntegrityPolicy.ts';

Deno.test('story integrity rejects attributed direct speech without quotation marks', (): void => {
  const result = reviewDeterministicStoryIntegrity({
    text:
      'It is Vlad, and his voice sounds rushed. Vlad says without a normal greeting. Do not ask why yet, but I am standing near your apartment.',
    pinnedCharacterNames: ['Vlad'],
  });

  assertEquals(result.accepted, false);
  assertEquals(result.issues[0]?.code, 'dialogue_format');
});

Deno.test('story integrity accepts quoted direct speech', (): void => {
  const result = reviewDeterministicStoryIntegrity({
    text:
      'Vlad says without a normal greeting. "Do not ask why yet, but I am standing near your apartment."',
    pinnedCharacterNames: ['Vlad'],
  });

  assertEquals(result, { accepted: true, issues: [] });
});

Deno.test('story integrity accepts ordinary reported speech', (): void => {
  const result = reviewDeterministicStoryIntegrity({
    text: 'Vlad says that he cannot wait much longer. He watches the street.',
    pinnedCharacterNames: ['Vlad'],
  });

  assertEquals(result, { accepted: true, issues: [] });
});
