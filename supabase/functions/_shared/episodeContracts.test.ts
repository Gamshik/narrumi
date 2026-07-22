import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { generateEpisodeRequestSchema } from './episodeContracts.ts';

Deno.test('episode request preserves Oxford sense examples for Story Words', (): void => {
  const parsed = generateEpisodeRequestSchema.parse({
    generationRequestId: 'generation:test',
    seriesId: 'series:test',
    seriesTitle: 'The Blue Door',
    orderIndex: 1,
    cefrLevel: 'B1',
    genre: 'short-fiction',
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
});
