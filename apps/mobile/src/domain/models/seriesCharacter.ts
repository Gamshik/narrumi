// SeriesCharacterProfile stores the canonical dialogue label and AI-facing context separately.
// TODO: Promote this embedded setup value to a standalone synced series character entity
// when characters become editable after the first episode or gain independent media/state.
export type SeriesCharacterProfile = {
  // id is stable within one series and can be derived locally before sync.
  readonly id: string;
  // name is the exact speaker label allowed for this character's own dialogue.
  readonly name: string;
  // description gives the AI personality and role context without changing the dialogue label.
  readonly description: string;
};
