import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  buildContinuationParticipationReviewCriteria,
  buildContinuationParticipationRules,
  buildOpeningParticipationReviewCriteria,
  buildOpeningParticipationRules,
} from './participationPolicy.ts';

Deno.test('Character opening rules require second person and preserve learner agency', (): void => {
  // rules are the exact protected requirements sent to Writer and Decision roles.
  const rules: readonly string[] = buildOpeningParticipationRules({
    participationMode: 'character',
    userRole: 'Mira',
  });
  // reviewCriteria are independent semantic checks applied to the complete candidate.
  const reviewCriteria: readonly string[] =
    buildOpeningParticipationReviewCriteria({
      participationMode: 'character',
      userRole: 'Mira',
    });

  assertStringIncludes(rules.join(' '), 'you or your');
  assertStringIncludes(rules.join(' '), 'do not invent');
  assertStringIncludes(reviewCriteria.join(' '), 'participation_mismatch');
  assertStringIncludes(reviewCriteria.join(' '), 'third person');
});

Deno.test('Character continuation rules keep the visible answer out of generated prose', (): void => {
  // rules protect the already-rendered learner response from model duplication.
  const rules: readonly string[] = buildContinuationParticipationRules({
    participationMode: 'character',
    userRole: 'Mira',
  });
  // reviewCriteria ensure a cheap Writer cannot bypass the protected prompt contract.
  const reviewCriteria: readonly string[] =
    buildContinuationParticipationReviewCriteria({
      participationMode: 'character',
      userRole: 'Mira',
    });

  assertStringIncludes(rules.join(' '), 'already visible in the Reader');
  assertStringIncludes(rules.join(' '), 'direct consequence');
  assertStringIncludes(reviewCriteria.join(' '), 'repeats, quotes, paraphrases');
});

Deno.test('Director rules preserve outside-story direction behavior', (): void => {
  // rules confirm the existing director contract remains unchanged by Character mode work.
  const rules: readonly string[] = buildOpeningParticipationRules({
    participationMode: 'director',
  });

  assertEquals(rules[0], 'The learner is outside the story as a story director.');
  assertStringIncludes(rules.join(' '), 'how events should unfold');
});
