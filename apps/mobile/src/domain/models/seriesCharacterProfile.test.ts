import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SeriesCharacterProfile } from './seriesCharacter';
import { findCharacterProfileByName } from './seriesCharacterProfile';

// profiles are canonical dialogue identities used by Character mode.
const profiles: readonly SeriesCharacterProfile[] = [
  {
    id: 'character:mira',
    name: 'Mira Stone',
    description: 'A careful analyst.',
  },
];

describe('series character identity', (): void => {
  it('matches a canonical character name across case and spacing', (): void => {
    assert.equal(
      findCharacterProfileByName(profiles, '  mira   stone ')?.id,
      'character:mira',
    );
  });

  it('does not treat a role description as a speaker identity', (): void => {
    assert.equal(findCharacterProfileByName(profiles, 'New analyst'), undefined);
  });
});
