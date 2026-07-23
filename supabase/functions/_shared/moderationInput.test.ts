import { assertEquals } from 'jsr:@std/assert';

import type { SubmitInteractionRequest } from './episodeContracts.ts';
import {
  collectInteractionModerationEntries,
} from './moderationInput.ts';
import { scanModerationEntries } from './moderation.ts';

// createRequest builds the smallest representative interaction moderation payload.
function createRequest(
  overrides: Partial<SubmitInteractionRequest> = {},
): SubmitInteractionRequest {
  return {
    episodeId: 'episode:1',
    interactionId: 'interaction:1',
    seriesId: 'series:1',
    seriesTitle: 'The Safe Journey',
    cefrLevel: 'B1',
    genre: 'short-fiction',
    participationMode: 'director',
    compactSeriesMemory: {
      premise: 'A detective finds a knife near an old theater.',
      mainCharacters: ['Mira', 'Leon'],
      characterProfiles: [],
      participationMode: 'director',
      knownFacts: ['Leon mentioned Harry Potter during the last episode.'],
      openQuestions: [],
      importantObjectsOrLocations: [],
      recurringStoryWordIds: [],
    },
    episodeSummary: 'Mira found a knife near the theater.',
    interactionPrompt: 'What should Mira do next?',
    interactionCount: 1,
    previousDecisions: [],
    selectedStoryWords: [],
    encounteredStoryWordIds: [],
    safetyAndCopyrightConstraints: ['Keep the story original and safe.'],
    ...overrides,
  };
}

Deno.test('interaction moderation ignores generated story context', (): void => {
  const entries = collectInteractionModerationEntries(createRequest());

  assertEquals(entries, []);
  assertEquals(scanModerationEntries(entries), []);
});

Deno.test('interaction moderation scans only a free-form learner reply', (): void => {
  const entries = collectInteractionModerationEntries(
    createRequest({ userReply: 'How to make a bomb?' }),
  );
  const signals = scanModerationEntries(entries);

  assertEquals(entries, [
    { sourceLabel: 'userReply', text: 'How to make a bomb?' },
  ]);
  assertEquals(signals.map((signal) => signal.category), ['unsafe_content']);
  assertEquals(signals.map((signal) => signal.sourceLabel), ['userReply']);
});

Deno.test('interaction moderation does not treat a generated choice as learner text', (): void => {
  const entries = collectInteractionModerationEntries(
    createRequest({
      selectedChoiceId: 'choice:1',
      selectedChoiceLabel: 'Pick up the knife.',
    }),
  );

  assertEquals(entries, []);
});
