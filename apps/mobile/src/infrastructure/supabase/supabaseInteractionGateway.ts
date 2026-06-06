import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseInteractionAiPayload,
  type InteractionAiPayload,
  type SubmitInteractionRequest,
} from '@application/ai/episodeAiPayload';
import type { InteractionGateway } from '@application/ports';

// SupabaseInteractionGateway invokes the submit-interaction Edge Function.
export class SupabaseInteractionGateway implements InteractionGateway {
  // client owns Supabase transport details outside application use cases.
  private readonly client: SupabaseClient;

  // constructor receives an environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // submitInteraction calls the Edge Function and validates its structured JSON response.
  async submitInteraction(
    request: SubmitInteractionRequest,
  ): Promise<InteractionAiPayload> {
    const { data, error } = await this.client.functions.invoke<unknown>(
      'submit-interaction',
      {
        body: request,
      },
    );

    if (error) {
      throw new Error('Story interaction service is unavailable.');
    }

    return parseInteractionAiPayload(data);
  }
}
