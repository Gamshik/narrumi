import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { looksLikeNarrationInDialogue } from './dialogueFramePolicy.ts';

Deno.test('dialogue policy detects speaker attribution and stage direction', (): void => {
  assertEquals(
    looksLikeNarrationInDialogue(
      'Vlad says, leaning against the old desk.',
      'Vlad',
    ),
    true,
  );
  assertEquals(
    looksLikeNarrationInDialogue(
      'Vlad, leaning against the old desk, watches the door.',
      'Vlad',
    ),
    true,
  );
  assertEquals(
    looksLikeNarrationInDialogue('We should leave now, says Vlad.', 'Vlad'),
    true,
  );
});

Deno.test('dialogue policy preserves actual spoken wording', (): void => {
  assertEquals(
    looksLikeNarrationInDialogue(
      'We should leave before the guards return.',
      'Vlad',
    ),
    false,
  );
  assertEquals(
    looksLikeNarrationInDialogue(
      'He says the map is hidden upstairs.',
      'Vlad',
    ),
    false,
  );
});
