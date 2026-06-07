import type {
  AuthCredentials,
  AuthGateway,
  AuthSession,
  AuthSignUpResult,
  AuthSubscription,
} from '@application/ports';

// ManageAuthSession coordinates account validation and the external auth boundary.
export type ManageAuthSession = {
  // restore reads the persisted session during application startup.
  readonly restore: () => Promise<AuthSession | undefined>;
  // signIn validates credentials before requesting an authenticated session.
  readonly signIn: (credentials: AuthCredentials) => Promise<AuthSession>;
  // signUp validates credentials before creating an account.
  readonly signUp: (
    credentials: AuthCredentials,
  ) => Promise<AuthSignUpResult>;
  // signOut clears the active account session.
  readonly signOut: () => Promise<void>;
  // subscribe reports external auth state changes to presentation.
  readonly subscribe: (
    listener: (session: AuthSession | undefined) => void,
  ) => AuthSubscription;
};

// createManageAuthSession keeps credential rules outside the presentation layer.
export function createManageAuthSession(
  gateway: AuthGateway,
): ManageAuthSession {
  return {
    restore: () => gateway.getSession(),
    signIn: async (credentials) =>
      gateway.signIn(validateCredentials(credentials)),
    signUp: async (credentials) =>
      gateway.signUp(validateCredentials(credentials)),
    signOut: () => gateway.signOut(),
    subscribe: (listener) => gateway.subscribe(listener),
  };
}

// validateCredentials normalizes email and enforces the minimum password contract.
function validateCredentials(credentials: AuthCredentials): AuthCredentials {
  const email = credentials.email.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  if (credentials.password.length < 8) {
    throw new Error('Password must contain at least 8 characters.');
  }

  return { email, password: credentials.password };
}
