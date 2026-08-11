import type { SetupGenerationTarget } from './draftResolution.ts';

// SetupGenerationTargetPolicy gives writer, reviewer, and repair stages one card-local contract.
export interface SetupGenerationTargetPolicy {
  // writerInstruction explains which visible card owns the requested suggestion.
  readonly writerInstruction: string;
  // reviewerCriterion prevents subjective or cross-card diagnoses.
  readonly reviewerCriterion: string;
  // repairInstruction keeps recovery edits inside the requested card.
  readonly repairInstruction: string;
}

// getSetupGenerationTargetPolicy translates a card target into stage-specific instructions.
export function getSetupGenerationTargetPolicy(
  target: SetupGenerationTarget | undefined,
): SetupGenerationTargetPolicy {
  if (target === 'title') {
    return {
      writerInstruction:
        'Generate only the title requested by this card. Treat the fixed premise, cast, and learner role as authoritative story context. Return title and omit fields not listed in fieldsToEvaluate.',
      reviewerCriterion:
        'For a title target, reject scenario_mismatch only when the title makes a concrete claim that contradicts or is unrelated to the fixed premise and cast. Accept concise metaphorical, thematic, or mood-based titles; do not require names, literal plot summary, or a preferred style.',
      repairInstruction:
        'Repair only the title. Return a coherent two-to-five-word title grounded in the fixed premise or cast, without changing any story field.',
    };
  }

  if (target === 'characterProfiles') {
    return {
      writerInstruction:
        'Generate the Characters card: choose one to eight coherent character profiles and, in character mode, a matching userRole. Other missing fields may be completed only when fieldsToEvaluate requires a complete internal draft.',
      reviewerCriterion:
        'For a characterProfiles target, one to eight coherent profiles is valid. Do not infer an old default cast size or reject a valid AI-chosen count.',
      repairInstruction:
        'Repair the generated cast and matching userRole without changing fixed story context or imposing a cast size beyond the supplied server constraint.',
    };
  }

  if (target === 'premise') {
    return {
      writerInstruction:
        'Generate the Idea card premise. Other missing fields may be completed only when fieldsToEvaluate requires a complete internal draft.',
      reviewerCriterion:
        'For a premise target, judge coherence against participation mode and supplied visible context without inventing extra user constraints.',
      repairInstruction:
        'Repair the premise while preserving participation mode and every supplied visible story value.',
    };
  }

  return {
    writerInstruction:
      'Follow fieldsToEvaluate and the selected draft strategy exactly.',
    reviewerCriterion:
      'Judge only the supplied semantic criteria; do not invent setup constraints.',
    repairInstruction:
      'Repair only fields permitted by fieldsToEvaluate and strategyPolicy.',
  };
}
