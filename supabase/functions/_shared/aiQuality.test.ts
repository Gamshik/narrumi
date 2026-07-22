import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  generateQualityAcceptedCandidate,
  type QualityReview,
  qualityReviewSchema,
} from './aiQualityGate.ts';
import { normalizeQualityReview } from './aiQuality.ts';

Deno.test('quality review requires accepted and issues to agree', (): void => {
  const result = qualityReviewSchema.safeParse({
    accepted: true,
    issues: [
      {
        code: 'repetition',
        evidence: 'The second paragraph repeats the first paragraph.',
        retryInstruction: 'Remove the repeated paragraph.',
      },
    ],
  });

  assertEquals(result.success, false);
});

Deno.test('episode review ignores setup-only diagnoses', (): void => {
  const result = normalizeQualityReview('episode-opening', {
    accepted: false,
    issues: [
      {
        code: 'setup_constraint_break',
        evidence: 'The reviewer incorrectly applied setup replacement rules.',
        retryInstruction: 'Preserve the setup field.',
      },
    ],
  });

  assertEquals(result, { accepted: true, issues: [] });
});

Deno.test('episode review preserves relevant concrete diagnoses', (): void => {
  const result = normalizeQualityReview('episode-opening', {
    accepted: false,
    issues: [
      {
        code: 'choice_mismatch',
        evidence: 'Choice A refers to a train that is absent from the scene.',
        retryInstruction: 'Align Choice A with the scene.',
      },
    ],
  });

  assertEquals(result.accepted, false);
  assertEquals(result.issues[0]?.code, 'choice_mismatch');
});

Deno.test('interaction review ignores subjective pacing diagnoses', (): void => {
  const result = normalizeQualityReview('episode-interaction', {
    accepted: false,
    issues: [
      {
        code: 'pacing_error',
        evidence: 'The reviewer would prefer another turn before closure.',
        retryInstruction: 'Continue the episode for one more interaction.',
      },
    ],
  });

  assertEquals(result, { accepted: true, issues: [] });
});

Deno.test('quality gate sends reviewer hints to fallback', async (): Promise<void> => {
  // roles records the model-role sequence selected by the quality gate.
  const roles: string[] = [];
  // hints records the reviewer guidance forwarded to each creative attempt.
  const hints: (readonly string[])[] = [];
  let reviewCount = 0;

  const result = await generateQualityAcceptedCandidate({
    label: 'test-story',
    generate: (role, retryHints): Promise<string> => {
      roles.push(role);
      hints.push(retryHints);
      return Promise.resolve(
        role === 'writer' && roles.length === 1 ? 'bad' : 'good',
      );
    },
    review: (): Promise<QualityReview> => {
      reviewCount += 1;
      return Promise.resolve(
        reviewCount === 1
          ? {
            accepted: false,
            issues: [
              {
                code: 'scenario_mismatch',
                evidence:
                  'The continuation ignores the selected learner action.',
                retryInstruction: 'Follow the selected learner action.',
              },
            ],
          }
          : { accepted: true, issues: [] },
      );
    },
  });

  assertEquals(result, 'good');
  assertEquals(roles, ['writer', 'fallback']);
  assertEquals(hints[1], ['Follow the selected learner action.']);
});

Deno.test('quality gate uses fallback after the writer fails review', async (): Promise<void> => {
  // roles records the model-role sequence selected by the quality gate.
  const roles: string[] = [];

  const result = await generateQualityAcceptedCandidate({
    label: 'test-story',
    generate: (role): Promise<string> => {
      roles.push(role);
      return Promise.resolve(role);
    },
    review: (candidate): Promise<QualityReview> =>
      Promise.resolve(
        candidate === 'fallback' ? { accepted: true, issues: [] } : {
          accepted: false,
          issues: [
            {
              code: 'repetition',
              evidence: 'The continuation restates the previous scene.',
              retryInstruction:
                'Write a new event instead of repeating the scene.',
            },
          ],
        },
      ),
  });

  assertEquals(result, 'fallback');
  assertEquals(roles, ['writer', 'fallback']);
});

