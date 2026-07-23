// SupabaseFunctionErrorBody is the safe error envelope returned by Edge Functions.
type SupabaseFunctionErrorBody = {
  // error carries the server-side failure kind and user-facing message.
  readonly error?: {
    // kind is the stable category returned by the Edge Function.
    readonly kind?: string;
    // message is safe user-facing context for moderation and auth failures.
    readonly message?: string;
    // warningsRemaining tells the learner how many moderation warnings remain.
    readonly warningsRemaining?: number;
    // attemptsRemaining tells the learner how many soft blocked attempts remain before warnings.
    readonly attemptsRemaining?: number;
  };
};

// SupabaseFunctionErrorKind is the normalized function error category.
export type SupabaseFunctionErrorKind =
  | 'generation_in_progress'
  | 'generation_conflict'
  | 'episode_incomplete'
  | 'episode_out_of_order'
  | 'moderation_soft_block'
  | 'moderation_warning'
  | 'moderation_banned'
  | 'unauthorized'
  | 'validation'
  | 'unavailable'
  | 'unexpected';

// SupabaseFunctionErrorInfo carries the parsed server error envelope.
export type SupabaseFunctionErrorInfo = {
  // kind identifies the server-side failure class.
  readonly kind: SupabaseFunctionErrorKind;
  // message is the safe user-facing text returned by the server.
  readonly message: string;
  // warningsRemaining is included for moderation warning popups.
  readonly warningsRemaining?: number;
  // attemptsRemaining is included for validation-only moderation popups.
  readonly attemptsRemaining?: number;
};

// SupabaseFunctionError preserves the server error kind for UI branching.
export class SupabaseFunctionError extends Error {
  // kind keeps the stable server failure category.
  readonly kind: SupabaseFunctionErrorKind;
  // warningsRemaining tells UI how many warnings remain before a ban.
  readonly warningsRemaining: number | undefined;
  // attemptsRemaining tells UI how many blocked setup attempts remain before warnings.
  readonly attemptsRemaining: number | undefined;

  constructor(info: SupabaseFunctionErrorInfo) {
    super(info.message);
    this.name = 'SupabaseFunctionError';
    this.kind = info.kind;
    this.warningsRemaining =
      typeof info.warningsRemaining === 'number'
        ? info.warningsRemaining
        : undefined;
    this.attemptsRemaining =
      typeof info.attemptsRemaining === 'number'
        ? info.attemptsRemaining
        : undefined;
  }
}

// SupabaseFunctionErrorContext is the structural shape used by FunctionsHttpError.
type SupabaseFunctionErrorContext = {
  // context contains the raw HTTP response when Supabase receives a non-2xx status.
  readonly context?: unknown;
};

// JsonResponseLike is the cross-runtime subset exposed by FunctionsHttpError.context.
type JsonResponseLike = {
  // json reads the structured Edge Function error body.
  readonly json: () => Promise<unknown>;
  // clone preserves the original response body when the runtime supports it.
  readonly clone?: () => JsonResponseLike;
  // text is a fallback for React Native response implementations with fragile json parsing.
  readonly text?: () => Promise<string>;
  // status preserves gateway failures whose response body is not JSON.
  readonly status?: number;
};

// readSupabaseFunctionErrorInfo extracts user-facing Edge Function errors from non-2xx responses.
export async function readSupabaseFunctionErrorInfo(
  error: unknown,
  fallbackResponse?: unknown,
): Promise<SupabaseFunctionErrorInfo | undefined> {
  const errorContext: unknown = (error as SupabaseFunctionErrorContext).context;
  const context: unknown = isJsonResponseLike(errorContext)
    ? errorContext
    : fallbackResponse;

  if (!isJsonResponseLike(context)) {
    return undefined;
  }

  const body = await readJsonBody(context);
  const errorBody = body?.error;
  const kind = normalizeKind(errorBody?.kind);
  const message = errorBody?.message;

  if (typeof message !== 'string' || message.length === 0) {
    return readGatewayErrorInfo(context.status);
  }

  const warningsRemaining = errorBody?.warningsRemaining;
  const attemptsRemaining = errorBody?.attemptsRemaining;

  return {
    kind,
    message:
      typeof warningsRemaining === 'number' && warningsRemaining > 0
        ? `${message} Warnings remaining: ${warningsRemaining}.`
        : typeof attemptsRemaining === 'number' && attemptsRemaining > 0
          ? `${message} Blocked setup attempts remaining before warnings: ${attemptsRemaining}.`
        : message,
    ...(typeof warningsRemaining === 'number'
      ? { warningsRemaining }
      : {}),
    ...(typeof attemptsRemaining === 'number'
      ? { attemptsRemaining }
      : {}),
  };
}

// readGatewayErrorInfo keeps Supabase timeout responses useful when no JSON envelope exists.
function readGatewayErrorInfo(
  status: number | undefined,
): SupabaseFunctionErrorInfo | undefined {
  if (status === 504 || status === 546) {
    return {
      kind: 'unavailable',
      message: 'Episode generation timed out. Please try again.',
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      kind: 'unavailable',
      message: 'The AI service is not available right now.',
    };
  }

  return undefined;
}

// readSupabaseFunctionErrorMessage keeps the old string-based call shape for simple callers.
export async function readSupabaseFunctionErrorMessage(
  error: unknown,
): Promise<string | undefined> {
  const info = await readSupabaseFunctionErrorInfo(error);

  return info?.message;
}

// toSupabaseFunctionError converts parsed response bodies into typed errors.
export async function toSupabaseFunctionError(
  error: unknown,
  fallbackResponse?: unknown,
): Promise<SupabaseFunctionError | undefined> {
  const info = await readSupabaseFunctionErrorInfo(error, fallbackResponse);

  return info ? new SupabaseFunctionError(info) : undefined;
}

// readJsonBody parses the response body without letting diagnostics hide the original failure.
async function readJsonBody(
  response: JsonResponseLike,
): Promise<SupabaseFunctionErrorBody | undefined> {
  if (response.clone) {
    try {
      // clonedResponse keeps the SDK-owned body readable for any later diagnostics.
      const clonedResponse: JsonResponseLike = response.clone();

      return (await clonedResponse.json()) as SupabaseFunctionErrorBody;
    } catch {
      // Some React Native fetch implementations expose clone but cannot use it.
    }
  }

  try {
    return (await response.json()) as SupabaseFunctionErrorBody;
  } catch {
    if (!response.text) {
      return undefined;
    }
  }

  try {
    // textBody supports fetch implementations whose JSON convenience method fails.
    const textBody: string = await response.text();

    return JSON.parse(textBody) as SupabaseFunctionErrorBody;
  } catch {
    return undefined;
  }
}

// isJsonResponseLike avoids brittle instanceof checks across React Native fetch realms.
function isJsonResponseLike(value: unknown): value is JsonResponseLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'json' in value &&
    typeof value.json === 'function'
  );
}

// normalizeKind keeps server kinds stable while defaulting unknown bodies.
function normalizeKind(
  kind: string | undefined,
): SupabaseFunctionErrorKind {
  switch (kind) {
    case 'generation_in_progress':
    case 'generation_conflict':
    case 'episode_incomplete':
    case 'episode_out_of_order':
    case 'moderation_soft_block':
    case 'moderation_warning':
    case 'moderation_banned':
    case 'unauthorized':
    case 'validation':
    case 'unavailable':
    case 'unexpected':
      return kind;
    default:
      return 'unexpected';
  }
}
