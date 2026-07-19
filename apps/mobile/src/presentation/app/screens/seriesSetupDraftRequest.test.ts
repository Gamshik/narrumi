import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSeriesSetupDraftRequest } from './seriesSetupDraftRequest';
import { createEmptySeriesSetupForm } from './seriesSetupForm';

describe('buildSeriesSetupDraftRequest', (): void => {
  it('sends an added empty character row as an explicit AI-fill slot', (): void => {
    const request = buildSeriesSetupDraftRequest({
      ...createEmptySeriesSetupForm(),
      title: '',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Warm',
      premise: '',
      participationMode: 'director',
      characterProfiles: [
        { id: 'character:profile-1', name: '', description: '' },
      ],
    });

    assert.deepEqual(request.mainCharacters, []);
    assert.deepEqual(request.characterProfiles, []);
    assert.equal(request.emptyCharacterSlotCount, 1);
    assert.equal(request.creativeBrief.draftStrategy, 'fill-missing');
  });

  it('keeps normalized completed characters while dropping blank rows', (): void => {
    const request = buildSeriesSetupDraftRequest({
      ...createEmptySeriesSetupForm(),
      title: '  Orbit Letters  ',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Warm',
      premise: 'A signal arrives.',
      participationMode: 'director',
      characterProfiles: [
        {
          id: 'character:mira',
          name: '  Mira  ',
          description: '  A careful engineer.  ',
        },
        { id: 'character:profile-2', name: '', description: '' },
      ],
    });

    assert.deepEqual(request.mainCharacters, ['Mira']);
    assert.deepEqual(request.characterProfiles, [
      {
        id: 'character:mira',
        name: 'Mira',
        description: 'A careful engineer.',
      },
    ]);
    assert.equal(request.emptyCharacterSlotCount, 1);
    assert.equal(request.title, '  Orbit Letters  ');
    assert.equal(request.premise, 'A signal arrives.');
  });
});
