import { z } from 'npm:zod';

import { readAuthenticatedUserId } from '../_shared/auth.ts';
import {
  corsHeaders,
  jsonResponse,
  logSafeError,
  moderationResponse,
  safeErrorResponse,
  softModerationResponse,
} from '../_shared/http.ts';
import {
  buildModerationReview,
  collectModerationEntries,
  createModerationStore,
  scanModerationEntries,
  type ModerationEntry,
} from '../_shared/moderation.ts';

// SERIES_SETUP_SOFT_BLOCK_LIMIT is the number of blocked setup attempts allowed per hour before warnings start.
const SERIES_SETUP_SOFT_BLOCK_LIMIT = 10;

// seriesCreativeBriefSchema bounds optional human-authored anchors saved without AI generation.
const seriesCreativeBriefSchema = z.object({
  idea: z.string().trim().max(1000),
  worldAndSetting: z.string().trim().max(400),
  backstory: z.string().trim().max(600),
  storyDriver: z.string().trim().max(500),
  mustInclude: z.string().trim().max(300),
  avoid: z.string().trim().max(300),
  preferredCastSize: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]).optional(),
  draftStrategy: z.enum(['fill-missing', 'refine', 'rebuild']).optional(),
  // aiFreedom is accepted only for requests from clients released before draft strategies.
  aiFreedom: z.enum(['close', 'collaborative', 'surprise']).optional(),
}).transform(({ aiFreedom: _legacyAiFreedom, ...brief }) => ({
  ...brief,
  draftStrategy: brief.draftStrategy ?? 'fill-missing' as const,
}));

// defaultSeriesCreativeBrief keeps manual saves from older clients compatible.
const defaultSeriesCreativeBrief = {
  idea: '',
  worldAndSetting: '',
  backstory: '',
  storyDriver: '',
  mustInclude: '',
  avoid: '',
  draftStrategy: 'fill-missing' as const,
};

// seriesSetupSchema validates user-filled setup fields before local series creation.
const seriesSetupSchema = z.object({
  title: z.string().trim().min(1).max(160),
  tone: z.string().trim().min(1).max(120),
  premise: z.string().trim().min(1).max(1000),
  participationMode: z.enum(['director', 'character']),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).min(1).max(8),
  characterProfiles: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300),
      }),
    )
    .max(8)
    .optional(),
  userRole: z.string().trim().max(160).optional(),
  creativeBrief: seriesCreativeBriefSchema.default(defaultSeriesCreativeBrief),
}).superRefine((payload, context) => {
  if (payload.participationMode === 'character' && !payload.userRole?.trim()) {
    context.addIssue({
      code: 'custom',
      message: 'Character mode requires userRole.',
      path: ['userRole'],
    });
  }

  if (payload.participationMode === 'character' && payload.userRole?.trim()) {
    // profileNames are the only trusted dialogue identities accepted for learner ownership.
    const profileNames: readonly string[] =
      payload.characterProfiles?.map((profile): string => profile.name) ??
      payload.mainCharacters;
    // normalizedRole prevents casing or harmless spacing from breaking identity checks.
    const normalizedRole: string = normalizeCharacterName(payload.userRole);
    // hasMatchingProfile proves the learner role maps to one deterministic speaker.
    const hasMatchingProfile: boolean = profileNames.some(
      (name: string): boolean => normalizeCharacterName(name) === normalizedRole,
    );

    if (!hasMatchingProfile) {
      context.addIssue({
        code: 'custom',
        message: 'Character mode userRole must match one character profile name.',
        path: ['userRole'],
      });
    }
  }
});

// normalizeCharacterName keeps the Edge validation identity check deterministic.
function normalizeCharacterName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

// SeriesSetupRequest is the safe request shape sent by the mobile create-series use case.
type SeriesSetupRequest = z.infer<typeof seriesSetupSchema>;

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return safeErrorResponse('validation', 405);
  }

  const requestBody = await readJsonBody(request);
  const parsedRequest = seriesSetupSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError('validate-series-setup request validation failed', parsedRequest.error, {
      function: 'validate-series-setup',
    });

    return safeErrorResponse('validation', 400);
  }

  try {
    const authResult = await readAuthenticatedUserId(request);

    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const authorization = request.headers.get('Authorization') ?? '';
    const moderationStore = createModerationStore(authorization);
    const activeRestriction = await moderationStore.getActiveRestriction(
      authResult.user.userId,
    );

    if (activeRestriction) {
      return moderationResponse(
        'banned',
        0,
        'This account is currently blocked from creating new series.',
      );
    }

    const moderationSignals = scanModerationEntries(
      collectSeriesSetupModerationEntries(parsedRequest.data),
    );

    if (moderationSignals.length === 0) {
      return jsonResponse({ ok: true });
    }

    const review = buildModerationReview({
      previousWarningCount: 0,
      signals: moderationSignals,
    });
    const result = await moderationStore.recordSoftBlock(
      'validate-series-setup',
      'series_setup',
      review,
      SERIES_SETUP_SOFT_BLOCK_LIMIT,
    );

    if (!result.didRecordWarning) {
      return softModerationResponse(
        result.attemptsRemaining,
        'This series setup matched blocked content rules and was not saved.',
      );
    }

    return moderationResponse(
      result.bannedAt ? 'banned' : 'warning',
      result.warningsRemaining ?? 0,
      result.bannedAt
        ? 'This series setup matched blocked content rules again and the account has been banned.'
        : `This series setup matched blocked content rules too many times in the last hour. ${result.warningsRemaining ?? 0} warning${result.warningsRemaining === 1 ? '' : 's'} remain before a ban.`,
    );
  } catch (error) {
    logSafeError('validate-series-setup failed', error, {
      function: 'validate-series-setup',
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// collectSeriesSetupModerationEntries scans only fields the learner can write or choose.
function collectSeriesSetupModerationEntries(
  payload: SeriesSetupRequest,
): ModerationEntry[] {
  const entries: ModerationEntry[] = [
    { sourceLabel: 'title', text: payload.title },
    { sourceLabel: 'tone', text: payload.tone },
  ];

  if (payload.premise?.trim()) {
    entries.push({ sourceLabel: 'premise', text: payload.premise });
  }

  payload.mainCharacters.forEach((character, index) => {
    if (character.trim()) {
      entries.push({
        sourceLabel: `mainCharacters.[${index}]`,
        text: character,
      });
    }
  });

  payload.characterProfiles?.forEach((profile, index) => {
    if (profile.name.trim()) {
      entries.push({
        sourceLabel: `characterProfiles.[${index}].name`,
        text: profile.name,
      });
    }

    if (profile.description.trim()) {
      entries.push({
        sourceLabel: `characterProfiles.[${index}].description`,
        text: profile.description,
      });
    }
  });

  if (payload.userRole?.trim()) {
    entries.push({ sourceLabel: 'userRole', text: payload.userRole });
  }

  entries.push(
    ...collectModerationEntries({ creativeBrief: payload.creativeBrief }),
  );

  return entries;
}

// readJsonBody parses untrusted request JSON without leaking transport details.
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
