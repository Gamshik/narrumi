import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  AuthCredentials,
  AuthSession,
  AuthSignUpResult,
} from '@application/ports';

import { localAppServices } from '../../services/localAppServices';

// AuthContextValue is the presentation-facing account session contract.
type AuthContextValue = {
  // isRestoring distinguishes startup session loading from signed-out state.
  readonly isRestoring: boolean;
  // session is the active authenticated identity when available.
  readonly session?: AuthSession;
  // signIn authenticates an existing email/password account.
  readonly signIn: (credentials: AuthCredentials) => Promise<void>;
  // signUp creates an account and reports email-confirmation requirements.
  readonly signUp: (
    credentials: AuthCredentials,
  ) => Promise<AuthSignUpResult>;
  // signOut closes the current remote sync session without deleting local data.
  readonly signOut: () => Promise<void>;
};

// AuthProviderProps defines the route subtree controlled by session state.
type AuthProviderProps = {
  // children are the auth gate and application routes.
  readonly children: ReactNode;
};

// AuthContext is undefined outside AuthProvider to catch invalid hook use.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// AuthProvider restores sessions and starts sync whenever authentication becomes active.
export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [isRestoring, setIsRestoring] = useState(true);
  const [session, setSession] = useState<AuthSession>();

  useEffect(() => {
    let isActive = true;
    const subscription = localAppServices.manageAuthSession.subscribe(
      (nextSession) => {
        if (isActive) {
          setSession(nextSession);
          setIsRestoring(false);
        }
      },
    );

    void localAppServices.manageAuthSession
      .restore()
      .then((restoredSession) => {
        if (isActive) {
          setSession(restoredSession);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsRestoring(false);
        }
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      void localAppServices.syncLocalChanges.execute().catch(() => undefined);
    }
  }, [session]);

  // value is memoized so route trees update only when auth state changes.
  const value = useMemo<AuthContextValue>(
    () => ({
      isRestoring,
      ...(session ? { session } : {}),
      signIn: async (credentials) => {
        const authenticatedSession =
          await localAppServices.manageAuthSession.signIn(credentials);

        setSession(authenticatedSession);
      },
      signUp: async (credentials) => {
        const result =
          await localAppServices.manageAuthSession.signUp(credentials);

        if (result.session) {
          setSession(result.session);
        }

        return result;
      },
      signOut: async () => {
        await localAppServices.manageAuthSession.signOut();
        setSession(undefined);
      },
    }),
    [isRestoring, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuthSession exposes required account state to the auth gate and screen.
export function useAuthSession(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthSession must be used within AuthProvider.');
  }

  return value;
}
