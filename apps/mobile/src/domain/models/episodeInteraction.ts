// interactionKinds is the MVP set of ways a learner can influence an episode.
export const interactionKinds: readonly [
  'choice',
  'short-reply',
  'character-question',
  'theory-or-plan',
] = ['choice', 'short-reply', 'character-question', 'theory-or-plan'] as const;

// EpisodeInteractionKind narrows interaction records to supported MVP intents.
export type EpisodeInteractionKind = (typeof interactionKinds)[number];

// EpisodeInteractionChoice is one controlled option offered inside an episode.
export type EpisodeInteractionChoice = {
  // id is stable for storing the user's selected interaction option.
  readonly id: string;
  // label is the short visible option text.
  readonly label: string;
  // isSpeech distinguishes spoken learner replies from narrative actions.
  readonly isSpeech?: boolean;
  // outcomeHint is optional internal context for story continuation.
  readonly outcomeHint?: string;
};

// freeReplyIntents describe how learner-authored text changes the current story beat.
export const freeReplyIntents: readonly ['speech', 'action', 'direction'] = [
  'speech',
  'action',
  'direction',
] as const;

// FreeReplyIntent distinguishes spoken text, character action, and producer direction.
export type FreeReplyIntent = (typeof freeReplyIntents)[number];

// languageFeedbackStatuses are the accepted outcomes of learner-language evaluation.
export const languageFeedbackStatuses: readonly ['natural', 'corrected'] = [
  'natural',
  'corrected',
] as const;

// LanguageFeedbackStatus reports whether an accepted free reply needed correction.
export type LanguageFeedbackStatus =
  (typeof languageFeedbackStatuses)[number];

// EpisodeLanguageFeedback preserves concise coaching without rewriting learner text.
export type EpisodeLanguageFeedback =
  | {
      // status confirms that the accepted wording already sounds natural.
      readonly status: 'natural';
      // note is one concise CEFR-appropriate confirmation.
      readonly note: string;
    }
  | {
      // status confirms that a useful corrected form accompanies the original answer.
      readonly status: 'corrected';
      // correctedText preserves the suggested form separately from learner-authored text.
      readonly correctedText: string;
      // note explains only the most useful language change.
      readonly note: string;
    };

// replyRevisionReasons are recoverable cases that must not consume a story turn.
export const replyRevisionReasons: readonly [
  'unclear',
  'not-english',
  'off-topic',
] = ['unclear', 'not-english', 'off-topic'] as const;

// ReplyRevisionReason identifies why a free reply needs editing before continuation.
export type ReplyRevisionReason = (typeof replyRevisionReasons)[number];

// EpisodeReplyGuidance stores safe editing help for an unaccepted local draft.
export type EpisodeReplyGuidance = {
  // reason supports stable UI copy and analytics without exposing model internals.
  readonly reason: ReplyRevisionReason;
  // message explains how the learner can make the answer actionable.
  readonly message: string;
  // suggestedText optionally offers a corrected starting point without auto-submitting it.
  readonly suggestedText?: string;
};

// EpisodeInteraction stores the prompt and learner response for one episode point.
export type EpisodeInteraction = {
  // id is created locally and linked from the episode.
  readonly id: string;
  // episodeId links the interaction to its generated learning unit.
  readonly episodeId: string;
  // kind controls whether the user picks, writes, asks, or explains.
  readonly kind: EpisodeInteractionKind;
  // prompt is the story-facing instruction shown to the learner.
  readonly prompt: string;
  // choices contains controlled options when kind is choice.
  readonly choices: readonly EpisodeInteractionChoice[];
  // sentenceEndIndex places this interaction after the corresponding story beat.
  readonly sentenceEndIndex: number;
  // selectedChoiceId stores the learner's chosen option when present.
  readonly selectedChoiceId?: string;
  // userReply stores short learner text when the interaction accepts writing.
  readonly userReply?: string;
  // replyDraft persists unfinished learner text locally before a server request.
  readonly replyDraft?: string;
  // replyIntent tells the story boundary whether free text is speech, action, or direction.
  readonly replyIntent?: FreeReplyIntent;
  // submissionId makes one accepted interaction retry safe across process restarts.
  readonly submissionId?: string;
  // replyGuidance preserves a recoverable validation result without consuming the turn.
  readonly replyGuidance?: EpisodeReplyGuidance;
  // feedback stores concise correction or explanation after a reply.
  readonly feedback?: string;
  // languageFeedback stores structured coaching for accepted learner-authored text.
  readonly languageFeedback?: EpisodeLanguageFeedback;
  // createdAt records when this interaction was first stored locally.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
};
