import type {
  GenerateEpisodeInput,
  GenerateEpisodeResult,
} from '@application/index';

// EpisodeGenerationState is the route-independent state for one series request.
export type EpisodeGenerationState =
  | { readonly kind: 'generating' }
  | {
      readonly kind: 'completed';
      readonly result: GenerateEpisodeResult;
    }
  | {
      readonly kind: 'failed';
      readonly error: unknown;
    };

// EpisodeGenerationTracker owns active requests while individual screens mount and unmount.
export type EpisodeGenerationTracker = {
  // clear removes a settled state after a screen has consumed it.
  readonly clear: (seriesId: string) => void;
  // getSnapshot exposes a stable immutable map for useSyncExternalStore.
  readonly getSnapshot: () => ReadonlyMap<string, EpisodeGenerationState>;
  // start returns the existing Promise when the same series is already generating.
  readonly start: (
    input: GenerateEpisodeInput,
  ) => Promise<GenerateEpisodeResult>;
  // subscribe observes route-independent generation state changes.
  readonly subscribe: (listener: () => void) => () => void;
};

// EpisodeGenerationExecutor is the application action tracked by the root provider.
type EpisodeGenerationExecutor = (
  input: GenerateEpisodeInput,
) => Promise<GenerateEpisodeResult>;

// createEpisodeGenerationTracker creates one lifecycle owner above navigation routes.
export function createEpisodeGenerationTracker(
  execute: EpisodeGenerationExecutor,
): EpisodeGenerationTracker {
  // activeRequests guarantees one client request per series in this app process.
  const activeRequests = new Map<string, Promise<GenerateEpisodeResult>>();
  // listeners are React subscriptions owned by the root generation provider.
  const listeners = new Set<() => void>();
  // snapshot is replaced, never mutated, so useSyncExternalStore can detect updates.
  let snapshot: ReadonlyMap<string, EpisodeGenerationState> = new Map();

  // publish replaces one series state and notifies every active subscriber.
  const publish = (
    seriesId: string,
    state: EpisodeGenerationState | undefined,
  ): void => {
    const nextSnapshot = new Map(snapshot);

    if (state) {
      nextSnapshot.set(seriesId, state);
    } else {
      nextSnapshot.delete(seriesId);
    }

    snapshot = nextSnapshot;
    listeners.forEach((listener): void => listener());
  };

  return {
    clear: (seriesId): void => {
      if (!activeRequests.has(seriesId)) {
        publish(seriesId, undefined);
      }
    },
    getSnapshot: () => snapshot,
    start: (input): Promise<GenerateEpisodeResult> => {
      const activeRequest = activeRequests.get(input.seriesId);

      if (activeRequest) {
        return activeRequest;
      }

      publish(input.seriesId, { kind: 'generating' });

      const request = Promise.resolve()
        .then((): Promise<GenerateEpisodeResult> => execute(input))
        .then(
          (result): GenerateEpisodeResult => {
            activeRequests.delete(input.seriesId);
            publish(input.seriesId, { kind: 'completed', result });

            return result;
          },
          (error: unknown): never => {
            activeRequests.delete(input.seriesId);
            publish(input.seriesId, { kind: 'failed', error });

            throw error;
          },
        );

      activeRequests.set(input.seriesId, request);

      return request;
    },
    subscribe: (listener): (() => void) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}
