// SPEECH_ATTRIBUTION_VERBS covers common narration that identifies how a character speaks.
const SPEECH_ATTRIBUTION_VERBS: string = [
  '(?:say|says|said)',
  'ask(?:s|ed)?',
  'answer(?:s|ed)?',
  'add(?:s|ed)?',
  'call(?:s|ed)?',
  'continue(?:s|d)?',
  'explain(?:s|ed)?',
  'murmur(?:s|ed)?',
  'mutter(?:s|ed)?',
  'note(?:s|d)?',
  'repl(?:y|ies|ied)',
  'shout(?:s|ed)?',
  'whisper(?:s|ed)?',
].join('|');

// NARRATIVE_ACTIONS covers stage directions that belong in narration rather than spoken text.
const NARRATIVE_ACTIONS: string = [
  'lean(?:s|ed|ing)?',
  'look(?:s|ed|ing)?',
  'mov(?:e|es|ed|ing)',
  'nod(?:s|ded|ding)?',
  'shrug(?:s|ged|ging)?',
  'sit(?:s|ting)?',
  'sat',
  'smil(?:e|es|ed|ing)',
  'stand(?:s|ing)?',
  'stood',
  'turn(?:s|ed|ing)?',
  'walk(?:s|ed|ing)?',
].join('|');

// MIN_REPEATED_DIALOGUE_WORDS avoids removing natural short echoes such as "Thank you".
const MIN_REPEATED_DIALOGUE_WORDS = 4;

// DialogueFrameDraft is the model contract for one actual spoken reader block.
export type DialogueFrameDraft = {
  // kind distinguishes spoken text from narration in the reader.
  readonly kind: 'dialogue';
  // speaker is the visible character name attached to the spoken text.
  readonly speaker: string;
  // text contains only words spoken aloud by the character.
  readonly text: string;
};

// looksLikeNarrationInDialogue detects a speaker attribution or stage direction mislabeled as speech.
export function looksLikeNarrationInDialogue(
  text: string,
  speaker: string,
): boolean {
  const escapedSpeaker: string = speaker
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join('\\s+');

  if (escapedSpeaker.length === 0) {
    return false;
  }

  // speakerPrefix catches forms such as "Vlad says" and "Vlad, leaning against the wall".
  const speakerPrefix: RegExp = new RegExp(
    `^["']?\\s*${escapedSpeaker}(?:\\s+(?:${SPEECH_ATTRIBUTION_VERBS}|${NARRATIVE_ACTIONS})\\b|\\s*,\\s*(?:${NARRATIVE_ACTIONS})\\b)`,
    'i',
  );
  // attributionSuffix catches quoted wording followed by forms such as ", says Vlad".
  const attributionSuffix: RegExp = new RegExp(
    `(?:,|\\s[-—]\\s)\\s*(?:${SPEECH_ATTRIBUTION_VERBS})\\s+${escapedSpeaker}\\b[.!?'"”]*$`,
    'i',
  );

  return speakerPrefix.test(text.trim()) || attributionSuffix.test(text.trim());
}

// isDialogueRepeatedByNarration detects a dialogue block copied from the preceding prose tail.
export function isDialogueRepeatedByNarration(
  narration: string,
  dialogue: string,
): boolean {
  const narrationWords: readonly string[] = normalizeOverlapText(narration);
  const dialogueWords: readonly string[] = normalizeOverlapText(dialogue);

  if (
    dialogueWords.length < MIN_REPEATED_DIALOGUE_WORDS ||
    dialogueWords.length > narrationWords.length
  ) {
    return false;
  }

  const narrationTail: readonly string[] = narrationWords.slice(
    -dialogueWords.length,
  );

  return dialogueWords.every(
    (word: string, index: number): boolean => word === narrationTail[index],
  );
}

// escapeRegExp keeps configured character names from changing the detection expression.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// normalizeOverlapText compares adjacent reader blocks without punctuation or casing noise.
function normalizeOverlapText(value: string): readonly string[] {
  return value
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word: string): boolean => word.length > 0);
}
