import { assertStringIncludes } from 'jsr:@std/assert';

import { getSetupGenerationTargetPolicy } from './generationTargetPolicy.ts';

Deno.test('title policy accepts concise thematic titles without literal plot summaries', (): void => {
  const policy = getSetupGenerationTargetPolicy('title');

  assertStringIncludes(policy.writerInstruction, 'Generate only the title');
  assertStringIncludes(policy.reviewerCriterion, 'metaphorical');
  assertStringIncludes(policy.reviewerCriterion, 'concrete claim');
  assertStringIncludes(policy.repairInstruction, 'Repair only the title');
});

Deno.test('character policy preserves the one-to-eight server contract', (): void => {
  const policy = getSetupGenerationTargetPolicy('characterProfiles');

  assertStringIncludes(policy.writerInstruction, 'one to eight');
  assertStringIncludes(policy.reviewerCriterion, 'old default cast size');
});
