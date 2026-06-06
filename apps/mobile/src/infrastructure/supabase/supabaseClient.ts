import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// SupabaseEnvironment stores public Expo config required for Edge Function calls.
type SupabaseEnvironment = {
  // url is the Supabase project URL from EXPO_PUBLIC_SUPABASE_URL.
  readonly url: string;
  // anonKey is the public anon key from EXPO_PUBLIC_SUPABASE_ANON_KEY.
  readonly anonKey: string;
};

// createSupabaseClient creates the mobile Supabase client from public env only.
export function createSupabaseClient(): SupabaseClient {
  const environment = readSupabaseEnvironment();

  return createClient(environment.url, environment.anonKey);
}

// readSupabaseEnvironment validates required public Expo environment variables.
function readSupabaseEnvironment(): SupabaseEnvironment {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are missing.');
  }

  return { url, anonKey };
}
