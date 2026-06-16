import { assertEquals } from 'jsr:@std/assert';

import { isRepeatedRegeneration } from './regeneration.ts';

const baseValues = {
  title: 'Orbit Letters',
  premise: 'Two pen pals trade messages across a divided space colony.',
  userRole: 'Mara, a junior archivist',
  mainCharacters: ['Mara', 'Cole'],
};

Deno.test('flags an unchanged premise regeneration', () => {
  const repeated = isRepeatedRegeneration({
    field: 'premise',
    previous: baseValues,
    next: { ...baseValues, premise: baseValues.premise },
  });

  assertEquals(repeated, true);
});

Deno.test('ignores casing and spacing when detecting a repeat', () => {
  const repeated = isRepeatedRegeneration({
    field: 'title',
    previous: baseValues,
    next: { ...baseValues, title: '  orbit   LETTERS ' },
  });

  assertEquals(repeated, true);
});

Deno.test('allows a genuinely new premise', () => {
  const repeated = isRepeatedRegeneration({
    field: 'premise',
    previous: baseValues,
    next: { ...baseValues, premise: 'A night nurse uncovers a quiet mystery on the ward.' },
  });

  assertEquals(repeated, false);
});

Deno.test('treats a reshuffled character cast as unchanged', () => {
  const repeated = isRepeatedRegeneration({
    field: 'mainCharacters',
    previous: baseValues,
    next: { ...baseValues, mainCharacters: ['cole', 'mara'] },
  });

  assertEquals(repeated, true);
});

Deno.test('accepts a different character cast', () => {
  const repeated = isRepeatedRegeneration({
    field: 'mainCharacters',
    previous: baseValues,
    next: { ...baseValues, mainCharacters: ['Nadia', 'Theo'] },
  });

  assertEquals(repeated, false);
});

Deno.test('never blocks filling a field that had no previous value', () => {
  const repeated = isRepeatedRegeneration({
    field: 'userRole',
    previous: { ...baseValues, userRole: undefined },
    next: { ...baseValues, userRole: 'New analyst' },
  });

  assertEquals(repeated, false);
});

Deno.test('does nothing when no field is being regenerated', () => {
  const repeated = isRepeatedRegeneration({
    field: undefined,
    previous: baseValues,
    next: baseValues,
  });

  assertEquals(repeated, false);
});
