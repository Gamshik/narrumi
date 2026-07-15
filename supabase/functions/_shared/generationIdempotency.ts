import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js';

// GenerationOperation lists AI boundaries protected by the shared request cache.
export type GenerationOperation =
  | 'generate-episode'
  | 'generate-series-setup';

// IdempotentGenerationResult describes cache admission without leaking database rows.
export type IdempotentGenerationResult<TResponse> =
  | {
      readonly kind: 'completed';
      readonly canonicalRequestId: string;
      readonly response: TResponse;
    }
  | { readonly kind: 'in_progress' }
  | { readonly kind: 'conflict' };

// runIdempotentGeneration executes, resumes, or reuses one authenticated AI request.
export async function runIdempotentGeneration<TResponse>({
  generate,
  operation,
  parseResponse,
  requestId,
  requestPayload,
  scopeId,
  userId,
}: {
  // generate performs the expensive model call only after an execute claim.
  readonly generate: () => Promise<TResponse>;
  // operation separates independent Edge Function caches.
  readonly operation: GenerationOperation;
  // parseResponse validates cached JSON before it crosses the trust boundary.
  readonly parseResponse: (value: unknown) => TResponse;
  // requestId identifies one client attempt and all of its retries.
  readonly requestId: string;
  // requestPayload is hashed and never stored in plaintext by this helper.
  readonly requestPayload: unknown;
  // scopeId reserves one logical generation slot.
  readonly scopeId: string;
  // userId scopes every request to its authenticated owner.
  readonly userId: string;
}): Promise<IdempotentGenerationResult<TResponse>> {
  const client = createServiceClient();
  const requestFingerprint = await fingerprintGenerationRequest(requestPayload);
  const claim = await claimGenerationRequest(client, {
    operation,
    requestFingerprint,
    requestId,
    scopeId,
    userId,
  });

  if (claim.action === 'cached') {
    return {
      kind: 'completed',
      canonicalRequestId: claim.canonicalRequestId,
      response: parseResponse(claim.cachedResponse),
    };
  }

  if (claim.action === 'in_progress' || claim.action === 'conflict') {
    return { kind: claim.action };
  }

  try {
    const response = parseResponse(await generate());

    await completeGenerationRequest(client, {
      operation,
      requestFingerprint,
      response,
      scopeId,
      userId,
    });

    return {
      kind: 'completed',
      canonicalRequestId: claim.canonicalRequestId,
      response,
    };
  } catch (error) {
    await failGenerationRequest(client, {
      operation,
      requestFingerprint,
      scopeId,
      userId,
    }).catch(() => undefined);

    throw error;
  }
}

// fingerprintGenerationRequest creates a stable SHA-256 key for parsed JSON input.
export async function fingerprintGenerationRequest(value: unknown): Promise<string> {
  const canonicalJson = JSON.stringify(canonicalizeJson(value));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

// GenerationClaimRow is the narrow RPC response validated by the Edge boundary.
type GenerationClaimRow = {
  readonly action: 'execute' | 'cached' | 'in_progress' | 'conflict';
  readonly canonicalRequestId: string;
  readonly cachedResponse: unknown;
};

// claimGenerationRequest atomically reserves or reuses one logical generation slot.
async function claimGenerationRequest(
  client: SupabaseClient,
  input: {
    readonly operation: GenerationOperation;
    readonly requestFingerprint: string;
    readonly requestId: string;
    readonly scopeId: string;
    readonly userId: string;
  },
): Promise<GenerationClaimRow> {
  const { data, error } = await client.rpc('claim_generation_request', {
    p_operation: input.operation,
    p_request_fingerprint: input.requestFingerprint,
    p_request_id: input.requestId,
    p_scope_id: input.scopeId,
    p_user_id: input.userId,
  });

  if (error) {
    throw new Error(`Generation request claim failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : undefined;

  if (!isClaimRow(row)) {
    throw new Error('Generation request claim returned an invalid response.');
  }

  return {
    action: row.action,
    canonicalRequestId: row.canonical_request_id,
    cachedResponse: row.cached_response,
  };
}

// completeGenerationRequest stores only a validated response for future retries.
async function completeGenerationRequest(
  client: SupabaseClient,
  input: {
    readonly operation: GenerationOperation;
    readonly requestFingerprint: string;
    readonly response: unknown;
    readonly scopeId: string;
    readonly userId: string;
  },
): Promise<void> {
  const { error } = await client.rpc('complete_generation_request', {
    p_operation: input.operation,
    p_request_fingerprint: input.requestFingerprint,
    p_response: input.response,
    p_scope_id: input.scopeId,
    p_user_id: input.userId,
  });

  if (error) {
    throw new Error(`Generation request completion failed: ${error.message}`);
  }
}

// failGenerationRequest releases an expired or retryable generation claim.
async function failGenerationRequest(
  client: SupabaseClient,
  input: {
    readonly operation: GenerationOperation;
    readonly requestFingerprint: string;
    readonly scopeId: string;
    readonly userId: string;
  },
): Promise<void> {
  const { error } = await client.rpc('fail_generation_request', {
    p_operation: input.operation,
    p_request_fingerprint: input.requestFingerprint,
    p_scope_id: input.scopeId,
    p_user_id: input.userId,
  });

  if (error) {
    throw new Error(`Generation request release failed: ${error.message}`);
  }
}

// createServiceClient limits service-role access to the Edge Function process.
function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Generation idempotency configuration is missing.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

// canonicalizeJson sorts object keys recursively before hashing parsed request data.
function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeJson(entry)]),
  );
}

// isClaimRow validates the service RPC result before any branch is trusted.
function isClaimRow(value: unknown): value is {
  readonly action: GenerationClaimRow['action'];
  readonly canonical_request_id: string;
  readonly cached_response: unknown;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    (row.action === 'execute' ||
      row.action === 'cached' ||
      row.action === 'in_progress' ||
      row.action === 'conflict') &&
    typeof row.canonical_request_id === 'string' &&
    row.canonical_request_id.length > 0
  );
}
