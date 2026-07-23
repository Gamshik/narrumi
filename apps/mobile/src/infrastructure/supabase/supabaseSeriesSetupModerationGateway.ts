import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  SeriesSetupModerationGateway,
  ValidateSeriesSetupRequest,
} from '@application/ports';

import { toSupabaseFunctionError } from './supabaseFunctionError';

// SupabaseSeriesSetupModerationGateway invokes the validate-series-setup Edge Function.
export class SupabaseSeriesSetupModerationGateway
  implements SeriesSetupModerationGateway
{
  // client owns Supabase transport details outside application use cases.
  private readonly client: SupabaseClient;

  // constructor receives an environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // validateSeriesSetup checks user setup fields before local-first persistence.
  async validateSeriesSetup(request: ValidateSeriesSetupRequest): Promise<void> {
    const { error, response } = await this.client.functions.invoke<unknown>(
      'validate-series-setup',
      {
        body: request,
      },
    );

    if (error) {
      throw (
        (await toSupabaseFunctionError(error, response)) ??
        new Error('Series setup validation service is unavailable.')
      );
    }
  }
}
