import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseInteractionGatewayPayload,
  type InteractionGatewayPayload,
  type SubmitInteractionRequest,
} from '@application/ai/episodeAiPayload';
import type { InteractionGateway } from '@application/ports';

import {
  SupabaseFunctionError,
  toSupabaseFunctionError,
} from './supabaseFunctionError';

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
  ): Promise<InteractionGatewayPayload> {
    const { data, error, response } = await this.client.functions.invoke<unknown>(
      'submit-interaction',
      {
        body: request,
      },
    );

    if (error) {
      throw (
        (await toSupabaseFunctionError(error, response)) ??
        new SupabaseFunctionError({
          kind: 'unavailable',
          message: 'Story interaction service is unavailable.',
        })
      );
    }

    return parseInteractionGatewayPayload(data);
  }
}
