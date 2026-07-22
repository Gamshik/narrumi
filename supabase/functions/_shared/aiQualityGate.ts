import { z } from 'npm:zod@4.4.3';

import type { AiModelRole } from './aiGateway.ts';

// qualityIssueCodeSchema lists semantic failures that can trigger a targeted rewrite.
const qualityIssueCodeSchema = z.enum([
  'cefr_mismatch',
  'continuity_break',
  'scenario_mismatch',
  'repetition',
  'participation_mismatch',
  'choice_mismatch',
  'choice_similarity',
  'story_word_misuse',
  'language_error',
  'insufficient_development',
  'pacing_error',
  'memory_conflict',
  'safety_or_copyright',
  'setup_constraint_break',
  'other',
]);

// QualityIssueCode identifies one review failure without carrying story content into logs.
export type QualityIssueCode = z.infer<typeof qualityIssueCodeSchema>;

// QualityWorkflow identifies the creative contract that determines relevant issue codes.
export type QualityWorkflow =
  | 'series-setup'
  | 'episode-opening'
  | 'episode-interaction';

// qualityIssueSchema is a compact actionable rejection produced by the reviewer.
const qualityIssueSchema = z.object({
  code: qualityIssueCodeSchema,
  evidence: z.string().trim().min(1).max(320),
  retryInstruction: z.string().trim().min(1).max(280),
});

// qualityReviewSchema is the independent semantic-reviewer contract.
export const qualityReviewSchema = z
  .object({
    accepted: z.boolean(),
    issues: z.array(qualityIssueSchema).max(6),
  })
  .superRefine((review, context) => {
    if (review.accepted !== (review.issues.length === 0)) {
      context.addIssue({
        code: 'custom',
        message: 'accepted must be true exactly when issues is empty.',
        path: ['accepted'],
      });
    }
  });

// QualityReview is the validated semantic verdict for one creative candidate.
export type QualityReview = z.infer<typeof qualityReviewSchema>;

// QualityGatedGenerationInput defines one writer attempt and one bounded recovery path.
export type QualityGatedGenerationInput<TCandidate> = {
  // label identifies the pipeline in server-side errors without including user content.
  readonly label: string;
  // generate creates a candidate with a selected model role and targeted retry hints.
  readonly generate: (
    role: Extract<AiModelRole, 'writer' | 'fallback'>,
    retryHints: readonly string[],
  ) => Promise<TCandidate>;
  // repair performs a targeted edit when a complete writer candidate failed semantic review.
  readonly repair?: (
    candidate: TCandidate,
    issues: QualityReview['issues'],
  ) => Promise<TCandidate>;
  // review independently evaluates a fully assembled creative candidate.
  readonly review: (candidate: TCandidate) => Promise<QualityReview>;
};

// generateQualityAcceptedCandidate applies one writer attempt and one bounded recovery.
export async function generateQualityAcceptedCandidate<TCandidate>({
  label,
  generate,
  repair,
  review,
}: QualityGatedGenerationInput<TCandidate>): Promise<TCandidate> {
  // retryHints carry actionable instructions only when full fallback generation is required.
  let retryHints: readonly string[] = [];
  // rejectedIssues retain reviewer evidence for one targeted repair.
  let rejectedIssues: QualityReview['issues'] = [];
  // lastError preserves the first structural or semantic failure for safe propagation.
  let lastError: Error | undefined;
  // candidate is present only when the writer completed the full structural contract.
  let candidate: TCandidate | undefined;

  try {
    candidate = await generate('writer', retryHints);
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error(String(error));
    retryHints = [
      'The previous candidate could not pass structural or semantic validation. Return a complete candidate that follows every supplied rule.',
    ];
  }

  if (candidate !== undefined) {
    // Reviewer transport failures stop the pipeline instead of spending more on unchanged drafts.
    const verdict = await review(candidate);

    if (verdict.accepted) {
      return candidate;
    }

    rejectedIssues = verdict.issues;
    retryHints = rejectedIssues.map((issue) => issue.retryInstruction);
    lastError = new Error(
      `${label} failed semantic validation: ${
        verdict.issues
          .map((issue) => issue.code)
          .join(', ')
      }`,
    );
    console.warn('AI quality review rejected candidate', {
      issueCodes: verdict.issues.map((issue) => issue.code),
      label,
    });
  }

  // recoveryCandidate is either an edited writer candidate or a complete structural fallback.
  let recoveryCandidate: TCandidate;

  try {
    recoveryCandidate = candidate !== undefined && repair
      ? await repair(candidate, rejectedIssues)
      : await generate('fallback', retryHints);
  } catch (error: unknown) {
    throw error instanceof Error
      ? error
      : lastError ?? new Error(`${label} generation failed.`);
  }

  // Every repaired or fallback candidate is still untrusted and must pass the same reviewer.
  const recoveryVerdict = await review(recoveryCandidate);

  if (recoveryVerdict.accepted) {
    return recoveryCandidate;
  }

  console.warn('AI quality review rejected recovery candidate', {
    issueCodes: recoveryVerdict.issues.map((issue) => issue.code),
    label,
  });

  throw new Error(
    `${label} recovery failed semantic validation: ${
      recoveryVerdict.issues
        .map((issue) => issue.code)
        .join(', ')
    }`,
  );
}
