import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseEpisodeAiPayload,
  type EpisodeAiPayload,
  type GenerateEpisodeRequest,
} from '@application/ai/episodeAiPayload';
import type { EpisodeGenerationGateway } from '@application/ports';

// SupabaseEpisodeGenerationGateway invokes the generate-episode Edge Function.
export class SupabaseEpisodeGenerationGateway implements EpisodeGenerationGateway {
  // client owns Supabase transport details outside application use cases.
  private readonly client: SupabaseClient;

  // constructor receives an environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // generateEpisode calls the Edge Function and validates its structured JSON response.
  async generateEpisode(
    request: GenerateEpisodeRequest,
  ): Promise<EpisodeAiPayload> {
    const { data, error } = await this.client.functions.invoke<unknown>(
      'generate-episode',
      {
        body: request,
      },
    );

    if (error) {
      throw new Error('Episode generation service is unavailable.');
    }

    return parseEpisodeAiPayload(data);
  }
}
