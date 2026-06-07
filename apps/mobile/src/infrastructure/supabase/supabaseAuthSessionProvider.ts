import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AuthCredentials,
  AuthGateway,
  AuthSession,
  AuthSessionProvider,
  AuthSignUpResult,
  AuthSubscription,
} from '@application/ports';

// SupabaseAuthSessionProvider reads the active persisted Supabase session.
export class SupabaseAuthSessionProvider
  implements AuthSessionProvider, AuthGateway
{
  // client owns auth transport details outside application sync logic.
  private readonly client: SupabaseClient;

  // constructor receives the shared environment-configured Supabase client.
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // getAuthenticatedUserId returns undefined when the app remains local-only.
  async getAuthenticatedUserId(): Promise<string | undefined> {
    return (await this.getSession())?.userId;
  }

  // getSession restores and maps the persisted Supabase session.
  async getSession(): Promise<AuthSession | undefined> {
    const { data, error } = await this.client.auth.getSession();

    if (error) {
      throw new Error('Supabase session could not be read.');
    }

    return data.session ? mapSession(data.session.user) : undefined;
  }

  // signIn creates a password session that satisfies database RLS.
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword(
      credentials,
    );

    if (error || !data.session) {
      throw new Error(mapAuthError(error?.message));
    }

    return mapSession(data.session.user);
  }

  // signUp creates an account and reports whether confirmation is still required.
  async signUp(credentials: AuthCredentials): Promise<AuthSignUpResult> {
    const { data, error } = await this.client.auth.signUp(credentials);

    if (error) {
      throw new Error(mapAuthError(error.message));
    }

    const session = data.session
      ? mapSession(data.session.user)
      : undefined;

    return {
      ...(session ? { session } : {}),
      requiresEmailConfirmation: session === undefined,
    };
  }

  // signOut removes the persisted refresh token and active client identity.
  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error('Sign out failed. Try again.');
    }
  }

  // subscribe maps Supabase auth events to the application session contract.
  subscribe(
    listener: (session: AuthSession | undefined) => void,
  ): AuthSubscription {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? mapSession(session.user) : undefined);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }
}

// mapSession validates the email required by the app account experience.
function mapSession(user: {
  readonly id: string;
  readonly email?: string;
}): AuthSession {
  if (!user.email) {
    throw new Error('The authenticated account does not have an email.');
  }

  return { userId: user.id, email: user.email };
}

// mapAuthError converts provider wording into stable user-facing messages.
function mapAuthError(message: string | undefined): string {
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (normalizedMessage.includes('already registered')) {
    return 'An account with this email already exists.';
  }

  if (normalizedMessage.includes('password')) {
    return 'The password does not meet account requirements.';
  }

  return 'Authentication failed. Try again.';
}
