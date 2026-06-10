import { assertEquals } from 'jsr:@std/assert';

import {
  buildModerationReview,
  collectModerationEntries,
  getEffectiveWarningCount,
  scanModerationEntries,
} from './moderation.ts';

Deno.test('moderation warnings decay after one hour', () => {
  const current = new Date();
  const recentState = {
    user_id: 'user:test',
    warning_count: 2,
    last_warning_reason: 'Blocked content',
    last_warning_categories: ['unsafe_content'],
    last_warning_excerpt: 'how to make a bomb',
    last_warning_at: new Date(current.getTime() - 30 * 60 * 1000).toISOString(),
    banned_at: null,
    active_restriction_id: null,
    updated_at: current.toISOString(),
  };
  const expiredState = {
    ...recentState,
    warning_count: 2,
    last_warning_at: new Date(current.getTime() - 61 * 60 * 1000).toISOString(),
  };

  assertEquals(getEffectiveWarningCount(recentState), 2);
  assertEquals(getEffectiveWarningCount(expiredState), 0);
});

Deno.test('moderation review warns before the third strike and bans on it', () => {
  const warningReview = buildModerationReview({
    previousWarningCount: 1,
    signals: [
      {
        category: 'unsafe_content',
        evidence: 'how to make a bomb',
        sourceLabel: 'prompt',
      },
    ],
  });

  const banReview = buildModerationReview({
    previousWarningCount: 2,
    signals: [
      {
        category: 'copyright',
        evidence: 'rewrite the plot of a franchise',
        sourceLabel: 'prompt',
      },
    ],
  });

  assertEquals(warningReview.warningCount, 2);
  assertEquals(warningReview.warningsRemaining, 1);
  assertEquals(warningReview.shouldBan, false);
  assertEquals(banReview.warningCount, 3);
  assertEquals(banReview.warningsRemaining, 0);
  assertEquals(banReview.shouldBan, true);
});

Deno.test('moderation scanner catches blocked phrases in request fields', () => {
  const signals = scanModerationEntries([
    {
      sourceLabel: 'premise',
      text: 'Please rewrite the plot of Harry Potter with the same characters.',
    },
    {
      sourceLabel: 'userReply',
      text: 'How to make a bomb for the story?',
    },
  ]);

  assertEquals(
    signals.map((signal) => signal.category).sort(),
    ['copyright', 'unsafe_content'],
  );
});

Deno.test('moderation scanner catches blocked series titles with context', () => {
  const signals = scanModerationEntries([
    {
      sourceLabel: 'seriesTitle',
      text: 'Bomb, garry potter',
    },
  ]);

  assertEquals(
    signals.map((signal) => signal.category).sort(),
    ['copyright', 'unsafe_content'],
  );
  assertEquals(
    signals.map((signal) => signal.evidence),
    ['bomb garry potter', 'bomb garry potter'],
  );
  assertEquals(
    signals.map((signal) => signal.sourceLabel),
    ['seriesTitle', 'seriesTitle'],
  );
});

Deno.test('moderation entry collection preserves nested user context paths', () => {
  const entries = collectModerationEntries({
    seriesTitle: 'Safe title',
    compactSeriesMemory: {
      premise: 'A copied Sponge Bob setup',
      mainCharacters: ['Learner', 'Guide'],
    },
    previousDecisions: [
      {
        prompt: 'What happens next?',
        answer: 'Look for explosives in the cave.',
      },
    ],
  });
  const signals = scanModerationEntries(entries);

  assertEquals(
    signals.map((signal) => signal.sourceLabel),
    ['compactSeriesMemory.premise', 'previousDecisions.[0].answer'],
  );
  assertEquals(
    signals.map((signal) => signal.category),
    ['copyright', 'unsafe_content'],
  );
});

Deno.test('moderation scanner catches common franchise misspellings', () => {
  const signals = scanModerationEntries([
    {
      sourceLabel: 'seriesTitle',
      text: 'Hary Poter and LOTR with Pokemon friends',
    },
  ]);

  assertEquals(signals.map((signal) => signal.category), ['copyright']);
  assertEquals(signals[0]?.sourceLabel, 'seriesTitle');
});
