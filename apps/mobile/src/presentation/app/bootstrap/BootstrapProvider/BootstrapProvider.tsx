import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

import { localAppServices } from '@presentation/app/services/localAppServices';
import type { BootstrapState, BootstrapSyncStatus } from '../bootstrapState';

// BootstrapSessionContextValue provides the authenticated state and recovery actions.
export type BootstrapSessionContextValue = {
  readonly state: BootstrapState;
  readonly retry: () => void;
  readonly syncNow: () => Promise<void>;
};

const BootstrapSessionContext = createContext<
  BootstrapSessionContextValue | undefined
>(undefined);

// BootstrapProvider runs local hydration and non-blocking background sync.
export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BootstrapState>({ kind: 'hydrating' });
  // isHydrating guards against duplicate mount effects running hydration twice.
  const isHydrating = useRef(false);

  const hydrateAndSync = useCallback(async () => {
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

      setState((current) => {
        if (current.kind !== 'ready') {
          return current;
        }

        let nextSyncStatus: BootstrapSyncStatus = 'synced';

        if (syncResult.status === 'offline') {
          nextSyncStatus = 'offline';
        } else if (syncResult.status === 'unauthenticated') {
          nextSyncStatus = 'unauthenticated';
        } else if (syncResult.status === 'failed') {
          nextSyncStatus = 'failed';
        }

        return {
          ...current,
          syncStatus: nextSyncStatus,
        };
      });
    } catch {
      setState({ kind: 'failed' });
    } finally {
      isHydrating.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    void hydrateAndSync();
  }, [hydrateAndSync]);

  const syncNow = useCallback(async () => {
    setState((current) => {
      if (current.kind !== 'ready') {
        return current;
      }
      return { ...current, syncStatus: 'syncing' };
    });

    try {
      const syncResult = await localAppServices.syncLocalChanges.execute();

      setState((current) => {
        if (current.kind !== 'ready') {
          return current;
        }

        let nextSyncStatus: BootstrapSyncStatus = 'synced';

        if (syncResult.status === 'offline') {
          nextSyncStatus = 'offline';
        } else if (syncResult.status === 'unauthenticated') {
          nextSyncStatus = 'unauthenticated';
        } else if (syncResult.status === 'failed') {
          nextSyncStatus = 'failed';
        }

        return {
          ...current,
          syncStatus: nextSyncStatus,
        };
      });
    } catch {
      setState((current) => {
        if (current.kind !== 'ready') {
          return current;
        }
        return { ...current, syncStatus: 'failed' };
      });
    }
  }, []);

  // Mount effect triggers the initial hydration automatically.
  useEffect(() => {
    void hydrateAndSync();
  }, [hydrateAndSync]);

  return (
    <BootstrapSessionContext.Provider value={{ state, retry, syncNow }}>
      {children}
    </BootstrapSessionContext.Provider>
  );
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
