// ParticipationMode is the bounded series influence contract shared by creative flows.
export type ParticipationMode = 'director' | 'character';

// ParticipationContext carries only the stable identity needed for point-of-view rules.
export type ParticipationContext = {
  // participationMode selects outside direction or inside-character agency.
  readonly participationMode: ParticipationMode;
  // userRole is the canonical learner character name in Character mode.
  readonly userRole?: string;
};

// characterIdentity returns a safe prompt label even for a legacy incomplete request.
function characterIdentity(context: ParticipationContext): string {
  return context.userRole?.trim() || 'the configured learner character';
}

// buildOpeningParticipationRules protects learner point of view before the first decision.
export function buildOpeningParticipationRules(
  context: ParticipationContext,
): readonly string[] {
  if (context.participationMode === 'character') {
    return [
      `The learner is inside the story as the character ${characterIdentity(context)}.`,
      'In sceneText, cliffhanger, prompts, and choices, address the learner character as you or your; never narrate that character in third person or by name.',
      'Other characters may use the learner character name only when directly addressing them in dialogue.',
      'Protect learner agency: do not invent the learner character\'s direct speech, voluntary actions, decisions, plans, thoughts, intentions, or emotions.',
      'The opening may establish circumstances, sensory information, consequences of prior continuity, and other characters\' behavior, then it must stop before the learner\'s next voluntary response.',
      'Interaction prompts and choices must ask what the learner says or does in the role, using second-person wording or concise imperative choice labels.',
      'Set isSpeech false only for a physical action or internal decision; omit it or use true for words the learner would speak aloud.',
      'Do not ask the learner to decide unrelated characters\' actions like an outside author.',
    ];
  }

  return [
    'The learner is outside the story as a story director.',
    'Interaction prompts must ask how events should unfold or what a character should do next.',
    'Choices may direct scene events, character decisions, or story consequences.',
    'Do not address the learner as a physical character inside the story.',
  ];
}

// buildContinuationParticipationRules protects the submitted answer and the next decision.
export function buildContinuationParticipationRules(
  context: ParticipationContext,
): readonly string[] {
  if (context.participationMode === 'character') {
    return [
      `The learner is inside the story as the character ${characterIdentity(context)}.`,
      'Interpret the supplied learner answer as that character\'s speech, action, plan, or question.',
      'The learner answer is already visible in the Reader. Do not quote, repeat, paraphrase, or recreate it inside continuationText or as a dialogue frame.',
      'In continuationText, cliffhanger, prompts, and choices, address the learner character as you or your; never narrate that character in third person or by name.',
      'Other characters may use the learner character name only when directly addressing them in dialogue.',
      'Show the direct consequence of the supplied answer, but do not invent any additional learner speech, voluntary action, decision, plan, thought, intention, or emotion.',
      'After showing consequences and other characters\' behavior, stop before the learner\'s next unchosen response.',
      'Next choices must be in-character actions or speech for the learner role, using second-person wording or concise imperative labels.',
      'Set isSpeech false only for a physical action or internal decision; omit it or use true for words the learner would speak aloud.',
      'Do not ask the learner to decide unrelated characters\' actions like an outside author.',
    ];
  }

  return [
    'The learner is outside the story as a story director.',
    'Interpret the learner answer as direction for how events should unfold.',
    'Next choices may direct scene events, character decisions, or story consequences.',
    'Do not address the learner as a physical character inside the story.',
  ];
}

// buildOpeningParticipationReviewCriteria gives the semantic Reviewer concrete rejection tests.
export function buildOpeningParticipationReviewCriteria(
  context: ParticipationContext,
): readonly string[] {
  if (context.participationMode !== 'character') {
    return [
      'Use participation_mismatch when the candidate places the outside director inside the story as a physical character.',
    ];
  }

  return [
    `The learner character is ${characterIdentity(context)}. Use participation_mismatch if learner-facing scene prose, the cliffhanger, prompt, or choices refer to that character in third person instead of as you or your; direct address by another character is allowed.`,
    'Use participation_mismatch if the candidate invents direct speech, a voluntary action, a decision, a plan, a thought, an intention, or an emotion for the learner character before the learner chooses it.',
    'Use choice_mismatch when isSpeech is false for spoken words or true/omitted for a purely physical action or internal decision.',
  ];
}

// buildContinuationParticipationReviewCriteria checks consequences without stealing agency.
export function buildContinuationParticipationReviewCriteria(
  context: ParticipationContext,
): readonly string[] {
  if (context.participationMode !== 'character') {
    return [
      'Use participation_mismatch when the candidate places the outside director inside the story as a physical character.',
    ];
  }

  return [
    `The learner character is ${characterIdentity(context)}. Use participation_mismatch if learner-facing continuation prose, the cliffhanger, prompt, or choices refer to that character in third person instead of as you or your; direct address by another character is allowed.`,
    'Use participation_mismatch if continuationText repeats, quotes, paraphrases, or recreates the supplied learner answer instead of beginning with its consequence.',
    'Use participation_mismatch if the candidate invents additional learner speech, a voluntary action, a decision, a plan, a thought, an intention, or an emotion beyond the supplied answer.',
    'Use choice_mismatch when isSpeech is false for spoken words or true/omitted for a purely physical action or internal decision.',
  ];
}
