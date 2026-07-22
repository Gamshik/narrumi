import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// InteractionRequest performs one attempt to continue a persisted learner answer.
export type InteractionRequest<TResult> = () => Promise<TResult>;

// isRetryableInteractionError restricts silent retries to temporary service failures.
export function isRetryableInteractionError(error: unknown): boolean {
  return error instanceof SupabaseFunctionError && error.kind === 'unavailable';
}

// submitInteractionWithSilentRetry keeps one transient failure inside the same loading state.
export async function submitInteractionWithSilentRetry<TResult>(
  request: InteractionRequest<TResult>,
): Promise<TResult> {
  try {
    return await request();
  } catch (error: unknown) {
    if (!isRetryableInteractionError(error)) {
      throw error;
    }

    return await request();
  }
}
