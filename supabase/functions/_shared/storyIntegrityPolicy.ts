import type { QualityReview } from './aiQualityGate.ts';

// SPEECH_ATTRIBUTION_VERBS identifies explicit speaker tags near possible utterances.
const SPEECH_ATTRIBUTION_VERBS: string = [
  '(?:say|says|said)',
  'ask(?:s|ed)?',
  'answer(?:s|ed)?',
  'add(?:s|ed)?',
  'call(?:s|ed)?',
  'explain(?:s|ed)?',
  'repl(?:y|ies|ied)',
  'shout(?:s|ed)?',
  'whisper(?:s|ed)?',
].join('|');

// DIRECT_UTTERANCE_START catches high-confidence first-person, greeting, and imperative speech.
const DIRECT_UTTERANCE_START: RegExp =
  /^(?:[,;:\-]\s*)?(?:hey|hi|hello|please|yes|no|okay|ok|i\b|i'm\b|i've\b|i'll\b|we\b|we're\b|we've\b|we'll\b|let's\b|do\b|don't\b|wait\b|stop\b|listen\b|look\b|tell\b|explain\b|give\b|take\b|open\b|close\b|come\b|go\b|call\b|help\b|remember\b|be careful\b|watch out\b)/i;

// STORY_INTEGRITY_REVIEW_CRITERIA defines semantic failures that structural schemas cannot prove.
export const STORY_INTEGRITY_REVIEW_CRITERIA: readonly string[] = [
  'Use dialogue_format when any literal spoken utterance is not enclosed in ASCII double quotation marks, including free-standing speech before or after a speaker attribution. Reported speech without literal wording remains narration and is valid.',
  'Use character_identity when a canonical character name refers to a different person, role, relationship, or profile than the supplied character and memory context. Canonical names are reserved identities. New characters are allowed only with distinct names.',
  'Use narrative_coherence when a line, utterance, imperative, speaker, or event is disconnected from the surrounding causal scene, reads like an instruction or app artifact, or cannot be explained by the supplied story context. Do not reject an intentional mystery that the scene clearly frames as a mystery.',
];

// StoryIntegrityReviewInput contains only the prose and canonical names needed for deterministic checks.
export type StoryIntegrityReviewInput = {
  // text is the frozen story prose before reader framing.
  readonly text: string;
  // pinnedCharacterNames are reserved identities established by series setup.
  readonly pinnedCharacterNames: readonly string[];
};

// reviewDeterministicStoryIntegrity blocks unmistakable unquoted speech before semantic review.
export function reviewDeterministicStoryIntegrity({
  text,
  pinnedCharacterNames,
}: StoryIntegrityReviewInput): QualityReview {
  if (!hasUnquotedAttributedUtterance(text, pinnedCharacterNames)) {
    return { accepted: true, issues: [] };
  }

  return {
    accepted: false,
    issues: [
      {
        code: 'dialogue_format',
        evidence:
          'The story text contains a pinned-speaker attribution followed by an unquoted literal utterance.',
        retryInstruction:
          'Enclose every literal spoken utterance in ASCII double quotation marks while preserving the speaker, event, and surrounding narration.',
      },
    ],
  };
}

// hasUnquotedAttributedUtterance finds only strong attribution-plus-utterance patterns.
function hasUnquotedAttributedUtterance(
  text: string,
  pinnedCharacterNames: readonly string[],
): boolean {
  // unquotedSegments remove valid quoted spans so their wording cannot trigger the heuristic.
  const unquotedSegments: readonly string[] = maskQuotedSpeech(text)
    .split(/\r?\n+|(?<=[.!?])\s+/)
    .map((segment: string): string => segment.trim())
    .filter((segment: string): boolean => segment.length > 0);

  return pinnedCharacterNames.some((characterName: string): boolean => {
    const attributionPattern: RegExp = createAttributionPattern(characterName);

    return unquotedSegments.some((segment: string, index: number): boolean => {
      const attribution: RegExpExecArray | null = attributionPattern.exec(
        segment,
      );

      if (!attribution || attribution.index === undefined) {
        return false;
      }

      const textAfterAttribution: string = segment
        .slice(attribution.index + attribution[0].length)
        .trim();
      const nextSegment: string = unquotedSegments[index + 1] ?? '';

      return DIRECT_UTTERANCE_START.test(textAfterAttribution) ||
        DIRECT_UTTERANCE_START.test(nextSegment);
    });
  });
}

// maskQuotedSpeech removes complete or recoverable unmatched double-quoted utterances.
function maskQuotedSpeech(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/"[^"\n]*(?:"|$)/g, ' ');
}

// createAttributionPattern binds a speech verb to one exact pinned character name.
function createAttributionPattern(characterName: string): RegExp {
  const escapedName: string = characterName
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join('\\s+');

  return new RegExp(
    `\\b${escapedName}\\b\\s+(?:${SPEECH_ATTRIBUTION_VERBS})\\b`,
    'i',
  );
}

// escapeRegExp keeps user-authored character names from changing the detector expression.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
