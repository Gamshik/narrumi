import { assertEquals } from 'jsr:@std/assert';

import { isRepeatedSetupConcept } from './regeneration.ts';

const baseValues = {
  title: 'Orbit Letters',
  premise: 'Two pen pals trade messages across a divided space colony.',
  userRole: 'Mara',
  mainCharacters: ['Mara', 'Cole'],
};

Deno.test('isRepeatedSetupConcept flags same title and characters', () => {
  const repeated = isRepeatedSetupConcept(baseValues, {
    ...baseValues,
    premise: 'Pen pals from a divided colony trade messages across space.',
  });

  assertEquals(repeated, true);
});

Deno.test('isRepeatedSetupConcept flags reshuffled character names', () => {
  const repeated = isRepeatedSetupConcept(baseValues, {
    title: 'Fresh Name',
    premise: 'A different wording around the same colony mystery.',
    mainCharacters: ['cole', 'mara'],
  });

  assertEquals(repeated, true);
});

Deno.test('isRepeatedSetupConcept flags high premise overlap', () => {
  const repeated = isRepeatedSetupConcept(baseValues, {
    title: 'Colony Letters',
    premise: 'Two pen pals trade urgent messages across the divided space colony.',
    mainCharacters: ['Iris', 'Jon'],
  });

  assertEquals(repeated, true);
});

Deno.test('isRepeatedSetupConcept allows different premise and cast', () => {
  const repeated = isRepeatedSetupConcept(baseValues, {
    title: 'Bakery Morning',
    premise: 'A baker finds a coded receipt before the city wakes up.',
    mainCharacters: ['Nadia'],
  });

  assertEquals(repeated, false);
});
