import {
  assertEquals,
  assertThrows,
} from 'jsr:@std/assert';

import type {
  GenerateEpisodeRequest,
  SubmitInteractionRequest,
} from './episodeContracts.ts';
import {
  finalizeEpisodePayload,
  finalizeInteractionPayload,
} from './episodeFinalizers.ts';

// generateRequest is bounded context used by episode finalizer regression tests.
const generateRequest: GenerateEpisodeRequest = {
  seriesId: 'series:test',
  orderIndex: 1,
  cefrLevel: 'B1',
  genre: 'short-fiction',
  tone: 'mysterious but friendly',
  premise: 'Mira and Leo find a hidden door in a city library.',
  mainCharacters: ['Mira', 'Leo'],
  userRole: "Mira's friend",
  selectedStoryWords: [
    {
      id: 'word:curious',
      word: 'curious',
      partOfSpeech: 'adjective',
      level: 'B1',
    },
    {
      id: 'word:whisper',
      word: 'whisper',
      partOfSpeech: 'noun',
      level: 'B1',
    },
  ],
  compactSeriesMemory: {
    premise: 'Mira and Leo find a hidden door in a city library.',
    genre: 'short-fiction',
    tone: 'mysterious but friendly',
    mainCharacters: ['Mira', 'Leo'],
    knownFacts: [],
    openQuestions: ['What is behind the door?'],
    importantObjectsOrLocations: ['city library', 'blue door'],
    recurringStoryWordIds: ['word:door'],
  },
  safetyAndCopyrightConstraints: ['Create a safe original story.'],
};

// episodeSentences contain both selected Story Words without relying on fixed length.
const episodeSentences: readonly string[] = [
  'Mira felt curious near the blue door.',
  'Leo heard a whisper inside the library.',
  'They waited together while the hidden room slowly opened.',
];

// submitRequest is bounded context used by interaction finalizer tests.
const submitRequest: SubmitInteractionRequest = {
  episodeId: 'episode:test',
  seriesId: 'series:test',
  cefrLevel: 'B1',
  genre: 'short-fiction',
  tone: 'mysterious but friendly',
  compactSeriesMemory: {
    premise: generateRequest.premise,
    genre: generateRequest.genre,
    tone: generateRequest.tone,
    mainCharacters: generateRequest.mainCharacters,
    knownFacts: [],
    openQuestions: ['What is behind the door?'],
    importantObjectsOrLocations: ['city library', 'blue door'],
    recurringStoryWordIds: ['word:curious'],
  },
  episodeSummary: 'Mira and Leo found a hidden blue door.',
  interactionPrompt: 'What should Mira do?',
  selectedChoiceId: 'open',
  selectedChoiceLabel: 'Open the door carefully',
  userReply: 'Open the door carefully',
  safetyAndCopyrightConstraints: ['Create a safe original story.'],
};

Deno.test('finalizeEpisodePayload synchronizes story text and compact memory', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: episodeSentences,
      storyWordIds: ['word:curious'],
      annotations: [
        {
          wordId: 'word:curious',
          surfaceText: 'curious',
          translation: 'любопытный',
          sentenceIndex: 0,
        },
        {
          wordId: 'word:whisper',
          surfaceText: 'whisper',
          translation: 'шёпот',
          sentenceIndex: 1,
        },
      ],
      interaction: {
        kind: 'choice',
        prompt: 'What should Mira do?',
        choices: [
          { id: 'open', label: 'Open the door carefully' },
          { id: 'wait', label: 'Wait and listen' },
        ],
      },
      cliffhanger: 'The whisper called Mira by name.',
      summaryUpdate: 'Mira and Leo found a whispering blue door.',
      memoryUpdate: {
        knownFacts: ['Mira found the blue door.'],
        openQuestions: ['Who is whispering?'],
        importantObjectsOrLocations: ['blue door'],
        lastEpisodeSummary: 'Outdated model summary.',
        unresolvedCliffhanger: 'Outdated hook.',
        recurringStoryWordIds: [],
      },
    },
  });

  assertEquals(result.sceneText, episodeSentences.join(' '));
  assertEquals(result.storyWordIds, ['word:curious', 'word:whisper']);
  assertEquals(
    result.memoryUpdate.lastEpisodeSummary,
    result.summaryUpdate,
  );
  assertEquals(result.memoryUpdate.unresolvedCliffhanger, result.cliffhanger);
  assertEquals(result.memoryUpdate.recurringStoryWordIds, [
    'word:door',
    'word:curious',
    'word:whisper',
  ]);
});

