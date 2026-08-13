import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import type { QualityReview } from '../_shared/aiQuality.ts';
import {
  EPISODE_REPETITION_REPAIR_RULES,
  EPISODE_REPETITION_REVIEW_CRITERION,
  hasEpisodeRepetitionIssue,
  resolveEpisodeRepairStrategy,
} from './episodeRepairPolicy.ts';

// createIssue creates one valid reviewer issue for repair-routing tests.
function createIssue(
  code: QualityReview['issues'][number]['code'],
): QualityReview['issues'][number] {
  return {
    code,
    evidence: `Concrete ${code} evidence.`,
    retryInstruction: `Resolve ${code}.`,
  };
}

Deno.test('episode repetition receives a focused repair strategy', (): void => {
  assertEquals(hasEpisodeRepetitionIssue([createIssue('repetition')]), true);
  assertEquals(hasEpisodeRepetitionIssue([createIssue('language_error')]), false);
  assertEquals(
    resolveEpisodeRepairStrategy([createIssue('repetition')]),
    'repetition',
  );
  assertEquals(
    resolveEpisodeRepairStrategy([
      createIssue('repetition'),
      createIssue('continuity_break'),
    ]),
    'candidate',
  );
});

Deno.test('episode repetition review excludes required recap and summary overlap', (): void => {
  assertStringIncludes(
    EPISODE_REPETITION_REVIEW_CRITERION,
    'Do not reject previouslyRecap',
  );
  assertStringIncludes(
    EPISODE_REPETITION_REVIEW_CRITERION,
    'summaryUpdate for summarizing the new scene',
  );
});

Deno.test('episode repetition repair must advance beyond the repeated beat', (): void => {
  const repairContract: string = EPISODE_REPETITION_REPAIR_RULES.join('\n');

  assertStringIncludes(
    repairContract,
    'do not fix the issue with synonym swaps',
  );
  assertStringIncludes(repairContract, 'introduce a new causal event');
  assertStringIncludes(repairContract, 'Update title, sceneText, cliffhanger');
});
