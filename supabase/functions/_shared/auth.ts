import { createClient } from 'npm:@supabase/supabase-js';

import { corsHeaders } from './http.ts';

// AuthenticatedUser identifies the owner of the request JWT without leaking auth internals.
export type AuthenticatedUser = {
  // userId is the Supabase Auth user id extracted from the bearer token.
  readonly userId: string;
};

// AuthenticationResult keeps unauthorized responses separate from normal request flow.
export type AuthenticationResult =
  | {
      // user identifies the authenticated request owner.
      readonly user: AuthenticatedUser;
    }
  | {
      // errorResponse short-circuits the Edge Function when auth is missing or invalid.
      readonly errorResponse: Response;
    };

// readAuthenticatedUserId validates the bearer token against Supabase Auth.
export async function readAuthenticatedUserId(
  request: Request,
): Promise<AuthenticationResult> {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: {
            kind: 'unauthorized',
            message: 'Authentication is required.',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: {
            kind: 'unavailable',
            message: 'Authentication service configuration is missing.',
          },
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      ),
    };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
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
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: {
            kind: 'unauthorized',
            message: 'Authentication is required.',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      ),
    };
  }

  return {
    user: {
      userId: data.user.id,
    },
  };
}
