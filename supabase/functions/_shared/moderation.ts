import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js';

// ModerationCategory groups blocked-content signals into stable policy buckets.
export type ModerationCategory =
  | 'copyright'
  | 'unsafe_content'
  | 'age_or_content'
  | 'drugs';

// ModerationSignal records one matched policy bucket and the evidence that triggered it.
export type ModerationSignal = {
  // category identifies the policy bucket for reporting and storage.
  readonly category: ModerationCategory;
  // evidence is a short normalized excerpt that triggered the category.
  readonly evidence: string;
  // sourceLabel identifies the request field or context group that produced the signal.
  readonly sourceLabel: string;
};

// ModerationReview is the deterministic scan result before persistence is applied.
export type ModerationReview = {
  // blocked true means the request must not reach the AI boundary.
  readonly blocked: boolean;
  // shouldBan true means the warning threshold has been reached.
  readonly shouldBan: boolean;
  // warningCount is the post-increment warning count for this user.
  readonly warningCount: number;
  // warningsRemaining tells the client how many warnings are left before a ban.
  readonly warningsRemaining: number;
  // reason is a short user-safe explanation of why generation stopped.
  readonly reason: string;
  // signals captures the normalized categories that triggered moderation.
  readonly signals: readonly ModerationSignal[];
};

// ModerationSoftBlockResult describes a blocked validation attempt before or after warning escalation.
export type ModerationSoftBlockResult = {
  // attemptCount is the blocked setup count in the current one-hour window.
  readonly attemptCount: number;
  // attemptsRemaining is the remaining blocked setup count before warning escalation.
  readonly attemptsRemaining: number;
  // didRecordWarning true means this soft block also incremented the warning counter.
  readonly didRecordWarning: boolean;
  // warningCount is present only after warning escalation starts.
  readonly warningCount?: number;
  // warningsRemaining is present only after warning escalation starts.
  readonly warningsRemaining?: number;
  // bannedAt is present when the warning escalation created or confirmed a ban.
  readonly bannedAt?: string;
  // activeRestrictionId points to the active ban row when one exists.
  readonly activeRestrictionId?: string;
};

// ModerationStateRow mirrors the server-side warning counter table.
type ModerationStateRow = {
  // user_id is the Supabase Auth user id.
  readonly user_id: string;
  // warning_count stores the current strike count for the user.
  readonly warning_count: number;
  // last_warning_reason stores the latest moderation summary.
  readonly last_warning_reason: string | null;
  // last_warning_categories stores the latest normalized categories.
  readonly last_warning_categories: string[];
  // last_warning_excerpt stores a compact excerpt of the latest blocked context.
  readonly last_warning_excerpt: string | null;
  // last_warning_at stores the latest warning timestamp.
  readonly last_warning_at: string | null;
  // banned_at stores the ban timestamp once the threshold is reached.
  readonly banned_at: string | null;
  // active_restriction_id links to the ban row when active.
  readonly active_restriction_id: string | null;
  // updated_at stores the last server-side moderation state write.
  readonly updated_at: string;
};

// UserRestrictionRow mirrors the server-managed ban table.
type UserRestrictionRow = {
  // id is the ban record id.
  readonly id: string;
  // kind stores the ban category.
  readonly kind: string;
  // reason stores the server-side ban reason.
  readonly reason: string;
  // criteria stores the structured evidence that caused the ban.
  readonly criteria: Record<string, unknown>;
  // starts_at stores the ban activation timestamp.
  readonly starts_at: string;
  // ends_at stores a temporary ban expiry when present.
  readonly ends_at: string | null;
  // revoked_at marks manually revoked bans.
  readonly revoked_at: string | null;
};

// ModerationStore hides moderation persistence and ban escalation details.
export type ModerationStore = {
  // getActiveRestriction returns the current active ban when one exists.
  readonly getActiveRestriction: (
    userId: string,
  ) => Promise<UserRestrictionRow | undefined>;
  // getState returns the persisted moderation counter when one exists.
  readonly getState: (
    userId: string,
  ) => Promise<ModerationStateRow | undefined>;
  // recordWarning increments the warning state and creates a ban on the third strike.
  readonly recordWarning: (
    userId: string,
    sourceFunction: string,
    review: ModerationReview,
  ) => Promise<ModerationStateRow>;
  // recordSoftBlock increments an hourly validation counter and escalates after its threshold.
  readonly recordSoftBlock: (
    sourceFunction: string,
    scope: string,
    review: ModerationReview,
    warningThreshold: number,
  ) => Promise<ModerationSoftBlockResult>;
};

