import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldRenderSettledEpisodeAnswer } from './episodeInteractionPresentation';

describe('shouldRenderSettledEpisodeAnswer', (): void => {
  it('keeps a reopened reader in generation state after a new choice', (): void => {
    assert.equal(
      shouldRenderSettledEpisodeAnswer({
        hasFeedback: false,
        hasSavedAnswer: true,
        isReadOnly: true,
        isSubmitting: true,
      }),
      false,
    );
  });

  it('keeps an idle saved answer settled in read-only history', (): void => {
    assert.equal(
      shouldRenderSettledEpisodeAnswer({
        hasFeedback: false,
        hasSavedAnswer: true,
        isReadOnly: true,
        isSubmitting: false,
      }),
      true,
    );
  });

  it('always treats generated feedback as settled', (): void => {
    assert.equal(
      shouldRenderSettledEpisodeAnswer({
        hasFeedback: true,
        hasSavedAnswer: true,
        isReadOnly: false,
        isSubmitting: true,
      }),
      true,
    );
  });
});
