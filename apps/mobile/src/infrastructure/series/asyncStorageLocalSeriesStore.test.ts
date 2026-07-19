import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseLocalSeriesRecord,
  parseLocalSeriesSetupDraft,
} from './asyncStorageLocalSeriesStore';

// timestamp is a valid deterministic version for the legacy local record.
const timestamp = '2026-07-17T10:00:00.000Z';

describe('AsyncStorageLocalSeriesStore compatibility', () => {
  it('adds safe defaults to an early incomplete setup draft', () => {
    const parsed = parseLocalSeriesSetupDraft({
      draftId: 'new-series',
      title: '',
      genre: 'short-fiction',
      cefrLevel: 'A2',
      tone: '',
      premise: '',
      characterProfiles: [],
      updatedAt: timestamp,
    });

    assert.equal(parsed.participationMode, 'director');
    assert.equal(parsed.userRole, '');
    assert.deepEqual(parsed.creativeBrief, {
      idea: '',
      worldAndSetting: '',
      backstory: '',
      storyDriver: '',
      mustInclude: '',
      avoid: '',
      draftStrategy: 'fill-missing',
    });
    assert.deepEqual(parsed.setupDraftMeta, { aiGeneratedFields: [] });
  });

  it('adds safe creative setup defaults to a legacy local series', () => {
    const parsed = parseLocalSeriesRecord({
      id: 'series:legacy',
      title: 'The Door',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Quiet mystery',
      premise: 'Mira finds a hidden door.',
      participationMode: 'director',
      mainCharacters: ['Mira'],
      characterProfiles: [
        {
          id: 'character:mira',
          name: 'Mira',
          description: 'A curious learner.',
        },
      ],
      memory: {
        id: 'series:legacy',
        seriesId: 'series:legacy',
        premise: 'Mira finds a hidden door.',
        genre: 'short-fiction',
        tone: 'Quiet mystery',
        participationMode: 'director',
        mainCharacters: ['Mira'],
        characterProfiles: [
          {
            id: 'character:mira',
            name: 'Mira',
            description: 'A curious learner.',
          },
        ],
        knownFacts: [],
        openQuestions: [],
        importantObjectsOrLocations: [],
        recurringStoryWordIds: [],
        updatedAt: timestamp,
        sync: { isDirty: false, pendingOperationId: 'memory:legacy' },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: { isDirty: false, pendingOperationId: 'series:legacy' },
    });

    assert.deepEqual(parsed.creativeBrief, {
      idea: '',
      worldAndSetting: '',
      backstory: '',
      storyDriver: '',
      mustInclude: '',
      avoid: '',
      draftStrategy: 'fill-missing',
    });
    assert.deepEqual(parsed.setupDraftMeta, { aiGeneratedFields: [] });
  });

  it('maps every legacy AI freedom value to the safe fill-missing strategy', () => {
    const parsed = parseLocalSeriesSetupDraft({
      draftId: 'new-series',
      title: 'Old draft',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Quiet mystery',
      premise: '',
      participationMode: 'director',
      characterProfiles: [],
      creativeBrief: {
        idea: 'A signal arrives from an empty station.',
        worldAndSetting: '',
        backstory: '',
        storyDriver: '',
        mustInclude: '',
        avoid: '',
        aiFreedom: 'surprise',
      },
      updatedAt: timestamp,
    });

    assert.equal(parsed.creativeBrief.draftStrategy, 'fill-missing');
    assert.equal('aiFreedom' in parsed.creativeBrief, false);
  });
});
