import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js';

// EpisodeGenerationPolicyKind is the backend decision for a newly claimed slot.
export type EpisodeGenerationPolicyKind =
  | 'allowed'
  | 'episode_incomplete'
  | 'episode_out_of_order';

// LatestEpisodeState is the minimum persisted state required by the policy.
export type LatestEpisodeState = {
  // isComplete is the backend episodes.is_complete gate requested by the product.
  readonly isComplete: boolean;
  // orderIndex identifies the current final episode in the series.
  readonly orderIndex: number;
};

// EpisodeGenerationPolicyError carries an expected policy rejection to HTTP handling.
export class EpisodeGenerationPolicyError extends Error {
  // kind maps the rejection to a stable client error response.
  readonly kind: Exclude<EpisodeGenerationPolicyKind, 'allowed'>;

  constructor(kind: Exclude<EpisodeGenerationPolicyKind, 'allowed'>) {
    super(kind);
    this.name = 'EpisodeGenerationPolicyError';
    this.kind = kind;
  }
}

// assertEpisodeGenerationAllowed checks authoritative remote completion before OpenRouter.
export async function assertEpisodeGenerationAllowed({
  authorization,
  orderIndex,
  seriesId,
  userId,
}: {
  // authorization keeps the episode lookup inside the caller's existing RLS scope.
  readonly authorization: string;
  // orderIndex is the next position requested by the mobile client.
  readonly orderIndex: number;
  // seriesId scopes the latest persisted episode lookup.
  readonly seriesId: string;
  // userId adds an explicit ownership filter alongside the database RLS policy.
  readonly userId: string;
}): Promise<void> {
  const client = createAuthenticatedClient(authorization);
  const { data, error } = await client
    .from('episodes')
    .select('order_index,is_complete')
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Episode completion lookup failed: ${error.message}`);
  }

  const latestEpisode = parseLatestEpisodeState(data);
  const decision = evaluateEpisodeGenerationPolicy(latestEpisode, orderIndex);

  if (decision !== 'allowed') {
    throw new EpisodeGenerationPolicyError(decision);
  }
}

// evaluateEpisodeGenerationPolicy keeps completion and ordering rules deterministic.
export function evaluateEpisodeGenerationPolicy(
  latestEpisode: LatestEpisodeState | undefined,
  requestedOrderIndex: number,
): EpisodeGenerationPolicyKind {
  if (latestEpisode && !latestEpisode.isComplete) {
    return 'episode_incomplete';
  }

  const expectedOrderIndex = (latestEpisode?.orderIndex ?? 0) + 1;

  return requestedOrderIndex === expectedOrderIndex
    ? 'allowed'
    : 'episode_out_of_order';
}

// parseLatestEpisodeState validates the authenticated database response.
function parseLatestEpisodeState(value: unknown): LatestEpisodeState | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Episode completion lookup returned an invalid row.');
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.order_index !== 'number' ||
    !Number.isInteger(row.order_index) ||
    row.order_index < 1 ||
    typeof row.is_complete !== 'boolean'
  ) {
    throw new Error('Episode completion lookup returned an invalid row.');
  }

  return {
    isComplete: row.is_complete,
    orderIndex: row.order_index,
  };
}

// createAuthenticatedClient lets the existing episodes RLS policy enforce ownership.
function createAuthenticatedClient(authorization: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!url || !anonKey || !authorization.startsWith('Bearer ')) {
    throw new Error('Episode generation policy configuration is missing.');
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}
