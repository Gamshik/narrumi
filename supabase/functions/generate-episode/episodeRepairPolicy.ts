import {
  hasOnlyChoiceQualityIssues,
  hasOnlyDialogueQualityIssues,
  type QualityReview,
} from '../_shared/aiQuality.ts';

// EpisodeRepairStrategy identifies the narrowest safe edit for a rejected opening.
export type EpisodeRepairStrategy =
  | 'decision'
  | 'dialogue'
  | 'repetition'
  | 'candidate';

// EPISODE_REPETITION_REVIEW_CRITERION distinguishes narrative duplication from required summaries.
export const EPISODE_REPETITION_REVIEW_CRITERION: string =
  'Use repetition only when sceneText materially repeats or lightly paraphrases prior story context instead of advancing it, repeats the same narrative beat internally, or when the interaction prompt copies the scene ending. Do not reject previouslyRecap for summarizing prior context, summaryUpdate for summarizing the new scene, or cliffhanger for naming its final unresolved beat; those overlaps are required by their field contracts.';

// EPISODE_REPETITION_REPAIR_RULES make a repetition edit advance events instead of swapping synonyms.
export const EPISODE_REPETITION_REPAIR_RULES: readonly string[] = [
  'For repetition, do not fix the issue with synonym swaps or another paraphrase of the same beat.',
  'If sceneText repeats prior context, keep continuity facts but begin after that context and introduce a new causal event, consequence, discovery, obstacle, or decision.',
  'previouslyRecap may briefly summarize prior context, while summaryUpdate may summarize the repaired scene; do not treat those required field roles as scene repetition.',
  'Update title, sceneText, cliffhanger, summaryUpdate, prompt, and choices together when necessary to keep the newly advanced event coherent.',
];

// hasEpisodeRepetitionIssue reports whether a reviewer found narrative repetition.
export function hasEpisodeRepetitionIssue(
  issues: QualityReview['issues'],
): boolean {
  return issues.some(
    (issue: QualityReview['issues'][number]): boolean =>
      issue.code === 'repetition',
  );
}

// resolveEpisodeRepairStrategy prevents a repetition-only failure from using a conservative copy edit.
export function resolveEpisodeRepairStrategy(
  issues: QualityReview['issues'],
): EpisodeRepairStrategy {
  if (hasOnlyChoiceQualityIssues(issues)) {
    return 'decision';
  }

  if (hasOnlyDialogueQualityIssues(issues)) {
    return 'dialogue';
  }

  if (
    issues.length > 0 &&
    issues.every(
      (issue: QualityReview['issues'][number]): boolean =>
        issue.code === 'repetition',
    )
  ) {
    return 'repetition';
  }

  return 'candidate';
}
