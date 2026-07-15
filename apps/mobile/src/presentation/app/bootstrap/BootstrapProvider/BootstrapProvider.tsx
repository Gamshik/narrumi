import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ReactElement } from 'react';

import type { UpdateLearningPreferencesInput } from '@application/index';
import type { LearningPreferences } from '@domain/index';
import { localAppServices } from '@presentation/app/services/localAppServices';
import {
  applyBootstrapPreferences,
  applyBootstrapSyncOutcome,
  startBootstrapSync,
  type BootstrapState,
} from '../bootstrapState';

// BootstrapSessionContextValue provides the authenticated state and recovery actions.
export type BootstrapSessionContextValue = {
  readonly state: BootstrapState;
  readonly retry: () => void;
  readonly syncNow: () => Promise<void>;
  // updatePreferences persists settings and updates the provider-owned snapshot atomically.
  readonly updatePreferences: (
    input: UpdateLearningPreferencesInput,
  ) => Promise<LearningPreferences>;
};

// BootstrapProviderProps contains the guarded application subtree.
type BootstrapProviderProps = {
  // children are rendered against one shared bootstrap session state.
  readonly children: React.ReactNode;
};

const BootstrapSessionContext = createContext<
  BootstrapSessionContextValue | undefined
>(undefined);

// BootstrapProvider runs local hydration and non-blocking background sync.
export function BootstrapProvider({
  children,
}: BootstrapProviderProps): ReactElement {
  const [state, setState] = useState<BootstrapState>({ kind: 'hydrating' });
  // isHydrating guards against duplicate mount effects running hydration twice.
  const isHydrating = useRef(false);

  const hydrateAndSync = useCallback(async (): Promise<void> => {
    if (isHydrating.current) {
      return;
    }

    isHydrating.current = true;
    setState({ kind: 'hydrating' });

    try {
      const result = await localAppServices.hydrateBootstrapSession.execute();

      // D-05: Local hydration is complete. Guarded surfaces can now render.
      setState({
        kind: 'ready',
        preferences: result.preferences,
        recovered: result.kind === 'recovered',
        syncStatus: 'syncing',
      });

      // SYNC-01, D-06: Start background sync without awaiting it.
      const syncResult = await localAppServices.syncLocalChanges.execute();
      const refreshed =
        await localAppServices.hydrateBootstrapSession.execute();

      setState((current) => {
        const refreshedState = applyBootstrapPreferences(
          current,
          refreshed.preferences,
        );

        return applyBootstrapSyncOutcome(refreshedState, syncResult);
      });
    } catch {
      setState({ kind: 'failed' });
    } finally {
      isHydrating.current = false;
    }
  }, []);

  const retry = useCallback((): void => {
    void hydrateAndSync();
  }, [hydrateAndSync]);

  // syncNow refreshes the provider snapshot from the reconciled local store.
  const syncNow = useCallback(async (): Promise<void> => {
    setState(startBootstrapSync);

    try {
      const syncResult = await localAppServices.syncLocalChanges.execute();
      const refreshed =
        await localAppServices.hydrateBootstrapSession.execute();

      setState((current) => {
        const refreshedState = applyBootstrapPreferences(
          current,
          refreshed.preferences,
        );

        return applyBootstrapSyncOutcome(refreshedState, syncResult);
      });
    } catch (error) {
      setState((current) =>
        applyBootstrapSyncOutcome(current, {
          status: 'failed',
          errorMessage: formatUnexpectedSyncError(error),
        }),
      );
    }
  }, []);

  // updatePreferences makes persisted local settings the provider source of truth.
  const updatePreferences = useCallback(
    async (
      input: UpdateLearningPreferencesInput,
    ): Promise<LearningPreferences> => {
      const savedPreferences =
        await localAppServices.updateLearningPreferences.execute(input);

      setState((current) =>
        applyBootstrapPreferences(current, savedPreferences),
      );

      return savedPreferences;
    },
    [],
  );

  // Mount effect triggers the initial hydration automatically.
  useEffect(() => {
    void hydrateAndSync();
  }, [hydrateAndSync]);

  return (
    <BootstrapSessionContext.Provider
      value={{ state, retry, syncNow, updatePreferences }}
    >
      {children}
    </BootstrapSessionContext.Provider>
  );
}

// formatUnexpectedSyncError keeps thrown infrastructure details bounded to one message.
function formatUnexpectedSyncError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Sync failed before a diagnostic was available.';
}

// useBootstrapSession exposes the root bootstrap state and recovery actions.
export function useBootstrapSession(): BootstrapSessionContextValue {
  const context = useContext(BootstrapSessionContext);

  if (context === undefined) {
    throw new Error(
      'useBootstrapSession must be used within a BootstrapProvider',
    );
  }

  return context;
}
