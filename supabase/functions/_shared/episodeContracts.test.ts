import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  generateEpisodeRequestSchema,
  submitInteractionRequestSchema,
} from './episodeContracts.ts';

Deno.test('episode request accepts old tone fields but strips them from new context', (): void => {
  const parsed = generateEpisodeRequestSchema.parse({
    generationRequestId: 'generation:test',
    seriesId: 'series:test',
    seriesTitle: 'The Blue Door',
    orderIndex: 1,
    cefrLevel: 'B1',
    genre: 'science-fiction',
    tone: 'mysterious but friendly',
    premise: 'Mira wants to understand who left the blue door open.',
    participationMode: 'director',
    mainCharacters: ['Mira'],
    characterProfiles: [],
    selectedStoryWords: [
      {
        id: 'word:access:verb',
        word: 'access',
        partOfSpeech: 'verb',
        level: 'B1',
        usageExamples: [
          'Most people use their phones to access the internet.',
        ],
      },
    ],
    compactSeriesMemory: {
      premise: 'Mira wants to understand who left the blue door open.',
      genre: 'short-fiction',
      tone: 'mysterious but friendly',
      participationMode: 'director',
      mainCharacters: ['Mira'],
      characterProfiles: [],
      knownFacts: [],
      openQuestions: [],
      importantObjectsOrLocations: [],
      recurringStoryWordIds: [],
    },
    safetyAndCopyrightConstraints: ['Create a safe original story.'],
  });

  assertEquals(parsed.selectedStoryWords[0], {
    id: 'word:access:verb',
    word: 'access',
    partOfSpeech: 'verb',
    level: 'B1',
    usageExamples: [
      'Most people use their phones to access the internet.',
    ],
  });
  assertEquals('tone' in parsed, false);
  assertEquals('tone' in parsed.compactSeriesMemory, false);
  assertEquals('genre' in parsed.compactSeriesMemory, false);
});

// createInteractionRequest builds one valid Producer-mode controlled choice.
function createInteractionRequest(): Record<string, unknown> {
  return {
    submissionId: 'submission:test',
    episodeId: 'episode:test',
    interactionId: 'interaction:test',
    seriesId: 'series:test',
    seriesTitle: 'The Blue Door',
    cefrLevel: 'B1',
    genre: 'short-fiction',
    participationMode: 'director',
    compactSeriesMemory: {
      premise: 'Mira finds a hidden door.',
      participationMode: 'director',
      mainCharacters: ['Mira'],
      characterProfiles: [],
      knownFacts: [],
      openQuestions: [],
      importantObjectsOrLocations: [],
      recurringStoryWordIds: [],
    },
    episodeSummary: 'Mira found a hidden door.',
    interactionPrompt: 'What happens next?',
    interactionCount: 1,
    previousDecisions: [],
    selectedStoryWords: [],
    encounteredStoryWordIds: [],
    selectedChoiceId: 'open',
    selectedChoiceLabel: 'Mira opens the door.',
    safetyAndCopyrightConstraints: ['Create a safe original story.'],
  };
}

Deno.test('interaction request accepts one explicit Producer direction', (): void => {
  const request = createInteractionRequest();
  delete request.selectedChoiceId;
  delete request.selectedChoiceLabel;
  request.userReply = 'Mira opens the door carefully.';
  request.replyIntent = 'direction';

  const parsed = submitInteractionRequestSchema.parse(request);

  assertEquals(parsed.replyIntent, 'direction');
  assertEquals(parsed.userReply, 'Mira opens the door carefully.');
});

Deno.test('interaction request derives a stable id for legacy controlled choices', (): void => {
  const request = createInteractionRequest();
  delete request.submissionId;

  const parsed = submitInteractionRequestSchema.parse(request);

  assertEquals(
    parsed.submissionId,
    'legacy-submission:episode:test:interaction:test',
  );
});

Deno.test('interaction request rejects ambiguous mixed answer contracts', (): void => {
  const request = createInteractionRequest();
  request.userReply = 'Mira opens the door carefully.';
  request.replyIntent = 'direction';

  assertEquals(submitInteractionRequestSchema.safeParse(request).success, false);
});

Deno.test('interaction request rejects Producer speech intent', (): void => {
  const request = createInteractionRequest();
  delete request.selectedChoiceId;
  delete request.selectedChoiceLabel;
  request.userReply = 'Open the door!';
  request.replyIntent = 'speech';

  assertEquals(submitInteractionRequestSchema.safeParse(request).success, false);
});
