import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Episode } from '@domain/index';

import { findPendingEpisodeContinuation } from './episodeReaderContinuationResume';

// timestamp supplies stable metadata for reader-resume fixtures.
const timestamp: string = '2026-07-16T00:00:00.000Z';

describe('findPendingEpisodeContinuation', (): void => {
  it('restores the newest persisted answer that still lacks feedback', (): void => {
    // pendingEpisode mirrors the local draft saved before the Edge Function resolves.
    const pendingEpisode: Episode = createEpisode({
      selectedChoiceId: 'open',
      userReply: 'Open the door carefully',
    });

    assert.deepEqual(findPendingEpisodeContinuation([pendingEpisode]), {
      episodeId: pendingEpisode.id,
      episodeIndex: 0,
      interactionId: pendingEpisode.interactions[0]?.id,
      choiceId: 'open',
      userReply: 'Open the door carefully',
    });
  });

  it('does not resume an unanswered or completed interaction', (): void => {
    // unansweredEpisode keeps the current choice available for normal learner input.
    const unansweredEpisode: Episode = createEpisode({});
    // completedEpisode already owns feedback and must never call generation again.
    const completedEpisode: Episode = createEpisode({
      feedback: 'Good choice.',
      selectedChoiceId: 'open',
      userReply: 'Open the door carefully',
    });

    assert.equal(
      findPendingEpisodeContinuation([unansweredEpisode, completedEpisode]),
      undefined,
    );
  });
});

// createEpisode builds the smallest valid reader episode for restoration tests.
function createEpisode(
  answer: {
    // feedback marks a continuation that already completed.
    readonly feedback?: string;
    // selectedChoiceId stores the learner's controlled answer.
    readonly selectedChoiceId?: string;
    // userReply stores the visible answer persisted before generation.
    readonly userReply?: string;
  },
): Episode {
  return {
    id: 'episode:resume',
    seriesId: 'series:resume',
    orderIndex: 1,
    title: 'The Hidden Door',
    sceneText: 'Mira found a blue door.',
    sentences: ['Mira found a blue door.'],
    sentenceFrames: [{ kind: 'narration', text: 'Mira found a blue door.' }],
    storyWordIds: [],
    annotations: [],
    interactions: [
      {
        id: 'interaction:resume:1',
        episodeId: 'episode:resume',
        kind: 'choice',
        prompt: 'What should Mira do?',
        choices: [
          { id: 'open', label: 'Open the door carefully' },
          { id: 'wait', label: 'Wait and listen' },
        ],
        sentenceEndIndex: 1,
        ...answer,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    isComplete: answer.feedback !== undefined,
    summaryUpdate: 'Mira found a hidden blue door.',
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId: 'episode:resume:pending',
    },
  };
}
