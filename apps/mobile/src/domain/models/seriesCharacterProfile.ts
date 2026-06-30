import type { SeriesCharacterProfile } from './seriesCharacter';

// normalizeCharacterProfiles validates editable character rows before persistence.
export function normalizeCharacterProfiles(
  profiles: readonly SeriesCharacterProfile[],
): readonly SeriesCharacterProfile[] {
  const seenNames = new Set<string>();

  return profiles.flatMap((profile, index) => {
    const name = profile.name.trim().replace(/\s+/g, ' ');

    if (!name) {
      return [];
    }

    const key = name.toLocaleLowerCase();

    if (seenNames.has(key)) {
      return [];
    }

    seenNames.add(key);

    return [
      {
        id: profile.id.trim() || createCharacterProfileId(name, index),
        name,
        description: profile.description.trim().replace(/\s+/g, ' '),
      },
    ];
  });
}

// createProfilesFromCharacterNames migrates legacy character strings into pinned names.
export function createProfilesFromCharacterNames(
  names: readonly string[],
): readonly SeriesCharacterProfile[] {
  return normalizeCharacterProfiles(
    names.map((name, index) => ({
      id: createCharacterProfileId(name, index),
      name: extractLikelyCharacterName(name),
      description: name.trim(),
    })),
  );
}

// characterProfileNames returns the canonical names still used by legacy fields.
export function characterProfileNames(
  profiles: readonly SeriesCharacterProfile[],
): readonly string[] {
  return profiles.map((profile) => profile.name);
}

// createCharacterProfileId produces deterministic ids from display names.
export function createCharacterProfileId(name: string, index: number): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `character:${slug || `profile-${index + 1}`}`;
}

// extractLikelyCharacterName keeps legacy "Name the role" strings usable as dialogue labels.
function extractLikelyCharacterName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLocaleLowerCase();
  const splitMarkers = [' who ', ' with ', ' from ', ' at '];
  const markerIndex = splitMarkers
    .map((marker) => lower.indexOf(marker))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];

  if (markerIndex !== undefined) {
    return trimmed.slice(0, markerIndex).trim();
  }

  const words = trimmed.split(' ');

  if (words.length >= 3 && /^[A-Z]/.test(words[0] ?? '')) {
    return words[0]!;
  }

  return trimmed;
}

