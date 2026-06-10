import { assertEquals, assertThrows } from 'jsr:@std/assert';

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
  seriesTitle: 'The Blue Door',
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
  'We should listen first.',
];

// episodeSentenceFrames are explicit reader layout data aligned with episodeSentences.
const episodeSentenceFrames = episodeSentences.map((sentence) => ({
  kind: 'narration' as const,
  text: sentence,
}));

// submitRequest is bounded context used by interaction finalizer tests.
const submitRequest: SubmitInteractionRequest = {
  episodeId: 'episode:test',
  interactionId: 'interaction:test:1',
  seriesId: 'series:test',
  seriesTitle: generateRequest.seriesTitle,
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
  interactionCount: 1,
  previousDecisions: [],
  selectedStoryWords: generateRequest.selectedStoryWords,
  encounteredStoryWordIds: ['word:curious'],
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
      sentenceFrames: episodeSentenceFrames,
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

Deno.test('finalizeEpisodePayload normalizes frame text to canonical sentences', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: episodeSentences,
      sentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira felt curious beside the blue door.',
        },
        {
          kind: 'narration',
          text: 'Leo heard a whisper inside the library.',
        },
        {
          kind: 'dialogue',
          speaker: 'Leo',
          text: 'We should listen first.',
        },
      ],
      storyWordIds: ['word:curious', 'word:whisper'],
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
          translation: 'шепот',
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

  assertEquals(result.sentenceFrames[0]?.text, episodeSentences[0]);
  assertEquals(result.sentenceFrames[2]?.kind, 'dialogue');
  assertEquals(result.sentenceFrames[2]?.text, episodeSentences[2]);
});

Deno.test('finalizeEpisodePayload keeps stripped sentence and frame text aligned', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: [
        'Mira turned the handle slowly.',
        '"We should listen first."',
        '"Then we can open it."',
      ],
      sentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira turned the handle slowly.',
        },
        {
          kind: 'dialogue',
          speaker: 'Leo',
          text: 'We should listen first.',
        },
        {
          kind: 'dialogue',
          speaker: 'Leo',
          text: 'Then we can open it.',
        },
      ],
      storyWordIds: ['word:curious', 'word:whisper'],
      annotations: [],
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

  assertEquals(result.sentences[1], 'We should listen first. Then we can open it.');
  assertEquals(result.sentenceFrames[1]?.text, result.sentences[1]);
  assertEquals(result.sceneText, result.sentences.join(' '));
});

Deno.test('finalizeEpisodePayload merges adjacent dialogue from the same speaker', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: [
        'Mira turned the handle slowly.',
        'I think it is stuck.',
        'Maybe we should wait.',
      ],
      sentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira turned the handle slowly.',
        },
        {
          kind: 'dialogue',
          speaker: 'Mira',
          text: 'I think it is stuck.',
        },
        {
          kind: 'dialogue',
          speaker: 'Mira',
          text: 'Maybe we should wait.',
        },
      ],
      storyWordIds: ['word:curious', 'word:whisper'],
      annotations: [],
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

  assertEquals(result.sentences, [
    'Mira turned the handle slowly.',
    'I think it is stuck. Maybe we should wait.',
  ]);
  assertEquals(result.sentenceFrames[1]?.kind, 'dialogue');
  const dialogueFrame = result.sentenceFrames[1];

  if (dialogueFrame?.kind !== 'dialogue') {
    throw new Error('Expected merged dialogue frame.');
  }

  assertEquals(dialogueFrame.speaker, 'Mira');
  assertEquals(dialogueFrame.text, 'I think it is stuck. Maybe we should wait.');
});

