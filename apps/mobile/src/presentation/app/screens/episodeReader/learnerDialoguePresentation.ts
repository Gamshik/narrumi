import {
  findCharacterProfileByName,
  type SeriesCharacterProfile,
  type SeriesParticipationMode,
} from '@domain/index';

// LearnerDialogueContext is the persisted identity needed to classify one speaker row.
export type LearnerDialogueContext = {
  // participationMode prevents director stories from gaining an outgoing character side.
  readonly participationMode: SeriesParticipationMode;
  // userRole is the canonical learner-owned character name for new series.
  readonly userRole?: string;
  // characterProfiles contain the pinned speaker labels returned by framing.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
};

// isLearnerDialogueSpeaker resolves outgoing ownership without trusting generated prose.
export function isLearnerDialogueSpeaker(
  context: LearnerDialogueContext | undefined,
  speaker: string,
): boolean {
  if (
    context?.participationMode !== 'character' ||
    !context.userRole?.trim()
  ) {
    return false;
  }

  // canonicalProfile is the normal path for every newly validated Character series.
  const canonicalProfile: SeriesCharacterProfile | undefined =
    findCharacterProfileByName(context.characterProfiles, context.userRole);

  if (canonicalProfile) {
    return sameSpeakerName(canonicalProfile.name, speaker);
  }

  // legacyMatches preserve older role strings such as "Mira, the new analyst" safely.
  const legacyMatches: readonly SeriesCharacterProfile[] =
    context.characterProfiles.filter(
      (profile: SeriesCharacterProfile): boolean =>
        containsCompleteName(context.userRole ?? '', profile.name),
    );

  return legacyMatches.length === 1 &&
    sameSpeakerName(legacyMatches[0]!.name, speaker);
}

// sameSpeakerName compares canonical labels after harmless case and spacing differences.
function sameSpeakerName(left: string, right: string): boolean {
  return normalizeSpeakerName(left) === normalizeSpeakerName(right);
}

// containsCompleteName permits one unambiguous named legacy role without fuzzy matching.
function containsCompleteName(value: string, name: string): boolean {
  // paddedValue provides simple word boundaries after punctuation normalization.
  const paddedValue: string = ` ${normalizeSpeakerName(value)} `;
  // paddedName prevents partial matches such as Ann inside Anna.
  const paddedName: string = ` ${normalizeSpeakerName(name)} `;

  return paddedName.trim().length > 0 && paddedValue.includes(paddedName);
}

// normalizeSpeakerName keeps Unicode letters while turning punctuation into boundaries.
function normalizeSpeakerName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