Deno.test('quality gate blocks every unresolved semantic issue', async (): Promise<void> => {
  await assertRejects(
    () =>
      generateQualityAcceptedCandidate({
        label: 'test-story',
        generate: (role): Promise<string> => Promise.resolve(role),
        review: (): Promise<QualityReview> =>
          Promise.resolve({
            accepted: false,
            issues: [
              {
                code: 'continuity_break',
                evidence:
                  'The opening does not clearly continue the previous hook.',
                retryInstruction: 'Continue the previous hook directly.',
              },
              {
                code: 'scenario_mismatch',
                evidence: 'The prompt shifts away from the opening conflict.',
                retryInstruction: 'Keep the prompt in the opening conflict.',
              },
              {
                code: 'choice_mismatch',
                evidence: 'One choice refers to an absent object.',
                retryInstruction: 'Use only objects established in the scene.',
              },
              {
                code: 'choice_similarity',
                evidence: 'Both choices perform the same action.',
                retryInstruction: 'Make the choices meaningfully different.',
              },
            ],
          }),
      }),
    Error,
    'continuity_break, scenario_mismatch, choice_mismatch, choice_similarity',
  );
});

Deno.test('quality gate repairs a rejected candidate and reviews it again', async (): Promise<void> => {
  // reviewedCandidates proves that the repair is validated under the same contract.
  const reviewedCandidates: string[] = [];
  // repairedIssues records the concrete reviewer evidence forwarded to the editor.
  let repairedIssues: QualityReview['issues'] = [];

  const result = await generateQualityAcceptedCandidate({
    label: 'test-story',
    generate: (): Promise<string> => Promise.resolve('original'),
    repair: (candidate, issues): Promise<string> => {
      assertEquals(candidate, 'original');
      repairedIssues = issues;
      return Promise.resolve('repaired');
    },
    review: (candidate): Promise<QualityReview> => {
      reviewedCandidates.push(candidate);
      return Promise.resolve(
        candidate === 'repaired' ? { accepted: true, issues: [] } : {
          accepted: false,
          issues: [
            {
              code: 'choice_mismatch',
              evidence: 'The first choice is not possible in the scene.',
              retryInstruction: 'Replace only the impossible choice.',
            },
          ],
        },
      );
    },
  });

  assertEquals(result, 'repaired');
  assertEquals(reviewedCandidates, ['original', 'repaired']);
  assertEquals(repairedIssues[0]?.code, 'choice_mismatch');
});

Deno.test('quality gate uses full fallback only when no complete candidate exists', async (): Promise<void> => {
  // roles records that structural writer failure selects the complete fallback path.
  const roles: string[] = [];
  let repairCalled = false;

  const result = await generateQualityAcceptedCandidate({
    label: 'test-story',
    generate: (role): Promise<string> => {
      roles.push(role);

      return role === 'writer'
        ? Promise.reject(new Error('schema mismatch'))
        : Promise.resolve('fallback');
    },
    repair: (): Promise<string> => {
      repairCalled = true;
      return Promise.resolve('repaired');
    },
    review: (): Promise<QualityReview> =>
      Promise.resolve({ accepted: true, issues: [] }),
  });

  assertEquals(result, 'fallback');
  assertEquals(roles, ['writer', 'fallback']);
  assertEquals(repairCalled, false);
});

Deno.test('quality gate rejects a fallback with a protected issue', async (): Promise<void> => {
  await assertRejects(
    () =>
      generateQualityAcceptedCandidate({
        label: 'test-story',
        generate: (role): Promise<string> => Promise.resolve(role),
        review: (): Promise<QualityReview> =>
          Promise.resolve({
            accepted: false,
            issues: [
              {
                code: 'safety_or_copyright',
                evidence: 'The candidate copies a protected story character.',
                retryInstruction: 'Replace it with an original character.',
              },
            ],
          }),
      }),
    Error,
    'recovery failed semantic validation',
  );
});

Deno.test('quality gate stops when the independent reviewer is unavailable', async (): Promise<void> => {
  // roles proves that reviewer failure does not trigger wasteful writer retries.
  const roles: string[] = [];

  await assertRejects(
    () =>
      generateQualityAcceptedCandidate({
        label: 'test-story',
        generate: (role): Promise<string> => {
          roles.push(role);
          return Promise.resolve('candidate');
        },
        review: (): Promise<QualityReview> =>
          Promise.reject(new Error('reviewer unavailable')),
      }),
    Error,
    'reviewer unavailable',
  );

  assertEquals(roles, ['writer']);
});