Deno.test('finalizeEpisodePayload repairs mojibake Russian translations', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      title: 'The Blue Door',
      sceneText: 'This inconsistent text must be replaced.',
      sentences: episodeSentences,
      sentenceFrames: episodeSentenceFrames,
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

Deno.test('finalizeEpisodePayload allows planned Story Words to appear later', () => {
  const result = finalizeEpisodePayload({
    request: generateRequest,
    payload: {
      sceneText: 'Ignored.',
      sentences: episodeSentences.map((sentence) =>
        sentence.replace('whisper', 'sound')
      ),
      sentenceFrames: episodeSentences.map((sentence) => ({
        kind: 'narration',
        text: sentence.replace('whisper', 'sound'),
      })),
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
  });

  assertEquals(result.storyWordIds, ['word:curious', 'word:whisper']);
  assertEquals(
    result.annotations.map((annotation) => annotation.wordId),
    ['word:curious'],
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
        '"A blue passage appeared behind the door."',
      ],
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira turned the handle slowly.',
        },
        {
          kind: 'narration',
          text: 'A blue passage appeared behind the door.',
        },
      ],
      continuationAnnotations: [],
      isEpisodeComplete: false,
      nextInteraction: {
        kind: 'choice',
        prompt: 'What should Mira do inside the passage?',
        choices: [
          { id: 'enter', label: 'Enter the passage' },
          { id: 'listen', label: 'Stop and listen' },
        ],
      },
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
  assertEquals(result.isEpisodeComplete, false);
  assertEquals(result.nextInteraction?.choices.length, 2);
});

Deno.test('finalizeInteractionPayload normalizes continuation frame text', () => {
  const result = finalizeInteractionPayload({
    request: submitRequest,
    payload: {
      feedback: 'Good choice. "Open the door carefully" sounds natural.',
      continuationText: 'This inconsistent text must be replaced.',
      continuationSentences: [
        'Mira turned the handle slowly.',
        'I think it is stuck.',
        'Maybe we should wait.',
      ],
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira moved the handle.',
        },
        {
          kind: 'dialogue',
          speaker: 'Mira',
          text: 'I think it is stuck.',
        },
        {
          kind: 'dialogue',
          speaker: 'Mira',
          text: 'Maybe we should wait.',
        },
      ],
      continuationAnnotations: [],
      isEpisodeComplete: false,
      nextInteraction: {
        kind: 'choice',
        prompt: 'What should Mira do inside the passage?',
        choices: [
          { id: 'enter', label: 'Enter the passage' },
          { id: 'listen', label: 'Stop and listen' },
        ],
      },
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
    result.continuationSentenceFrames[0]?.text,
    'Mira turned the handle slowly.',
  );
  assertEquals(result.continuationSentenceFrames[1]?.kind, 'dialogue');
  assertEquals(
    result.continuationSentenceFrames[1]?.text,
    'I think it is stuck. Maybe we should wait.',
  );
  assertEquals(result.continuationSentences.length, 2);
});

Deno.test('finalizeInteractionPayload compacts verbose AI memory arrays', () => {
  const result = finalizeInteractionPayload({
    request: submitRequest,
    payload: {
      feedback: 'Good choice. "Open the door carefully" sounds natural.',
      continuationText: 'Mira opened the door and found a blue passage.',
      continuationSentences: [
        'Mira opened the door and found a blue passage.',
      ],
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira opened the door and found a blue passage.',
        },
      ],
      continuationAnnotations: [],
      isEpisodeComplete: false,
      nextInteraction: {
        kind: 'choice',
        prompt: 'What should Mira do next?',
        choices: [
          { id: 'enter', label: 'Enter the passage' },
          { id: 'wait', label: 'Wait for Leo' },
        ],
      },
      summaryUpdate: 'Mira opened the hidden door and found a blue passage.',
      memoryUpdate: {
        knownFacts: [
          'The door is blue.',
          'The door is blue.',
          'The door is hidden in the library.',
          'Mira opened the door.',
          'A blue passage appeared.',
          'Leo stayed nearby.',
          'The passage is narrow.',
          'The air felt cold.',
          'A symbol is carved on the door.',
          'The library is quiet.',
          'Mira is curious.',
        ],
        openQuestions: [
          'Where does the passage lead?',
          'Who made the symbol?',
          'Why was the door hidden?',
          'Can Leo hear the whisper?',
          'Is the passage safe?',
          'Who owns the key?',
          'Why is the light blue?',
        ],
        importantObjectsOrLocations: [
          'blue door',
          'city library',
          'blue passage',
          'door symbol',
          'bookshelf',
          'hidden room',
          'old map',
        ],
        lastEpisodeSummary:
          'Mira opened the hidden door and found a blue passage.',
        unresolvedCliffhanger:
          'The blue passage waited beyond the hidden door.',
        recurringStoryWordIds: [
          'word:curious',
          'word:whisper',
          'word:map',
          'word:key',
          'word:door',
          'word:library',
          'word:passage',
          'word:symbol',
          'word:hidden',
          'word:blue',
          'word:quiet',
          'word:careful',
          'word:glow',
          'word:page',
          'word:voice',
          'word:friend',
          'word:turn',
          'word:listen',
          'word:open',
          'word:close',
          'word:step',
          'word:path',
          'word:mark',
          'word:cold',
          'word:warm',
          'word:old',
        ],
      },
    },
  });

  assertEquals(result.memoryUpdate.knownFacts.length, 8);
  assertEquals(result.memoryUpdate.openQuestions.length, 6);
  assertEquals(result.memoryUpdate.importantObjectsOrLocations.length, 6);
  assertEquals(result.memoryUpdate.recurringStoryWordIds.length, 24);
});

