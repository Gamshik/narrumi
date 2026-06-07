// AuthSessionProvider exposes authenticated ownership without leaking Supabase auth types.
export type AuthSessionProvider = {
  // getAuthenticatedUserId returns the active user id or undefined for local-only use.
  readonly getAuthenticatedUserId: () => Promise<string | undefined>;
};
