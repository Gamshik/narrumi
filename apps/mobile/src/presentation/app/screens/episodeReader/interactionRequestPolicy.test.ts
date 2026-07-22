import assert from 'node:assert/strict';
import test from 'node:test';

import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

import { submitInteractionWithSilentRetry } from './interactionRequestPolicy';

// unavailableError represents the safe temporary Edge Function failure returned to Reader.
const unavailableError: SupabaseFunctionError = new SupabaseFunctionError({
  kind: 'unavailable',
  message: 'The AI service is not available right now.',
});

test('retries one temporary interaction failure without surfacing it', async (): Promise<void> => {
  let requestCount = 0;

  const result: string = await submitInteractionWithSilentRetry(
    (): Promise<string> => {
      requestCount += 1;

      return requestCount === 1
        ? Promise.reject(unavailableError)
        : Promise.resolve('continued');
    },
  );

  assert.equal(result, 'continued');
  assert.equal(requestCount, 2);
});

test('stops after the second temporary interaction failure', async (): Promise<void> => {
  let requestCount = 0;

  await assert.rejects(
    submitInteractionWithSilentRetry((): Promise<never> => {
      requestCount += 1;
      return Promise.reject(unavailableError);
    }),
    unavailableError,
  );

  assert.equal(requestCount, 2);
});

test('does not retry moderation or validation failures', async (): Promise<void> => {
  let requestCount = 0;
  // moderationError must remain a single user-visible policy decision.
  const moderationError: SupabaseFunctionError = new SupabaseFunctionError({
    kind: 'moderation_warning',
    message: 'This request matched blocked content rules.',
  });

  await assert.rejects(
    submitInteractionWithSilentRetry((): Promise<never> => {
      requestCount += 1;
      return Promise.reject(moderationError);
    }),
    moderationError,
  );

  assert.equal(requestCount, 1);
});
