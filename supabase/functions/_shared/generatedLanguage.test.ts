import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  assertEnglishGeneratedTextFields,
  createRussianTranslationSchema,
  isPredominantlyEnglishText,
} from './generatedLanguage.ts';

Deno.test('generated language accepts English prose with an isolated Cyrillic name', (): void => {
  assertEquals(
    isPredominantlyEnglishText(
      'Mira opened the door while Маша waited outside.',
    ),
    true,
  );
});

Deno.test('generated language rejects Russian learner-facing prose', (): void => {
  assertEquals(
    isPredominantlyEnglishText(
      'Мира открыла дверь и осторожно вошла в тёмную библиотеку.',
    ),
    false,
  );
});

Deno.test('generated language errors expose only the safe field name', (): void => {
  assertThrows(
    () =>
      assertEnglishGeneratedTextFields('interaction', [
        {
          fieldName: 'continuationText',
          value: 'Она решила вернуться домой.',
        },
      ]),
    Error,
    'interaction field continuationText must be predominantly English.',
  );
});

Deno.test('Russian translation schema rejects an untranslated English hint', (): void => {
  assertEquals(
    createRussianTranslationSchema(100).safeParse('curious').success,
    false,
  );
  assertEquals(
    createRussianTranslationSchema(100).safeParse('любопытный').success,
    true,
  );
});
