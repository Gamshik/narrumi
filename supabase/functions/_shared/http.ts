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
