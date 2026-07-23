import type { SubmitInteractionRequest } from './episodeContracts.ts';
import type { ModerationEntry } from './moderation.ts';

// collectInteractionModerationEntries returns only new learner-authored free text.
export function collectInteractionModerationEntries(
  payload: SubmitInteractionRequest,
): readonly ModerationEntry[] {
  // userReply is absent for controlled choices and contains only a fresh free-form answer.
  const userReply: string | undefined = payload.userReply?.trim();

  if (!userReply) {
    return [];
  }

  return [{ sourceLabel: 'userReply', text: userReply }];
}
