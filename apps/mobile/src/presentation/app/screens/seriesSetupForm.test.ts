import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyAiGeneratedFields,
  createEmptySeriesSetupForm,
  createLocalSeriesSetupDraft,
  createSeriesSetupFormFromDraft,
  getSeriesSetupGenerationActionLabel,
  markSetupFieldUserAuthored,
  shouldConfirmSeriesSetupGeneration,
  validateSeriesSetupForm,
} from './seriesSetupForm';

describe('series setup co-creation state', (): void => {
  it('adds actual AI changes without losing earlier field provenance', (): void => {
    const form = {
      ...createEmptySeriesSetupForm(),
      title: 'Night Signal',
      premise: 'A trainee hears a message from a closed runway.',
      characterProfiles: [
        {
          id: 'character:mira',
          name: 'Mira',
          description: 'A careful airport trainee.',
        },
      ],
      setupDraftMeta: { aiGeneratedFields: ['premise'] as const },
    };

    const updatedForm = applyAiGeneratedFields(form, ['title']);

    assert.deepEqual(updatedForm.setupDraftMeta.aiGeneratedFields, [
      'title',
      'premise',
    ]);
  });

  it('turns an edited AI suggestion into learner-owned text', (): void => {
    const generatedForm = applyAiGeneratedFields(
      {
        ...createEmptySeriesSetupForm(),
        title: 'Night Signal',
        premise: 'A trainee hears a message from a closed runway.',
      },
      ['title', 'premise', 'characterProfiles'],
    );
    const editedForm = markSetupFieldUserAuthored(
      { ...generatedForm, premise: 'My exact opening situation.' },
      'premise',
    );

    assert.deepEqual(editedForm.setupDraftMeta.aiGeneratedFields, [
      'title',
      'characterProfiles',
    ]);
  });

  it('uses contextual actions and confirms only a rebuild with visible draft content', (): void => {
    const emptyForm = createEmptySeriesSetupForm();
    const randomForm = {
      ...emptyForm,
      creativeBrief: {
        ...emptyForm.creativeBrief,
        draftStrategy: 'rebuild' as const,
      },
    };
    const guidedForm = {
      ...randomForm,
      creativeBrief: {
        ...randomForm.creativeBrief,
        idea: 'A letter arrives from a future city.',
      },
    };
    const refineForm = {
      ...emptyForm,
      creativeBrief: {
        ...emptyForm.creativeBrief,
        draftStrategy: 'refine' as const,
      },
    };
    const existingDraftForm = { ...randomForm, premise: 'An old premise.' };

    assert.equal(
      getSeriesSetupGenerationActionLabel(emptyForm),
      'Fill empty fields',
    );
    assert.equal(
      getSeriesSetupGenerationActionLabel(randomForm),
      'Create something for me',
    );
    assert.equal(
      getSeriesSetupGenerationActionLabel(refineForm),
      'Refine my draft',
    );
    assert.equal(
      getSeriesSetupGenerationActionLabel(guidedForm),
      'Rebuild from my idea',
    );
    assert.equal(
      getSeriesSetupGenerationActionLabel(existingDraftForm),
      'Rebuild draft',
    );
    assert.equal(shouldConfirmSeriesSetupGeneration(randomForm), false);
    assert.equal(shouldConfirmSeriesSetupGeneration(existingDraftForm), true);
  });

  it('keeps creative anchors optional while requiring a complete saved draft', (): void => {
    const errors = validateSeriesSetupForm(createEmptySeriesSetupForm());

    assert.equal(errors.title, 'Enter a series title.');
    assert.equal(errors.premise, 'Enter a premise or build from your idea.');
    assert.equal(errors.mainCharacters, 'Add a character or build from your idea.');
    assert.equal(errors.creativeBrief, undefined);
  });

  it('round-trips incomplete form values through a local setup draft', (): void => {
    const form = {
      ...createEmptySeriesSetupForm(),
      title: 'A title in progress',
      creativeBrief: {
        ...createEmptySeriesSetupForm().creativeBrief,
        idea: 'Two old friends find a silent train.',
      },
    };
    const draft = createLocalSeriesSetupDraft(
      form,
      'new-series',
      '2026-07-17T10:00:00.000Z',
    );

    assert.deepEqual(createSeriesSetupFormFromDraft(draft), form);
    assert.equal(draft.updatedAt, '2026-07-17T10:00:00.000Z');
  });
});