// createModerationStore builds the RPC-backed moderation persistence adapter.
export function createModerationStore(authorization: string): ModerationStore {
  const client = createModerationClient(authorization);
  const getState = async (userId: string): Promise<ModerationStateRow | undefined> => {
    const { data, error } = await client
      .rpc('get_user_moderation_state');

    if (error) {
      throw new Error(`Moderation state lookup failed: ${error.message}`);
    }

    return normalizeModerationStateRow(data[0], userId);
  };

  return {
    getActiveRestriction: async (userId: string) => {
      const { data, error } = await client
        .rpc('get_active_user_restriction');

      if (error) {
        throw new Error(`Active restriction lookup failed: ${error.message}`);
      }

      return data[0];
    },
    getState,
    recordWarning: async (
      userId: string,
      sourceFunction: string,
      review: ModerationReview,
    ) => {
      const existingState = await getState(userId);
      const effectivePreviousCount = getEffectiveWarningCount(existingState);
      const warningCount = Math.min(effectivePreviousCount + 1, WARNING_LIMIT);
      const now = new Date().toISOString();
      const { data: storedState, error: stateError } = await client
        .rpc('record_user_moderation_warning', {
          source_function: sourceFunction,
          warning_reason: review.reason,
          warning_categories: review.signals.map((signal) => signal.category),
          warning_excerpt: summarizeSignals(review.signals),
          ban_criteria: {
            warningCount,
            categories: review.signals.map((signal) => signal.category),
            evidence: review.signals,
          },
        });

      if (stateError) {
        throw new Error(`Moderation state update failed: ${stateError.message}`);
      }

      return normalizeModerationStateRow(storedState[0], userId) ?? {
        user_id: userId,
        warning_count: warningCount,
        last_warning_reason: review.reason,
        last_warning_categories: review.signals.map((signal) => signal.category),
        last_warning_excerpt: summarizeSignals(review.signals),
        last_warning_at: now,
        banned_at: warningCount >= WARNING_LIMIT ? now : null,
        active_restriction_id: null,
        updated_at: now,
      };
    },
    recordSoftBlock: async (
      sourceFunction: string,
      scope: string,
      review: ModerationReview,
      warningThreshold: number,
    ) => {
      const { data, error } = await client
        .rpc('record_user_moderation_soft_block', {
          p_source_function: sourceFunction,
          p_block_scope: scope,
          p_block_reason: review.reason,
          p_block_categories: review.signals.map((signal) => signal.category),
          p_block_excerpt: summarizeSignals(review.signals),
          p_block_signals: review.signals,
          p_warning_threshold: warningThreshold,
        });

      if (error) {
        throw new Error(`Moderation soft block update failed: ${error.message}`);
      }

      return normalizeSoftBlockResult(data[0]);
    },
  };
}

// WARNING_LIMIT is the fixed strike count before an automatic ban.
const WARNING_LIMIT = 3;

// WARNING_WINDOW_MS is the cooling window after which warnings reset.
const WARNING_WINDOW_MS = 60 * 60 * 1000;

// createModerationClient builds a user-authenticated client for moderation RPC calls.
function createModerationClient(authorization: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new Error('Moderation database configuration is missing.');
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

// summarizeSignals creates a compact evidence string for the warning state table.
function summarizeSignals(signals: readonly ModerationSignal[]): string {
  return signals
    .map((signal) => `${signal.category}: ${signal.evidence}`)
    .slice(0, 4)
    .join(' | ');
}

// normalizeModerationStateRow converts RPC output into the local state contract.
function normalizeModerationStateRow(
  value: unknown,
  fallbackUserId: string,
): ModerationStateRow | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const row = value as Record<string, unknown>;
  const categories = Array.isArray(row.last_warning_categories)
    ? row.last_warning_categories.filter(
        (category): category is string => typeof category === 'string',
      )
    : [];

  return {
    user_id:
      typeof row.user_id === 'string'
        ? row.user_id
        : typeof row.moderation_user_id === 'string'
          ? row.moderation_user_id
          : fallbackUserId,
    warning_count:
      typeof row.warning_count === 'number' ? row.warning_count : 0,
    last_warning_reason:
      typeof row.last_warning_reason === 'string'
        ? row.last_warning_reason
        : null,
    last_warning_categories: categories,
    last_warning_excerpt:
      typeof row.last_warning_excerpt === 'string'
        ? row.last_warning_excerpt
        : null,
    last_warning_at:
      typeof row.last_warning_at === 'string' ? row.last_warning_at : null,
    banned_at: typeof row.banned_at === 'string' ? row.banned_at : null,
    active_restriction_id:
      typeof row.active_restriction_id === 'string'
        ? row.active_restriction_id
        : null,
    updated_at:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date().toISOString(),
  };
}

