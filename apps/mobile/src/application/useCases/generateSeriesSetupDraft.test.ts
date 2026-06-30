import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  NetworkStatus,
  SeriesSetupDraftGateway,
} from '@application/ports';

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

describe('generateSeriesSetupDraft', () => {
  it('passes selected fields as constraints and returns a complete draft', async () => {
    // networkStatus keeps the server-backed setup generation path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gateway asserts that list-selected fields are passed without generation.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async (request) => {
        assert.equal(request.cefrLevel, 'B1');
        assert.equal(request.genre, 'short-fiction');
        assert.equal(request.tone, 'Calm detective');
        assert.equal(request.participationMode, 'director');
        assert.equal(request.title, 'Blue Door');

        return {
          title: 'Blue Door',
          premise: 'Mira finds a quiet blue door under the library stairs.',
          mainCharacters: ['Mira', 'Leo'],
          characterProfiles,
        };
      },
    };
    const useCase = createGenerateSeriesSetupDraft(networkStatus, gateway);

    const result = await useCase.execute({
      title: 'Blue Door',
      cefrLevel: 'B1',
      genre: 'short-fiction',
      tone: 'Calm detective',
      participationMode: 'director',
      mainCharacters: [],
    });

    assert.equal(result.draft.title, 'Blue Door');
    assert.deepEqual(result.draft.mainCharacters, ['Mira', 'Leo']);
  });

  it('forwards the single regenerate field to the gateway', async () => {
    // networkStatus keeps the server-backed regeneration path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gateway asserts the regenerate target reaches the AI boundary unchanged.
    const gateway: SeriesSetupDraftGateway = {
      generateSeriesSetupDraft: async (request) => {
        assert.equal(request.regenerateField, 'title');
        assert.equal(request.premise, 'A quiet blue door appears under the stairs.');

        return {
          title: 'Door of Echoes',
          premise: 'A quiet blue door appears under the stairs.',
          mainCharacters: ['Mira', 'Leo'],
          characterProfiles,
        };
      },
    };
    const useCase = createGenerateSeriesSetupDraft(networkStatus, gateway);

    const result = await useCase.execute({
      regenerateField: 'title',
      cefrLevel: 'B1',
      genre: 'short-fiction',
      tone: 'Calm detective',
      participationMode: 'director',
      premise: 'A quiet blue door appears under the stairs.',
      mainCharacters: ['Mira', 'Leo'],
    });

    assert.equal(result.draft.title, 'Door of Echoes');
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
    const useCase = createGenerateSeriesSetupDraft(networkStatus, gateway);

    await assert.rejects(
      () =>
        useCase.execute({
          cefrLevel: 'B1',
          genre: 'short-fiction',
          tone: 'Calm detective',
          participationMode: 'director',
          mainCharacters: [],
        }),
      /only when online/,
    );
  });
});
