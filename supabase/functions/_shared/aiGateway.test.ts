import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { AI_REASONING_BY_ROLE, DEFAULT_AI_MODELS } from './aiGateway.ts';

Deno.test('AI gateway uses a structured-output writer by default', (): void => {
  assertEquals(
    DEFAULT_AI_MODELS.writer,
    'google/gemini-3.5-flash-lite',
  );
  assertEquals(DEFAULT_AI_MODELS.reviewer, 'openai/gpt-5.4-mini');
  assertEquals(DEFAULT_AI_MODELS.decision, 'openai/gpt-5.4-nano');
  assertEquals(DEFAULT_AI_MODELS.validator, 'openai/gpt-5.4-nano');
  assertEquals(DEFAULT_AI_MODELS.utility, 'openai/gpt-5.4-nano');
  assertEquals(DEFAULT_AI_MODELS.fallback, 'openai/gpt-5.4-mini');
  assertEquals(AI_REASONING_BY_ROLE.writer, 'low');
  assertEquals(AI_REASONING_BY_ROLE.decision, 'low');
  assertEquals(AI_REASONING_BY_ROLE.reviewer, 'low');
  assertEquals(AI_REASONING_BY_ROLE.validator, 'minimal');
  assertEquals(AI_REASONING_BY_ROLE.utility, 'minimal');
});