// normalizeSoftBlockResult turns RPC rows into a stable Edge Function contract.
function normalizeSoftBlockResult(row: unknown): ModerationSoftBlockResult {
  const value = row && typeof row === 'object' ? row as Record<string, unknown> : {};
  const attemptCount =
    typeof value.attempt_count === 'number' ? value.attempt_count : 1;
  const attemptsRemaining =
    typeof value.attempts_remaining === 'number'
      ? value.attempts_remaining
      : 0;
  const warningCount =
    typeof value.warning_count === 'number' ? value.warning_count : undefined;
  const warningsRemaining =
    typeof value.warnings_remaining === 'number'
      ? value.warnings_remaining
      : undefined;
  const bannedAt =
    typeof value.banned_at === 'string' ? value.banned_at : undefined;
  const activeRestrictionId =
    typeof value.active_restriction_id === 'string'
      ? value.active_restriction_id
      : undefined;

  return {
    attemptCount,
    attemptsRemaining,
    didRecordWarning: value.did_record_warning === true,
    ...(warningCount !== undefined ? { warningCount } : {}),
    ...(warningsRemaining !== undefined ? { warningsRemaining } : {}),
    ...(bannedAt ? { bannedAt } : {}),
    ...(activeRestrictionId ? { activeRestrictionId } : {}),
  };
}

// getEffectiveWarningCount resolves the current strike count after the one-hour decay window.
export function getEffectiveWarningCount(
  state: ModerationStateRow | undefined,
): number {
  if (!state) {
    return 0;
  }

  if (state.banned_at) {
    return Math.min(state.warning_count, WARNING_LIMIT);
  }

  if (!state.last_warning_at) {
    return 0;
  }

  const elapsedMs = Date.now() - Date.parse(state.last_warning_at);

  if (!Number.isFinite(elapsedMs) || elapsedMs > WARNING_WINDOW_MS) {
    return 0;
  }

  return Math.min(state.warning_count, WARNING_LIMIT);
}

// collectModerationText flattens request payloads into text the scanner can inspect.
export function collectModerationText(value: unknown): string[] {
  const values: string[] = [];

  walkModerationValue(value, values);

  return values;
}

// ModerationEntry pairs a normalized request path with its text value.
export type ModerationEntry = {
  // sourceLabel identifies the field path that produced the text.
  readonly sourceLabel: string;
  // text is the field content scanned for policy violations.
  readonly text: string;
};

// collectModerationEntries preserves field paths so moderation warnings stay explainable.
export function collectModerationEntries(value: unknown): ModerationEntry[] {
  const entries: ModerationEntry[] = [];

  walkModerationEntries(value, entries, []);

  return entries;
}

// walkModerationValue traverses nested request data and collects text-like values.
function walkModerationValue(value: unknown, values: string[]): void {
  if (typeof value === 'string') {
    const normalized = value.trim();

    if (normalized.length > 0) {
      values.push(normalized);
    }

    return;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    values.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walkModerationValue(item, values);
    }

    return;
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      walkModerationValue(entry, values);
    }
  }
}

// walkModerationEntries traverses nested request data and keeps source paths.
function walkModerationEntries(
  value: unknown,
  entries: ModerationEntry[],
  path: readonly string[],
): void {
  if (typeof value === 'string') {
    const normalized = value.trim();

    if (normalized.length > 0) {
      entries.push({
        sourceLabel: path.join('.') || 'request',
        text: normalized,
      });
    }

    return;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    entries.push({
      sourceLabel: path.join('.') || 'request',
      text: String(value),
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkModerationEntries(item, entries, [...path, `[${index}]`]),
    );

    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      walkModerationEntries(entry, entries, [...path, key]);
    }
  }
}

// scanModerationText evaluates the request context against conservative policy patterns.
export function scanModerationText(sourceLabels: string[], texts: string[]): ModerationSignal[] {
  const normalizedTexts = texts.map(normalizeModerationText);
  const signals: ModerationSignal[] = [];

  for (const [category, patterns] of Object.entries(MODERATED_PATTERNS) as Array<
    [ModerationCategory, readonly ModerationPattern[]]
  >) {
    const match = findModerationMatch(normalizedTexts, sourceLabels, patterns);

    if (match) {
      signals.push({
        category,
        evidence: match.evidence,
        sourceLabel: match.sourceLabel,
      });
    }
  }

  return signals;
}

// scanModerationEntries evaluates labeled request fields against conservative policy patterns.
export function scanModerationEntries(
  entries: readonly ModerationEntry[],
): ModerationSignal[] {
  const texts = entries.map((entry) => entry.text);
  const sourceLabels = entries.map((entry) => entry.sourceLabel);

  return scanModerationText(sourceLabels, texts);
}

