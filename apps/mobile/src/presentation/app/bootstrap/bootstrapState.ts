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
