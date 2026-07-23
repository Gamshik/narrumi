import type { Clock } from '@application/ports';
import {
  defaultLearningGenre,
  DEFAULT_STORY_WORD_GOAL,
  type LearningPreferences,
} from '@domain/index';

// BootstrapHydrationResult returns loaded, created, or recovered local settings.
export type BootstrapHydrationResult =
  | { readonly kind: 'loaded'; readonly preferences: LearningPreferences }
  | { readonly kind: 'created'; readonly preferences: LearningPreferences }
  | { readonly kind: 'recovered'; readonly preferences: LearningPreferences };

// BootstrapPreferenceStore is the narrow infrastructure port for bootstrap reads.
export type BootstrapPreferenceStore = {
  // readBootstrapPreferences reads settings and flags invalid/recovered data.
  readonly readBootstrapPreferences: () => Promise<{
    readonly preferences: LearningPreferences | undefined;
    readonly recovered: boolean;
  }>;
  // savePreferences persists local defaults without awaiting remote sync.
  readonly savePreferences: (preferences: LearningPreferences) => Promise<void>;
};

// HydrateBootstrapSession reads or initializes settings before guarded UI rendering.
export type HydrateBootstrapSession = {
  // execute returns guaranteed preferences and metadata without remote calls.
  readonly execute: () => Promise<BootstrapHydrationResult>;
};

// createHydrateBootstrapSession injects storage and time dependencies.
export function createHydrateBootstrapSession(
  store: BootstrapPreferenceStore,
  clock: Clock,
): HydrateBootstrapSession {
  return {
    execute: async () => {
      const { preferences: existing, recovered } =
        await store.readBootstrapPreferences();

      if (existing) {
        return { kind: 'loaded', preferences: existing };
      }

      const timestamp = clock.now().toISOString();
      const preferences: LearningPreferences = {
        preferredCefrLevel: 'B1',
        preferredGenre: defaultLearningGenre,
        storyWordGoal: DEFAULT_STORY_WORD_GOAL,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:preferences:create`,
        },
      };

      await store.savePreferences(preferences);

      if (recovered) {
        return { kind: 'recovered', preferences };
      }

      return { kind: 'created', preferences };
    },
  };
}
