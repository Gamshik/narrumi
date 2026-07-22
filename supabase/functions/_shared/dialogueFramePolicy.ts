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
const MIN_REPEATED_DIALOGUE_WORDS: number = 4;

// DialogueFrameDraft is the model contract for one actual spoken reader block.
export type DialogueFrameDraft = {
  // kind distinguishes spoken text from narration in the reader.
  readonly kind: 'dialogue';
  // speaker is the visible character name attached to the spoken text.
  readonly speaker: string;
  // text contains only words spoken aloud by the character.
  readonly text: string;
};

// ReaderFrameDraft is one semantic narration or spoken block before finalization.
export type ReaderFrameDraft =
  | {
    // kind identifies non-spoken story prose.
    readonly kind: 'narration';
    // text preserves the narration wording without frame labels.
    readonly text: string;
  }
  | DialogueFrameDraft;

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

// downgradeUnquotedDialogueFrames keeps speech bubbles tied to explicit source quotation marks.
export function downgradeUnquotedDialogueFrames(
  sourceText: string,
  frames: readonly ReaderFrameDraft[],
): readonly ReaderFrameDraft[] {
  // quotedSpeechBlocks are the only source regions eligible for dialogue presentation.
  const quotedSpeechBlocks: readonly string[] = extractQuotedSpeech(sourceText);

  return frames.map((frame): ReaderFrameDraft => {
    if (
      frame.kind === 'narration' ||
      isTextInsideQuotedSpeech(frame.text, quotedSpeechBlocks)
    ) {
      return frame;
    }

    return { kind: 'narration', text: frame.text };
  });
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

// splitQuotedDialogueFromNarration extracts attributed quoted speech from a mixed narration block.
export function splitQuotedDialogueFromNarration(
  text: string,
  speakerNames: readonly string[],
): readonly ReaderFrameDraft[] {
  const openingMatch: RegExpMatchArray | null = text.match(/["“]/);

  if (!openingMatch || openingMatch.index === undefined) {
    return [{ kind: 'narration', text: stripOuterSpeechQuotes(text) }];
  }

  const openingIndex: number = openingMatch.index;
  const narrationPrefix: string = text.slice(0, openingIndex).trim();
  const speaker: string | undefined = findAttributedSpeaker(
    narrationPrefix,
    speakerNames,
  );

  if (!speaker) {
    return [{ kind: 'narration', text: stripOuterSpeechQuotes(text) }];
  }

  const quotedRemainder: string = text.slice(openingIndex + 1);
  const closingIndex: number = quotedRemainder.search(/["”]/);
  const spokenText: string = stripOuterSpeechQuotes(
    closingIndex >= 0
      ? quotedRemainder.slice(0, closingIndex)
      : quotedRemainder,
  );
  const narrationSuffix: string = closingIndex >= 0
    ? quotedRemainder.slice(closingIndex + 1).trim()
    : '';

  if (spokenText.length === 0) {
    return [{ kind: 'narration', text: stripOuterSpeechQuotes(text) }];
  }

  return [
    ...(narrationPrefix.length > 0
      ? [{ kind: 'narration' as const, text: narrationPrefix }]
      : []),
    { kind: 'dialogue', speaker, text: spokenText },
    ...(narrationSuffix.length > 0
      ? [{
        kind: 'narration' as const,
        text: stripOuterSpeechQuotes(narrationSuffix),
      }]
      : []),
  ];
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

// extractQuotedSpeech returns complete and trailing unmatched double-quoted source spans.
function extractQuotedSpeech(sourceText: string): readonly string[] {
  const normalizedSource: string = sourceText.replace(/[“”]/g, '"');
  const quotedSpeechBlocks: string[] = [];
  // quotedSpeechPattern also accepts a missing closing quote so recoverable model punctuation does not hide speech.
  const quotedSpeechPattern: RegExp = /"([^"\n]+)(?:"|$)/g;
  let match: RegExpExecArray | null;

  while ((match = quotedSpeechPattern.exec(normalizedSource)) !== null) {
    const quotedText: string | undefined = match[1];

    if (quotedText?.trim()) {
      quotedSpeechBlocks.push(quotedText);
    }
  }

  return quotedSpeechBlocks;
}

// isTextInsideQuotedSpeech compares punctuation-independent token sequences from source and frame output.
function isTextInsideQuotedSpeech(
  frameText: string,
  quotedSpeechBlocks: readonly string[],
): boolean {
  const frameWords: readonly string[] = normalizeOverlapText(frameText);

  if (frameWords.length === 0) {
    return false;
  }

  return quotedSpeechBlocks.some((quotedSpeech: string): boolean =>
    containsWordSequence(normalizeOverlapText(quotedSpeech), frameWords)
  );
}

// containsWordSequence finds one complete dialogue token sequence inside a quoted source span.
function containsWordSequence(
  sourceWords: readonly string[],
  candidateWords: readonly string[],
): boolean {
  if (
    candidateWords.length === 0 ||
    candidateWords.length > sourceWords.length
  ) {
    return false;
  }

  return sourceWords.some((_, startIndex: number): boolean =>
    candidateWords.every(
      (word: string, wordIndex: number): boolean =>
        sourceWords[startIndex + wordIndex] === word,
    )
  );
}

// findAttributedSpeaker requires both a pinned name and a nearby speech verb before a quote.
function findAttributedSpeaker(
  narrationPrefix: string,
  speakerNames: readonly string[],
): string | undefined {
  return [...speakerNames]
    .sort((left: string, right: string): number => right.length - left.length)
    .find((speakerName: string): boolean => {
      const escapedSpeaker: string = speakerName
        .trim()
        .split(/\s+/)
        .map(escapeRegExp)
        .join('\\s+');
      const speakerThenVerb: RegExp = new RegExp(
        `\\b${escapedSpeaker}\\b[\\s\\S]{0,120}\\b(?:${SPEECH_ATTRIBUTION_VERBS})\\b`,
        'i',
      );
      const verbThenSpeaker: RegExp = new RegExp(
        `\\b(?:${SPEECH_ATTRIBUTION_VERBS})\\b[\\s\\S]{0,80}\\b${escapedSpeaker}\\b`,
        'i',
      );

      return speakerThenVerb.test(narrationPrefix) ||
        verbThenSpeaker.test(narrationPrefix);
    });
}

// stripOuterSpeechQuotes removes only quote markers that wrap one extracted block.
function stripOuterSpeechQuotes(value: string): string {
  return value
    .trim()
    .replace(/^["'“”]+/, '')
    .replace(/["'“”]+$/, '')
    .trim();
}
