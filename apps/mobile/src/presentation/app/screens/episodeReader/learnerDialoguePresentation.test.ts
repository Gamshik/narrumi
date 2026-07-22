import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LearnerDialogueContext } from './learnerDialoguePresentation';
import { isLearnerDialogueSpeaker } from './learnerDialoguePresentation';

// characterContext is the deterministic speaker ownership stored with one series.
const characterContext: LearnerDialogueContext = {
  participationMode: 'character',
  userRole: 'Mira',
  characterProfiles: [
    {
      id: 'character:mira',
      name: 'Mira',
      description: 'A careful analyst.',
    },
    {
      id: 'character:leo',
      name: 'Leo',
      description: 'A patient archivist.',
    },
  ],
};

describe('learner dialogue presentation', (): void => {
  it('marks only the canonical Character-mode speaker as outgoing', (): void => {
    assert.equal(isLearnerDialogueSpeaker(characterContext, 'mira'), true);
    assert.equal(isLearnerDialogueSpeaker(characterContext, 'Leo'), false);
  });

  it('keeps every speaker incoming in Director mode', (): void => {
    assert.equal(
      isLearnerDialogueSpeaker(
        { ...characterContext, participationMode: 'director' },
        'Mira',
      ),
      false,
    );
  });

  it('supports one unambiguous named legacy role without guessing descriptions', (): void => {
    assert.equal(
      isLearnerDialogueSpeaker(
        { ...characterContext, userRole: 'Mira, the new analyst' },
        'Mira',
      ),
      true,
    );
    assert.equal(
      isLearnerDialogueSpeaker(
        { ...characterContext, userRole: 'New analyst' },
        'Mira',
      ),
      false,
    );
  });
});
