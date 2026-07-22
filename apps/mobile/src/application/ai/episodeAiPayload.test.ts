import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAiStoryWord,
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
  it('keeps Oxford part of speech and examples for an ambiguous headword', () => {
    const nounEntry = buildAiStoryWord({
      id: 'word:access:noun',
      word: 'access',
      translation: 'доступ',
      partOfSpeech: 'noun',
      level: 'B1',
      examples: [
        '  High-speed   internet access has become a necessity.  ',
        'You need a password to get access to the system.',
        'A third example should stay out of the prompt.',
      ],
      phonetics: {},
    });
    const verbEntry = buildAiStoryWord({
      id: 'word:access:verb',
      word: 'access',
      translation: 'получать доступ',
      partOfSpeech: 'verb',
      level: 'B1',
      examples: ['Most people use their phones to access the internet.'],
      phonetics: {},
    });

    assert.equal(nounEntry.partOfSpeech, 'noun');
    assert.deepEqual(nounEntry.usageExamples, [
      'High-speed internet access has become a necessity.',
      'You need a password to get access to the system.',
    ]);
    assert.equal(verbEntry.partOfSpeech, 'verb');
    assert.deepEqual(verbEntry.usageExamples, [
      'Most people use their phones to access the internet.',
    ]);
  });

  it('accepts a structured generated episode payload', () => {
    const payload = parseEpisodeAiPayload({
      title: 'The Blue Door',
      sceneText: 'Mira stopped near a blue door. A quiet voice called her name.',
      sentences: [
        'Mira stopped near a blue door.',
        'A quiet voice called her name.',
      ],
      sentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira stopped near a blue door.',
        },
        {
          kind: 'narration',
          text: 'A quiet voice called her name.',
        },
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
        sentenceFrames: [],
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

  it('accepts explicit dialogue sentence frames', () => {
    const payload = parseEpisodeAiPayload({
      title: 'The Blue Door',
      sceneText: 'Mira stopped near a blue door. We should listen first.',
      sentences: [
        'Mira stopped near a blue door.',
        'We should listen first.',
      ],
      sentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira stopped near a blue door.',
        },
        {
          kind: 'dialogue',
          speaker: 'Leo',
          text: 'We should listen first.',
        },
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

    assert.equal(payload.sentenceFrames[1]?.kind, 'dialogue');
    assert.equal(
      payload.sentenceFrames[1]?.kind === 'dialogue'
        ? payload.sentenceFrames[1].speaker
        : undefined,
      'Leo',
    );
  });

  it('rejects sentence frames that drift from playback sentences', () => {
    assert.throws(() =>
      parseEpisodeAiPayload({
        sceneText: 'Mira opened the door.',
        sentences: ['Mira opened the door.'],
        sentenceFrames: [
          {
            kind: 'narration',
            text: 'Mira closed the door.',
          },
        ],
        storyWordIds: [],
        annotations: [],
        interaction: {
          kind: 'choice',
          prompt: 'Choose.',
          choices: [
            { id: 'open', label: 'Open it' },
            { id: 'wait', label: 'Wait' },
          ],
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
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira opened the door.',
        },
        {
          kind: 'narration',
          text: 'She saw a small map on the wall.',
        },
      ],
      continuationAnnotations: [],
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
        continuationSentenceFrames: [
          {
            kind: 'narration',
            text: 'Mira opened the door.',
          },
        ],
        continuationAnnotations: [],
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
