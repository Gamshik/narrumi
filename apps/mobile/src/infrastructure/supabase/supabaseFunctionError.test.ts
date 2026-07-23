import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readSupabaseFunctionErrorInfo } from './supabaseFunctionError';

describe('readSupabaseFunctionErrorInfo', () => {
  it('reads policy errors from a response-like React Native context', async () => {
    // context deliberately is not a global Response instance.
    const error = {
      context: {
        json: async (): Promise<unknown> => ({
          error: {
            kind: 'episode_incomplete',
            message:
              'Finish the current episode before generating the next one.',
          },
        }),
      },
    };

    const result = await readSupabaseFunctionErrorInfo(error);

    assert.deepEqual(result, {
      kind: 'episode_incomplete',
      message: 'Finish the current episode before generating the next one.',
    });
  });

  it('ignores transport errors without a structured response body', async () => {
    const result = await readSupabaseFunctionErrorInfo(
      new Error('Network request failed'),
    );

    assert.equal(result, undefined);
  });

  it('reports a gateway timeout when Supabase returns a non-JSON body', async () => {
    const result = await readSupabaseFunctionErrorInfo({
      context: {
        status: 504,
        json: async (): Promise<unknown> => {
          throw new Error('The gateway body is not JSON.');
        },
      },
    });

    assert.deepEqual(result, {
      kind: 'unavailable',
      message: 'Episode generation timed out. Please try again.',
    });
  });

  it('uses the invoke response when an error wrapper loses its context', async () => {
    const result = await readSupabaseFunctionErrorInfo(
      new Error('Edge Function returned a non-2xx status code'),
      {
        status: 429,
        json: async (): Promise<unknown> => ({
          error: {
            kind: 'moderation_warning',
            message: 'This request matched blocked content rules.',
            warningsRemaining: 1,
          },
        }),
      },
    );

    assert.deepEqual(result, {
      kind: 'moderation_warning',
      message:
        'This request matched blocked content rules. Warnings remaining: 1.',
      warningsRemaining: 1,
    });
  });

  it('reads a cloned React Native response before the original body', async () => {
    let originalJsonCalls = 0;
    const result = await readSupabaseFunctionErrorInfo({
      context: {
        json: async (): Promise<unknown> => {
          originalJsonCalls += 1;
          throw new Error('The original response body is locked.');
        },
        clone: () => ({
          json: async (): Promise<unknown> => ({
            error: {
              kind: 'moderation_banned',
              message: 'This account is blocked.',
              warningsRemaining: 0,
            },
          }),
        }),
      },
    });

    assert.deepEqual(result, {
      kind: 'moderation_banned',
      message: 'This account is blocked.',
      warningsRemaining: 0,
    });
    assert.equal(originalJsonCalls, 0);
  });
});
