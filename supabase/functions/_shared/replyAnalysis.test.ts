import {
  assertEquals,
  assertFalse,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { z } from 'npm:zod@4.4.3';

import { replyAnalysisSchema } from './replyAnalysis.ts';

Deno.test('reply analysis exposes a provider-compatible root object', (): void => {
  // jsonSchema mirrors the input contract sent through structured output.
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(
    replyAnalysisSchema,
    { io: 'input' },
  );

  assertEquals(jsonSchema.type, 'object');
  assertFalse('anyOf' in jsonSchema);
  assertFalse('oneOf' in jsonSchema);
});

Deno.test('reply analysis accepts one corrected story intent', (): void => {
  const parsed = replyAnalysisSchema.parse({
    status: 'accepted',
    storyIntent: 'The learner says that the box is empty.',
    languageStatus: 'corrected',
    correctedText: 'I think the box is empty.',
    feedback: 'Use "is" after the singular noun "box".',
  });

  assertEquals(parsed, {
    status: 'accepted',
    storyIntent: 'The learner says that the box is empty.',
    languageStatus: 'corrected',
    correctedText: 'I think the box is empty.',
    feedback: 'Use "is" after the singular noun "box".',
  });
});

Deno.test('reply analysis keeps off-topic input recoverable', (): void => {
  const parsed = replyAnalysisSchema.parse({
    status: 'needs-revision',
    reason: 'off-topic',
    message: 'Write what your character says or does in this scene.',
    suggestedText: 'I open the last box carefully.',
  });

  assertEquals(parsed, {
    status: 'needs-revision',
    reason: 'off-topic',
    message: 'Write what your character says or does in this scene.',
    suggestedText: 'I open the last box carefully.',
  });
});

Deno.test('reply analysis rejects incomplete revision guidance', (): void => {
  assertFalse(
    replyAnalysisSchema.safeParse({
      status: 'needs-revision',
      reason: 'off-topic',
    }).success,
  );
});
