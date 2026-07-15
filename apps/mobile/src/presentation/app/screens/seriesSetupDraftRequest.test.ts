import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSeriesSetupDraftRequest } from './seriesSetupDraftRequest';

describe('buildSeriesSetupDraftRequest', (): void => {
  it('omits an added but empty character slot so AI generation can fill it', (): void => {
    const request = buildSeriesSetupDraftRequest({
      title: '',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Warm',
      premise: '',
      participationMode: 'director',
      characterProfiles: [
        { id: 'character:profile-1', name: '', description: '' },
      ],
      userRole: '',
    });

    assert.deepEqual(request.mainCharacters, []);
    assert.deepEqual(request.characterProfiles, []);
  });

  it('keeps normalized completed characters while dropping blank rows', (): void => {
    const request = buildSeriesSetupDraftRequest({
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
      userRole: '',
    });

    assert.deepEqual(request.mainCharacters, ['Mira']);
    assert.deepEqual(request.characterProfiles, [
      {
        id: 'character:mira',
        name: 'Mira',
        description: 'A careful engineer.',
      },
    ]);
  });
});
