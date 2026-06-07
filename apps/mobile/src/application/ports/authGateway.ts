// AuthSession is the authenticated identity exposed outside the Supabase adapter.
export type AuthSession = {
  // userId is the stable Supabase Auth owner id used by RLS.
  readonly userId: string;
  // email is the normalized account address shown in settings.
  readonly email: string;
};

// AuthCredentials contains the email/password input accepted by auth use cases.
export type AuthCredentials = {
  // email is the normalized account address.
  readonly email: string;
  // password is the user-provided secret and must never be persisted by app code.
  readonly password: string;
};

// AuthSignUpResult distinguishes an active session from required email confirmation.
export type AuthSignUpResult = {
  // session is present when Supabase immediately authenticates the new account.
  readonly session?: AuthSession;
  // requiresEmailConfirmation tells UI to ask the user to confirm their inbox.
  readonly requiresEmailConfirmation: boolean;
};

// AuthSubscription releases the SDK listener when the presentation provider unmounts.
export type AuthSubscription = {
  // unsubscribe removes the active auth-state listener.
  readonly unsubscribe: () => void;
};

// AuthGateway owns account actions without leaking Supabase SDK contracts.
export type AuthGateway = {
  // getSession restores the persisted mobile session when one exists.
  readonly getSession: () => Promise<AuthSession | undefined>;
  // signIn creates an authenticated session from email and password.
  readonly signIn: (credentials: AuthCredentials) => Promise<AuthSession>;
  // signUp creates an account and may require email confirmation.
  readonly signUp: (
    credentials: AuthCredentials,
  ) => Promise<AuthSignUpResult>;
  // signOut clears the local Supabase session and refresh token.
  readonly signOut: () => Promise<void>;
  // subscribe reports login, logout, and token-restored session changes.
  readonly subscribe: (
    listener: (session: AuthSession | undefined) => void,
  ) => AuthSubscription;
};
