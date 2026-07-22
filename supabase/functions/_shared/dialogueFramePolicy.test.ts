import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  downgradeUnquotedDialogueFrames,
  isDialogueRepeatedByNarration,
  looksLikeNarrationInDialogue,
  splitQuotedDialogueFromNarration,
} from './dialogueFramePolicy.ts';

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

Deno.test('dialogue policy downgrades third-person action prose mislabeled as speech', (): void => {
  const narration =
    'Artem greets Gleb and pulls out a chair, asking how he feels about the upcoming project.';

  assertEquals(
    downgradeUnquotedDialogueFrames(narration, [
      { kind: 'dialogue', speaker: 'Artem', text: narration },
    ]),
    [{ kind: 'narration', text: narration }],
  );
});

Deno.test('dialogue policy preserves wording found inside explicit source quotes', (): void => {
  assertEquals(
    downgradeUnquotedDialogueFrames(
      'Artem smiles and says, "I am glad you came early."',
      [
        {
          kind: 'narration',
          text: 'Artem smiles and says.',
        },
        {
          kind: 'dialogue',
          speaker: 'Artem',
          text: 'I am glad you came early.',
        },
      ],
    ),
    [
      {
        kind: 'narration',
        text: 'Artem smiles and says.',
      },
      {
        kind: 'dialogue',
        speaker: 'Artem',
        text: 'I am glad you came early.',
      },
    ],
  );
});

Deno.test('dialogue policy preserves speech after an unmatched opening quote', (): void => {
  assertEquals(
    downgradeUnquotedDialogueFrames(
      'Vlad says, stepping back. "Just do not let him rush you.',
      [
        {
          kind: 'dialogue',
          speaker: 'Vlad',
          text: 'Just do not let him rush you.',
        },
      ],
    ),
    [
      {
        kind: 'dialogue',
        speaker: 'Vlad',
        text: 'Just do not let him rush you.',
      },
    ],
  );
});

Deno.test('dialogue policy detects a spoken block repeated from narration', (): void => {
  assertEquals(
    isDialogueRepeatedByNarration(
      'Vlad reads the screen, smiles, and says that you should be proud of your confidence because it shows true strength.',
      'You should be proud of your confidence because it shows true strength.',
    ),
    true,
  );
  assertEquals(
    isDialogueRepeatedByNarration(
      'Vlad reads the screen and smiles.',
      'You should be proud of your confidence.',
    ),
    false,
  );
  assertEquals(
    isDialogueRepeatedByNarration('Mira says thank you.', 'Thank you.'),
    false,
  );
});

Deno.test('dialogue policy extracts full quoted speech from attributed narration', (): void => {
  assertEquals(
    splitQuotedDialogueFromNarration(
      'Vlad says, stepping back from your desk. "Just do not let him rush you into anything.',
      ['Vlad'],
    ),
    [
      {
        kind: 'narration',
        text: 'Vlad says, stepping back from your desk.',
      },
      {
        kind: 'dialogue',
        speaker: 'Vlad',
        text: 'Just do not let him rush you into anything.',
      },
    ],
  );
});

Deno.test('dialogue policy keeps unattributed quoted text in narration', (): void => {
  assertEquals(
    splitQuotedDialogueFromNarration(
      'The screen displays "Submit before midnight" in red letters.',
      ['Vlad'],
    ),
    [
      {
        kind: 'narration',
        text: 'The screen displays "Submit before midnight" in red letters.',
      },
    ],
  );
});
