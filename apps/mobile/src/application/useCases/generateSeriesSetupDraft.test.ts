import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  GenerationRequestStore,
  NetworkStatus,
  SeriesSetupDraftGateway,
} from '@application/ports';
import { createDefaultSeriesCreativeBrief } from '@domain/index';

import { createGenerateSeriesSetupDraft } from './generateSeriesSetupDraft';

// characterProfiles is the structured setup draft returned by the AI boundary.
const characterProfiles = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A curious learner investigating the blue door.',
  },
  {
    id: 'character:leo',
    name: 'Leo',
    description: 'A library assistant who knows old building stories.',
  },
] as const;

// creativeBrief is the exact user-authored setup context forwarded through retries.
const creativeBrief = {
  ...createDefaultSeriesCreativeBrief(),
  idea: 'A quiet blue door appears under the library stairs.',
};

describe('generateSeriesSetupDraft', () => {
  it('passes selected fields as constraints and returns a complete draft', async () => {
    // networkStatus keeps the server-backed setup generation path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gatewayCallCount proves rapid identical requests share one in-flight Promise.
    let gatewayCallCount = 0;
    // gateway asserts that list-selected fields are passed without generation.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async (request) => {
        gatewayCallCount += 1;
        assert.match(request.generationRequestId, /^generation:/);
        assert.equal(request.cefrLevel, 'B1');
        assert.equal(request.genre, 'short-fiction');
        assert.equal(request.tone, 'Calm detective');
        assert.equal(request.participationMode, 'director');
        assert.equal(request.title, 'Blue Door');
        assert.equal(request.creativeBrief.idea, creativeBrief.idea);
        assert.equal(request.creativeBrief.draftStrategy, 'fill-missing');

        return {
          title: 'Blue Door',
          premise: 'Mira finds a quiet blue door under the library stairs.',
          mainCharacters: ['Mira', 'Leo'],
          characterProfiles,
          changedFields: ['premise', 'characterProfiles'],
        };
      },
    };
    const useCase = createGenerateSeriesSetupDraft(networkStatus, gateway, {
      now: () => new Date('2026-07-16T00:00:00.000Z'),
    }, createMemoryGenerationRequestStore());

    const input = {
      title: 'Blue Door',
      cefrLevel: 'B1',
      genre: 'short-fiction',
      tone: 'Calm detective',
      participationMode: 'director',
      mainCharacters: [],
      creativeBrief,
    } as const;
    const [result, duplicateResult] = await Promise.all([
      useCase.execute(input),
      useCase.execute(input),
    ]);

    assert.equal(result.draft.title, 'Blue Door');
    assert.equal(duplicateResult.draft.title, result.draft.title);
    assert.equal(gatewayCallCount, 1);
    assert.deepEqual(result.draft.mainCharacters, ['Mira', 'Leo']);

    await useCase.execute(input);
    assert.equal(gatewayCallCount, 2);
  });

  it('automatically retries a transient first attempt with the same request id', async () => {
    // networkStatus keeps both retry attempts inside the online generation path.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // requestIds capture the identity sent before and after the transient failure.
    const requestIds: string[] = [];
    // gateway fails once so the durable request store must retain the same identity.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async (request) => {
        requestIds.push(request.generationRequestId);

        if (requestIds.length === 1) {
          throw new Error('Temporary transport failure');
        }

        return {
          title: 'Blue Door',
          premise: 'Mira finds a quiet blue door under the library stairs.',
          mainCharacters: ['Mira', 'Leo'],
          characterProfiles,
          changedFields: ['title', 'premise', 'characterProfiles'],
        };
      },
    };
    const requestStore = createMemoryGenerationRequestStore();
    const useCase = createGenerateSeriesSetupDraft(
      networkStatus,
      gateway,
      { now: () => new Date('2026-07-16T00:00:00.000Z') },
      requestStore,
    );
    const input = {
      cefrLevel: 'B1',
      genre: 'short-fiction',
      tone: 'Calm detective',
      participationMode: 'director',
      mainCharacters: [],
      creativeBrief,
    } as const;

    await useCase.execute(input);

    assert.equal(requestIds.length, 2);
    assert.equal(requestIds[1], requestIds[0]);
  });

  it('does not retry a non-recoverable typed generation error', async () => {
    // networkStatus keeps the request inside the online generation path.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gatewayCallCount proves validation failures are not repeated automatically.
    let gatewayCallCount = 0;
    const validationError = Object.assign(new Error('Invalid setup request'), {
      kind: 'validation',
    });
    // gateway returns a stable contract error that requires input changes.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async () => {
        gatewayCallCount += 1;
        throw validationError;
      },
    };
    const useCase = createGenerateSeriesSetupDraft(
      networkStatus,
      gateway,
      { now: () => new Date('2026-07-16T00:00:00.000Z') },
      createMemoryGenerationRequestStore(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          cefrLevel: 'B1',
          genre: 'short-fiction',
          tone: 'Calm detective',
          participationMode: 'director',
          mainCharacters: [],
          creativeBrief,
        }),
      /Invalid setup request/,
    );
    assert.equal(gatewayCallCount, 1);
  });

  it('blocks setup generation while offline', async () => {
    // networkStatus models the explicit online-only AI boundary.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: false }),
    };
    // gateway must not be reached while offline.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async () => {
        throw new Error('Unexpected gateway call');
      },
    };
    const useCase = createGenerateSeriesSetupDraft(networkStatus, gateway, {
      now: () => new Date('2026-07-16T00:00:00.000Z'),
    }, createMemoryGenerationRequestStore());

    await assert.rejects(
      () =>
        useCase.execute({
          cefrLevel: 'B1',
          genre: 'short-fiction',
          tone: 'Calm detective',
          participationMode: 'director',
          mainCharacters: [],
          creativeBrief,
        }),
      /only when online/,
    );
  });
});

// createMemoryGenerationRequestStore models durable retry state without AsyncStorage.
function createMemoryGenerationRequestStore(): GenerationRequestStore {
  // requests maps canonical operation keys to unfinished request identifiers.
  const requests = new Map<string, string>();

  return {
    get: async (operationKey) => requests.get(operationKey),
    save: async (operationKey, requestId) => {
      requests.set(operationKey, requestId);
    },
    remove: async (operationKey, requestId) => {
      if (requests.get(operationKey) === requestId) {
        requests.delete(operationKey);
      }
    },
  };
}