Deno.test('finalizeInteractionPayload rejects malformed continuation annotations', () => {
  assertThrows(() =>
    finalizeInteractionPayload({
      request: submitRequest,
      payload: {
        feedback: 'Good choice. "Open the door carefully" sounds natural.',
        continuationText: 'Mira heard a whisper behind the blue door.',
        continuationSentences: [
          'Mira heard a whisper behind the blue door.',
        ],
        continuationSentenceFrames: [
          {
            kind: 'narration',
            text: 'Mira heard a whisper behind the blue door.',
          },
        ],
        continuationAnnotations: [
          {
            wordId: 'word:whisper',
            translation: 'шепот',
            sentenceIndex: 0,
          },
          {
            wordId: 'word:whisper',
            surfaceText: 'whisper',
            translation: 'шепот',
            sentenceIndex: 0,
          },
        ],
        isEpisodeComplete: false,
        nextInteraction: {
          kind: 'choice',
          prompt: 'What should Mira do next?',
          choices: [
            { id: 'listen', label: 'Listen carefully' },
            { id: 'knock', label: 'Knock on the door' },
          ],
        },
        summaryUpdate:
          'Mira opened the hidden door and heard a whisper behind it.',
        memoryUpdate: {
          knownFacts: ['Mira heard a whisper behind the door.'],
          openQuestions: ['Who is whispering?'],
          importantObjectsOrLocations: ['blue door'],
          lastEpisodeSummary:
            'Mira opened the hidden door and heard a whisper behind it.',
          unresolvedCliffhanger:
            'The whisper continued from behind the blue door.',
          recurringStoryWordIds: ['word:whisper'],
        },
      },
    })
  );
});

Deno.test('finalizeInteractionPayload rejects missing next interaction prompt', () => {
  assertThrows(() =>
    finalizeInteractionPayload({
      request: submitRequest,
      payload: {
        feedback: 'Good choice. "Open the door carefully" sounds natural.',
        continuationText: 'Mira heard footsteps behind the blue door.',
        continuationSentences: ['Mira heard footsteps behind the blue door.'],
        continuationSentenceFrames: [
          {
            kind: 'narration',
            text: 'Mira heard footsteps behind the blue door.',
          },
        ],
        continuationAnnotations: [],
        isEpisodeComplete: false,
        nextInteraction: {
          kind: 'choice',
          choices: [
            { id: 'listen', label: 'Listen carefully' },
            { id: 'knock', label: 'Knock on the door' },
          ],
        },
        summaryUpdate: 'Mira heard footsteps behind the blue door.',
        memoryUpdate: {
          knownFacts: ['Mira heard footsteps behind the blue door.'],
          openQuestions: ['Who is behind the door?'],
          importantObjectsOrLocations: ['blue door'],
          lastEpisodeSummary: 'Mira heard footsteps behind the blue door.',
          unresolvedCliffhanger: 'Someone was moving behind the blue door.',
          recurringStoryWordIds: [],
        },
      },
    })
  );
});

