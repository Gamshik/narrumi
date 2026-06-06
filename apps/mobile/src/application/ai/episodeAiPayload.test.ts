import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseEpisodeAiPayload,
  parseInteractionAiPayload,
} from './episodeAiPayload';

// validMemoryUpdate is the minimal compact memory patch accepted from AI.
const validMemoryUpdate = {
  knownFacts: ['Mira found the blue door.'],
  openQuestions: ['Who left the message?'],
  importantObjectsOrLocations: ['Blue door'],
  lastEpisodeSummary: 'Mira found the blue door and decided what to do next.',
  unresolvedCliffhanger: 'The handle moved before Mira touched it.',
  recurringStoryWordIds: ['word:curious'],
};

describe('episode AI payload validation', () => {
  it('accepts a structured generated episode payload', () => {
    const payload = parseEpisodeAiPayload({
      title: 'The Blue Door',
      sceneText: 'Mira stopped near a blue door. A quiet voice called her name.',
      sentences: [
        'Mira stopped near a blue door.',
        'A quiet voice called her name.',
      ],
      storyWordIds: ['word:curious'],
      annotations: [
        {
          wordId: 'word:curious',
          surfaceText: 'curious',
          translation: 'заинтересованный',
          sentenceIndex: 0,
        },
      ],
      interaction: {
        kind: 'choice',
        prompt: 'What should Mira do?',
        choices: [
          { id: 'open', label: 'Open the door' },
          { id: 'wait', label: 'Wait and listen' },
        ],
      },
      cliffhanger: 'The handle moved before Mira touched it.',
      summaryUpdate: 'Mira found the blue door and decided what to do next.',
      memoryUpdate: validMemoryUpdate,
    });

    assert.equal(payload.interaction.kind, 'choice');
    assert.equal(payload.sentences.length, 2);
  });

  it('rejects an episode payload without playback sentences', () => {
    assert.throws(() =>
      parseEpisodeAiPayload({
        sceneText: 'Broken payload.',
        sentences: [],
        storyWordIds: [],
        annotations: [],
        interaction: {
          kind: 'choice',
          prompt: 'Choose.',
          choices: [],
        },
        cliffhanger: 'Broken.',
        summaryUpdate: 'Broken.',
        memoryUpdate: validMemoryUpdate,
      }),
    );
  });

  it('accepts a same-episode interaction continuation payload', () => {
    const payload = parseInteractionAiPayload({
      feedback: 'Good choice. A more natural phrase is: "I should open it."',
      continuationText:
        'Mira opened the door. She saw a small map on the wall.',
      continuationSentences: [
        'Mira opened the door.',
        'She saw a small map on the wall.',
      ],
      isEpisodeComplete: false,
      nextInteraction: {
        kind: 'choice',
        prompt: 'What should Mira inspect first?',
        choices: [
          { id: 'map', label: 'Study the map' },
          { id: 'room', label: 'Search the room' },
        ],
      },
      summaryUpdate: 'Mira opened the blue door and found a map.',
      memoryUpdate: {
        ...validMemoryUpdate,
        lastEpisodeSummary: 'Mira opened the blue door and found a map.',
      },
    });

    assert.equal(payload.continuationSentences.length, 2);
    assert.equal(payload.isEpisodeComplete, false);
    assert.equal(payload.nextInteraction?.choices.length, 2);
  });

  it('rejects a continuing interaction without the next decision', () => {
    assert.throws(() =>
      parseInteractionAiPayload({
        feedback: 'Good choice.',
        continuationText: 'Mira opened the door.',
        continuationSentences: ['Mira opened the door.'],
        isEpisodeComplete: false,
        summaryUpdate: 'Mira opened the door.',
        memoryUpdate: {
          ...validMemoryUpdate,
          lastEpisodeSummary: 'Mira opened the door.',
        },
      }),
    );
  });
});
