import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SeriesSetupDraft } from '@application/ports';
import type { GenerateSeriesSetupDraftInput } from '@application/useCases';
import {
  applyTargetedSeriesSetupDraft,
  buildSeriesSetupDraftRequest,
  buildTargetedSeriesSetupDraftRequest,
} from './seriesSetupDraftRequest';
import {
  createEmptySeriesSetupForm,
  type SeriesSetupFormState,
} from './seriesSetupForm';

describe('buildSeriesSetupDraftRequest', (): void => {
  it('sends an added empty character row as an explicit AI-fill slot', (): void => {
    const request = buildSeriesSetupDraftRequest({
      ...createEmptySeriesSetupForm(),
      title: '',
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

  it('clears only the requested card and removes hidden advanced anchors', (): void => {
    // form contains completed visible cards and legacy hidden values from an older draft.
    const form: SeriesSetupFormState = {
      ...createEmptySeriesSetupForm(),
      title: 'Night Signal',
      premise: 'A trainee hears a message from a closed runway.',
      participationMode: 'character',
      characterProfiles: [
        {
          id: 'character:mira',
          name: 'Mira',
          description: 'A careful airport trainee.',
        },
      ],
      userRole: 'Mira',
      creativeBrief: {
        ...createEmptySeriesSetupForm().creativeBrief,
        worldAndSetting: 'Legacy hidden setting',
        draftStrategy: 'rebuild',
      },
    };
    // titleRequest must preserve the earlier idea and cast while leaving title for AI.
    const titleRequest: GenerateSeriesSetupDraftInput =
      buildTargetedSeriesSetupDraftRequest(form, 'title');
    // characterRequest must preserve idea and title while leaving the cast for AI.
    const characterRequest: GenerateSeriesSetupDraftInput =
      buildTargetedSeriesSetupDraftRequest(form, 'characterProfiles');

    assert.equal(titleRequest.title, undefined);
    assert.equal(titleRequest.generationTarget, 'title');
    assert.equal(titleRequest.premise, form.premise);
    assert.deepEqual(titleRequest.mainCharacters, ['Mira']);
    assert.equal(titleRequest.creativeBrief.worldAndSetting, '');
    assert.equal(titleRequest.creativeBrief.draftStrategy, 'fill-missing');
    assert.equal(characterRequest.title, form.title);
    assert.equal(characterRequest.premise, form.premise);
    assert.deepEqual(characterRequest.mainCharacters, []);
    assert.equal(
      characterRequest.generationTarget,
      'characterProfiles',
    );
    assert.equal(characterRequest.userRole, undefined);
  });

  it('applies only the generated card from a validated complete draft', (): void => {
    // form protects learner-entered values on cards outside the requested target.
    const form: SeriesSetupFormState = {
      ...createEmptySeriesSetupForm(),
      title: 'My title',
      premise: 'My idea',
      characterProfiles: [
        {
          id: 'character:mira',
          name: 'Mira',
          description: 'My character',
        },
      ],
    };
    // draft is a complete trusted application result even though UI applies one field.
    const draft: SeriesSetupDraft = {
      title: 'AI title',
      premise: 'AI idea',
      mainCharacters: ['Nova'],
      characterProfiles: [
        {
          id: 'character:nova',
          name: 'Nova',
          description: 'AI character',
        },
      ],
      changedFields: ['title', 'premise', 'characterProfiles'],
    };
    // generatedForm requests only the title card from the complete response.
    const generatedForm: SeriesSetupFormState = applyTargetedSeriesSetupDraft(
      form,
      'title',
      draft,
    );

    assert.equal(generatedForm.title, 'AI title');
    assert.equal(generatedForm.premise, 'My idea');
    assert.deepEqual(generatedForm.characterProfiles, form.characterProfiles);
    assert.deepEqual(generatedForm.setupDraftMeta.aiGeneratedFields, ['title']);
  });
});
