import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseExcerptTranslationPayload,
  type ExcerptTranslationPayload,
  type TranslateExcerptRequest,
} from '@application/ai/excerptTranslation';
import type { ExcerptTranslationGateway } from '@application/ports';

import { toSupabaseFunctionError } from './supabaseFunctionError';

// SupabaseExcerptTranslationGateway invokes the translate-excerpt Edge Function.
export class SupabaseExcerptTranslationGateway
  implements ExcerptTranslationGateway
{
  // client owns Supabase transport details outside application use cases.
  private readonly client: SupabaseClient;

  // constructor receives an environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // translateExcerpt calls the Edge Function and validates its structured response.
  async translateExcerpt(
    request: TranslateExcerptRequest,
  ): Promise<ExcerptTranslationPayload> {
    const { data, error } = await this.client.functions.invoke<unknown>(
      'translate-excerpt',
      {
        body: request,
      },
    );

    if (error) {
      throw (
        (await toSupabaseFunctionError(error)) ??
        new Error('Selected-text translation service is unavailable.')
      );
    }

    return parseExcerptTranslationPayload(data);
  }
}