// buildModerationReview combines a fresh scan with the current warning counter.
export function buildModerationReview({
  previousWarningCount,
  signals,
}: {
  // previousWarningCount is the number of warnings already stored for the user.
  readonly previousWarningCount: number;
  // signals are the matched moderation categories for the current request.
  readonly signals: readonly ModerationSignal[];
}): ModerationReview {
  const blocked = signals.length > 0;
  const warningCount = blocked
    ? Math.min(previousWarningCount + 1, WARNING_LIMIT)
    : previousWarningCount;
  const warningsRemaining = Math.max(WARNING_LIMIT - warningCount, 0);
  const shouldBan = blocked && warningCount >= WARNING_LIMIT;

  return {
    blocked,
    shouldBan,
    warningCount,
    warningsRemaining,
    reason: blocked
      ? 'This request matched blocked content rules and could not be sent to the AI service.'
      : 'No moderation issue was detected.',
    signals,
  };
}

// normalizeModerationText makes phrase matching resilient to punctuation and case changes.
function normalizeModerationText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ModerationPattern describes one rule-based trigger for a policy category.
type ModerationPattern = {
  // source labels hint at which request area produced the match.
  readonly sourceLabel: string;
  // regex is the normalized text trigger.
  readonly regex: RegExp;
  // evidenceMode controls whether the pattern should capture a full excerpt.
  readonly evidenceMode: 'match' | 'context';
};

// findModerationMatch searches the normalized request text for a first policy hit.
function findModerationMatch(
  normalizedTexts: readonly string[],
  sourceLabels: readonly string[],
  patterns: readonly ModerationPattern[],
): { evidence: string; sourceLabel: string } | undefined {
  for (const pattern of patterns) {
    for (let index = 0; index < normalizedTexts.length; index += 1) {
      const text = normalizedTexts[index];

      if (!pattern.regex.test(text)) {
        continue;
      }

      const sourceLabel = sourceLabels[index] ?? pattern.sourceLabel;
      const evidence = matchSnippet(text, pattern.regex);

      return { evidence, sourceLabel };
    }
  }

  return undefined;
}

// matchSnippet extracts a short readable excerpt around the first matching fragment.
function matchSnippet(text: string, regex: RegExp): string {
  const contextRadius = 90;
  const match = regex.exec(text);

  if (!match) {
    return text.slice(0, 220);
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const excerptStart = Math.max(0, matchStart - contextRadius);
  const excerptEnd = Math.min(text.length, matchEnd + contextRadius);

  return text.slice(excerptStart, excerptEnd).trim();
}

// MODERATED_PATTERNS is a conservative set of blocked-content detectors.
const MODERATED_PATTERNS: Record<ModerationCategory, readonly ModerationPattern[]> = {
  copyright: [
    {
      sourceLabel: 'copyright-franchise',
      regex:
        /\b(harry potter|harry poter|hary potter|hary poter|garry potter|garry poter|gary potter|gary poter|star wars|marvel|disney|pokemon|pokémon|naruto|one piece|onepiece|lord of the rings|lotr|game of thrones|witcher|spongebob|sponge bob|minecraft|frozen|avengers)\b/,
      evidenceMode: 'match',
    },
  ],
  unsafe_content: [
    {
      sourceLabel: 'unsafe-object-reference',
      regex: /\b(bombs?|explosives?|weapons?|poisons?|guns?|knives?)\b/,
      evidenceMode: 'match',
    },
    {
      sourceLabel: 'violence-instruction',
      regex:
        /\b(how to|make|build|hide|use)\b.*\b(bombs?|weapons?|poisons?|guns?|knives?|explosives?)\b/,
      evidenceMode: 'context',
    },
    {
      sourceLabel: 'self-harm',
      regex:
        /\b(self harm|self harm|suicide|kill myself|hurt myself|overdose myself)\b/,
      evidenceMode: 'match',
    },
    {
      sourceLabel: 'extreme-violence',
      regex:
        /\b(rape|torture|massacre|murder|execute|decapitate|behead)\b/,
      evidenceMode: 'match',
    },
  ],
  age_or_content: [
    {
      sourceLabel: 'explicit-content',
      regex:
        /\b(nsfw|explicit|porn|pornographic|erotic|sex|sexual|nude|nudity|barely legal|loli|lolita)\b/,
      evidenceMode: 'match',
    },
    {
      sourceLabel: 'minor-risk',
      regex:
        /\b(underage|minors?|children?|child)\b.*\b(sex|sexual|nude|porn|erotic)\b|\b(sex|sexual|nude|porn|erotic)\b.*\b(underage|minors?|children?|child)\b/,
      evidenceMode: 'context',
    },
  ],
  drugs: [
    {
      sourceLabel: 'drug-use',
      regex:
        /\b(cocaine|heroin|meth|fentanyl|lsd|acid|marijuana|weed|hash|ecstasy|mdma|opioid|opiate|oxy|overdose|snort|smoke crack)\b/,
      evidenceMode: 'match',
    },
    {
      sourceLabel: 'drug-intent',
      regex:
        /\b(get high|take a hit|buy drugs|sell drugs|deal drugs|cook meth|make heroin)\b/,
      evidenceMode: 'match',
    },
  ],
};