Deno.test('finalizeInteractionPayload rejects completion before the fifth answer', () => {
  assertThrows(() =>
    finalizeInteractionPayload({
      request: submitRequest,
      payload: {
        feedback: 'Good choice.',
        continuationText: 'Mira entered the passage.',
        continuationSentences: ['Mira entered the passage.'],
        continuationSentenceFrames: [
          {
            kind: 'narration',
            text: 'Mira entered the passage.',
          },
        ],
        continuationAnnotations: [],
        isEpisodeComplete: true,
        cliffhanger: 'A familiar voice called from the next room.',
        summaryUpdate: 'Mira entered the hidden passage.',
        memoryUpdate: {
          knownFacts: ['Mira entered the hidden passage.'],
          openQuestions: ['Who called Mira?'],
          importantObjectsOrLocations: ['hidden passage'],
          lastEpisodeSummary: 'Mira entered the hidden passage.',
          unresolvedCliffhanger:
            'A familiar voice called from the next room.',
          recurringStoryWordIds: [],
        },
      },
    })
  );
});

Deno.test('finalizeInteractionPayload accepts a coherent fifth-turn ending', () => {
  const result = finalizeInteractionPayload({
    request: {
      ...submitRequest,
      interactionId: 'interaction:test:5',
      interactionCount: 5,
      previousDecisions: [
        {
          prompt: 'What should Mira do?',
          answer: 'Open the door carefully',
          feedback: 'Good choice.',
        },
        {
          prompt: 'Where should Mira look?',
          answer: 'Study the map',
          feedback: 'That sounds natural.',
        },
        {
          prompt: 'What should Mira do with the key?',
          answer: 'Keep it safe',
          feedback: 'Good choice.',
        },
        {
          prompt: 'Who should Mira trust?',
          answer: 'Trust Leo',
          feedback: 'That sounds natural.',
        },
      ],
    },
    payload: {
      feedback: 'Good choice. "Follow the marked path" sounds natural.',
      continuationText:
        'Mira followed the marked path and found the missing library key.',
      continuationSentences: [
        'Mira followed the marked path and found the missing library key.',
      ],
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira followed the marked path and found the missing library key.',
        },
      ],
      continuationAnnotations: [],
      isEpisodeComplete: true,
      cliffhanger: 'The key carried the same symbol as another locked door.',
      summaryUpdate:
        'Mira explored the passage and recovered the missing library key.',
      memoryUpdate: {
        knownFacts: ['Mira found the missing library key.'],
        openQuestions: ['What does the second locked door hide?'],
        importantObjectsOrLocations: ['library key', 'hidden passage'],
        lastEpisodeSummary:
          'Mira explored the passage and recovered the missing library key.',
        unresolvedCliffhanger:
          'The key carried the same symbol as another locked door.',
        recurringStoryWordIds: [],
      },
    },
  });

  assertEquals(result.isEpisodeComplete, true);
  assertEquals(
    result.memoryUpdate.unresolvedCliffhanger,
    result.cliffhanger,
  );
});

Deno.test('finalizeInteractionPayload forces completion at the tenth answer', () => {
  const result = finalizeInteractionPayload({
    request: {
      ...submitRequest,
      interactionId: 'interaction:test:10',
      interactionCount: 10,
    },
    payload: {
      feedback: 'Good choice. That answer sounds natural.',
      continuationText:
        'Mira stepped through the final doorway and found the library map.',
      continuationSentences: [
        'Mira stepped through the final doorway and found the library map.',
      ],
      continuationSentenceFrames: [
        {
          kind: 'narration',
          text: 'Mira stepped through the final doorway and found the library map.',
        },
      ],
      continuationAnnotations: [],
      isEpisodeComplete: false,
      nextInteraction: {
        kind: 'choice',
        prompt: 'What should Mira do next?',
        choices: [
          { id: 'read', label: 'Read the map' },
          { id: 'hide', label: 'Hide the map' },
        ],
      },
      summaryUpdate:
        'Mira completed the hidden passage and found the library map.',
      memoryUpdate: {
        knownFacts: ['Mira found the library map.'],
        openQuestions: ['Where does the map point next?'],
        importantObjectsOrLocations: ['library map'],
        lastEpisodeSummary:
          'Mira completed the hidden passage and found the library map.',
        unresolvedCliffhanger:
          'The map pointed to a second door under the reading room.',
        recurringStoryWordIds: [],
      },
    },
  });

  assertEquals(result.isEpisodeComplete, true);
  assertEquals(
    result.cliffhanger,
    'The map pointed to a second door under the reading room.',
  );
});
