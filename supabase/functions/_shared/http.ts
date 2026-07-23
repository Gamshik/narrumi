// corsHeaders allow Expo and local development clients to call Edge Functions.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// jsonResponse returns a structured JSON HTTP response with CORS headers.
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// safeErrorResponse hides raw provider, schema, and transport details from clients.
export function safeErrorResponse(
  kind: "validation" | "unauthorized" | "unavailable" | "unexpected",
  status: number,
): Response {
  return jsonResponse(
    {
      error: {
        kind,
        message:
          kind === "validation"
            ? "The request or AI response did not match the required shape."
            : "The AI service is not available right now.",
      },
    },
    status,
  );
}

// generationStateResponse reports a duplicate or conflicting logical generation slot.
export function generationStateResponse(
  kind:
    | 'generation_in_progress'
    | 'generation_conflict'
    | 'episode_incomplete'
    | 'episode_out_of_order',
): Response {
  const messages = {
    generation_in_progress:
      'This generation is already in progress. Please wait and try again.',
    generation_conflict:
      'This generation slot was created from different inputs. Refresh the series before retrying.',
    episode_incomplete:
      'Finish the current episode before generating the next one.',
    episode_out_of_order:
      'Sync the current series before generating the next episode.',
  } as const;

  return jsonResponse(
    {
      error: {
        kind,
        message: messages[kind],
      },
    },
    409,
  );
}

// moderationResponse reports a blocked request without exposing hidden detection internals.
export function moderationResponse(
  kind: "warning" | "banned",
  warningsRemaining: number,
  message: string,
): Response {
  return jsonResponse(
    {
      error: {
        kind: kind === "warning" ? "moderation_warning" : "moderation_banned",
        message,
        warningsRemaining,
      },
    },
    kind === "warning" ? 429 : 403,
  );
}

// softModerationResponse blocks a validation-only action before it becomes a warning.
export function softModerationResponse(
  attemptsRemaining: number,
  message: string,
): Response {
  return jsonResponse(
    {
      error: {
        kind: "moderation_soft_block",
        message,
        attemptsRemaining,
      },
    },
    422,
  );
}

// logSafeError writes server-side diagnostics without returning provider details to clients.
export function logSafeError(
  label: string,
  error: unknown,
  context: Record<string, string>,
): void {
  const details =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };

  console.error(label, { ...context, error: details });
}

// logSafeInfo records expected, non-failing diagnostics (such as a retried attempt)
// without raising them to the error level reserved for genuine failures.
export function logSafeInfo(label: string, context: Record<string, string>): void {
  console.info(label, context);
}

// logSafeWarning records expected policy blocks without logging learner text or model context.
export function logSafeWarning(
  label: string,
  context: Record<string, string>,
): void {
  console.warn(label, context);
}
