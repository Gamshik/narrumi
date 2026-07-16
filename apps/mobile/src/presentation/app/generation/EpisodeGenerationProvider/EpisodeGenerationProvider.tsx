import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import type {
  GenerateEpisodeInput,
  GenerateEpisodeResult,
} from '@application/index';
import { localAppServices } from '@presentation/app/services/localAppServices';

import {
  createEpisodeGenerationTracker,
  type EpisodeGenerationState,
  type EpisodeGenerationTracker,
} from '../episodeGenerationTracker';

// EpisodeGenerationContextValue exposes generation state across route lifetimes.
export type EpisodeGenerationContextValue = {
  // clearGeneration acknowledges a completed or failed request after presentation handles it.
  readonly clearGeneration: (seriesId: string) => void;
  // generationStates contains current generation state keyed by series id.
  readonly generationStates: ReadonlyMap<string, EpisodeGenerationState>;
  // generateEpisode starts or joins the request for one series.
  readonly generateEpisode: (
    input: GenerateEpisodeInput,
  ) => Promise<GenerateEpisodeResult>;
};

// EpisodeGenerationProviderProps contains the complete navigation subtree.
type EpisodeGenerationProviderProps = {
  // children remain mounted under one generation lifecycle owner.
  readonly children: ReactNode;
};

// EpisodeGenerationContext is undefined outside the root provider by design.
const EpisodeGenerationContext = createContext<
  EpisodeGenerationContextValue | undefined
>(undefined);

// EpisodeGenerationProvider keeps requests alive while route screens are replaced.
export function EpisodeGenerationProvider({
  children,
}: EpisodeGenerationProviderProps): ReactElement {
  // tracker is created once for the lifetime of the authenticated route tree.
  const [tracker] = useState<EpisodeGenerationTracker>(
    (): EpisodeGenerationTracker =>
      createEpisodeGenerationTracker((input) =>
        localAppServices.generateEpisode.execute(input),
      ),
  );
  const generationStates = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getSnapshot,
  );
  // value changes only when the externally tracked state map changes.
  const value = useMemo<EpisodeGenerationContextValue>(
    () => ({
      clearGeneration: tracker.clear,
      generationStates,
      generateEpisode: tracker.start,
    }),
    [generationStates, tracker],
  );

  return (
    <EpisodeGenerationContext.Provider value={value}>
      {children}
    </EpisodeGenerationContext.Provider>
  );
}

// useEpisodeGeneration reads the route-independent episode request state.
export function useEpisodeGeneration(): EpisodeGenerationContextValue {
  const value = useContext(EpisodeGenerationContext);

  if (!value) {
    throw new Error(
      'useEpisodeGeneration must be used within EpisodeGenerationProvider.',
    );
  }

  return value;
}
