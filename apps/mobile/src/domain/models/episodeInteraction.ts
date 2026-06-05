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
  // outcomeHint is optional internal context for story continuation.
  readonly outcomeHint?: string;
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
  // selectedChoiceId stores the learner's chosen option when present.
  readonly selectedChoiceId?: string;
  // userReply stores short learner text when the interaction accepts writing.
  readonly userReply?: string;
  // feedback stores concise correction or explanation after a reply.
  readonly feedback?: string;
  // createdAt records when this interaction was first stored locally.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
};