Deno.test('finalizeEpisodePayload repairs mojibake Russian translations', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: episodeSentences,
      storyWordIds: ['word:curious', 'word:whisper'],
      annotations: [
        {
          wordId: 'word:curious',
          surfaceText: 'curious',
          translation: 'Ð»Ñ\x8EÐ±Ð¾Ð¿Ñ\x8BÑ\x82Ð½Ñ\x8BÐ¹',
          sentenceIndex: 0,
        },
        {
          wordId: 'word:whisper',
          surfaceText: 'whisper',
          translation: 'Ñ\x88ÐµÐ¿Ð¾Ñ\x82',
          sentenceIndex: 1,
        },
      ],
      interaction: {
        kind: 'choice',
        prompt: 'What should Mira do?',
        choices: [
          { id: 'open', label: 'Open the door carefully' },
          { id: 'wait', label: 'Wait and listen' },
        ],
      },
      cliffhanger: 'The whisper called Mira by name.',
      summaryUpdate: 'Mira and Leo found a whispering blue door.',
      memoryUpdate: {
        knownFacts: ['Mira found the blue door.'],
        openQuestions: ['Who is whispering?'],
        importantObjectsOrLocations: ['blue door'],
        lastEpisodeSummary: 'Outdated model summary.',
        unresolvedCliffhanger: 'Outdated hook.',
        recurringStoryWordIds: [],
      },
    },
  });

  assertEquals(result.annotations[0]?.translation, 'любопытный');
  assertEquals(result.annotations[1]?.translation, 'шепот');
});

Deno.test('finalizeEpisodePayload rejects a missing selected Story Word', () => {
  assertThrows(() =>
    finalizeEpisodePayload({
      request: generateRequest,
      payload: {
        sceneText: 'Ignored.',
        sentences: episodeSentences.map((sentence) =>
          sentence.replace('whisper', 'sound')
        ),
        storyWordIds: ['word:curious'],
        annotations: [
          {
            wordId: 'word:curious',
            surfaceText: 'curious',
            translation: 'любопытный',
            sentenceIndex: 0,
          },
        ],
        interaction: {
          kind: 'choice',
          prompt: 'What should Mira do?',
          choices: [
            { id: 'open', label: 'Open the door carefully' },
            { id: 'wait', label: 'Wait and listen' },
          ],
        },
        cliffhanger: 'The hidden room moved.',
        summaryUpdate: 'Mira and Leo found a hidden room.',
        memoryUpdate: {
          knownFacts: [],
          openQuestions: [],
          importantObjectsOrLocations: [],
          lastEpisodeSummary: 'Outdated.',
          unresolvedCliffhanger: 'Outdated.',
          recurringStoryWordIds: [],
        },
      },
    })
  );
});

Deno.test('finalizeInteractionPayload synchronizes continuation and summary', () => {
  const result = finalizeInteractionPayload({
    request: submitRequest,
    payload: {
      feedback: ': Good choice. "Open the door carefully" sounds natural.',
      continuationText: 'This inconsistent text must be replaced.',
      continuationSentences: [
        'Mira turned the handle slowly.',
        'A blue passage appeared behind the door.',
      ],
      summaryUpdate: 'Mira opened the door and found a blue passage.',
      memoryUpdate: {
        currentConflict: 'Mira must decide whether to enter the passage.',
        knownFacts: ['The door hides a blue passage.'],
        openQuestions: ['Where does the passage lead?'],
        importantObjectsOrLocations: ['blue passage'],
        lastEpisodeSummary: 'Outdated model summary.',
        unresolvedCliffhanger: 'A voice called from the passage.',
        recurringStoryWordIds: ['word:whisper'],
      },
    },
  });

  assertEquals(
    result.continuationText,
    result.continuationSentences.join(' '),
  );
  assertEquals(
    result.memoryUpdate.lastEpisodeSummary,
    result.summaryUpdate,
  );
  assertEquals(result.memoryUpdate.recurringStoryWordIds, [
    'word:curious',
    'word:whisper',
  ]);
  assertEquals(
    result.feedback,
    'Good choice. "Open the door carefully" sounds natural.',
  );
});
