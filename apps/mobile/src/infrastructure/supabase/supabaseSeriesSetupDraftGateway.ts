import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type {
  GenerateSeriesSetupDraftRequest,
  SeriesSetupDraft,
  SeriesSetupDraftGateway,
} from '@application/ports';
import {
  createProfilesFromCharacterNames,
  normalizeCharacterProfiles,
  seriesSetupTextFields,
} from '@domain/index';

import { toSupabaseFunctionError } from './supabaseFunctionError';

// seriesSetupDraftSchema validates untrusted AI setup output before UI uses it.
const seriesSetupDraftSchema = z.object({
  title: z.string().trim().min(1),
  premise: z.string().trim().min(1),
  mainCharacters: z.array(z.string().trim().min(1)).min(1).max(8),
  characterProfiles: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
        description: z.string().trim(),
      }),
    )
    .min(1)
    .max(8)
    .optional(),
  userRole: z.string().trim().min(1).optional(),
  changedFields: z.array(z.enum(seriesSetupTextFields)).max(4),
});

// SupabaseSeriesSetupDraftGateway invokes the generate-series-setup Edge Function.
export class SupabaseSeriesSetupDraftGateway implements SeriesSetupDraftGateway {
  // client owns Supabase transport details outside application use cases.
  private readonly client: SupabaseClient;

  // constructor receives an environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // generateSeriesSetupDraft calls the Edge Function and validates complete setup text.
  async generateSeriesSetupDraft(
    request: GenerateSeriesSetupDraftRequest,
  ): Promise<SeriesSetupDraft> {
    const { data, error, response } = await this.client.functions.invoke<unknown>(
      'generate-series-setup',
      {
        body: request,
      },
    );

    if (error) {
      throw (
        (await toSupabaseFunctionError(error, response)) ??
        new Error('Series setup generator is unavailable.')
      );
    }

    const parsed = seriesSetupDraftSchema.parse(data);

    return {
      title: parsed.title,
      premise: parsed.premise,
      mainCharacters: parsed.mainCharacters,
      characterProfiles: normalizeCharacterProfiles(
        parsed.characterProfiles ??
          createProfilesFromCharacterNames(parsed.mainCharacters),
      ),
      ...(parsed.userRole ? { userRole: parsed.userRole } : {}),
      changedFields: parsed.changedFields,
    };
  }
}
