import type { LearningPreferences } from '@domain/index';

// BootstrapSyncStatus tracks the non-blocking background remote sync attempt.
export type BootstrapSyncStatus =
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'unauthenticated'
  | 'failed';

// BootstrapReadyState means local data is available and UI can render.
export type BootstrapReadyState = {
  readonly kind: 'ready';
  readonly preferences: LearningPreferences;
  readonly recovered: boolean;
  readonly syncStatus: BootstrapSyncStatus;
  // syncErrorMessage preserves the safe application diagnostic for a failed attempt.
  readonly syncErrorMessage?: string;
};

// BootstrapSyncOutcome is the completed sync subset needed by presentation state.
export type BootstrapSyncOutcome = {
  // status excludes the transient syncing state produced only by the provider.
  readonly status: Exclude<BootstrapSyncStatus, 'syncing'>;
  // errorMessage identifies the failed record without exposing raw SDK objects.
  readonly errorMessage?: string;
};

// BootstrapState represents the lifecycle of the root authenticated session setup.
export type BootstrapState =
  | { readonly kind: 'hydrating' }
  | { readonly kind: 'failed' }
  | BootstrapReadyState;

// canRenderGuardedSurfaces checks if local hydration is complete.
export function canRenderGuardedSurfaces(
  state: BootstrapState,
): state is BootstrapReadyState {
  return state.kind === 'ready';
}

// applyBootstrapPreferences keeps the provider snapshot aligned with local persistence.
export function applyBootstrapPreferences(
  state: BootstrapState,
  preferences: LearningPreferences,
): BootstrapState {
  if (state.kind !== 'ready') {
    return state;
  }

  return { ...state, preferences };
}

// startBootstrapSync clears an obsolete diagnostic without changing local preferences.
export function startBootstrapSync(state: BootstrapState): BootstrapState {
  if (state.kind !== 'ready') {
    return state;
  }

  return {
    kind: 'ready',
    preferences: state.preferences,
    recovered: state.recovered,
    syncStatus: 'syncing',
  };
}

// applyBootstrapSyncOutcome records one completed attempt while preserving current preferences.
export function applyBootstrapSyncOutcome(
  state: BootstrapState,
  outcome: BootstrapSyncOutcome,
): BootstrapState {
  if (state.kind !== 'ready') {
    return state;
  }

  return {
    kind: 'ready',
    preferences: state.preferences,
    recovered: state.recovered,
    syncStatus: outcome.status,
    ...(outcome.status === 'failed' && outcome.errorMessage
      ? { syncErrorMessage: outcome.errorMessage }
      : {}),
  };
}

// getBootstrapSyncWarning returns diagnostic context if remote sync failed, leaving UI unaffected.
export function getBootstrapSyncWarning(
  state: BootstrapState,
): { readonly warning: 'sync_failed' } | undefined {
  if (state.kind !== 'ready') {
    return undefined;
  }

  if (state.syncStatus === 'failed') {
    return { warning: 'sync_failed' };
  }

  return undefined;
}
