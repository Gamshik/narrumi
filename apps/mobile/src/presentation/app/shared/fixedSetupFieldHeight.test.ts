import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// appStylesSource contains the shared final-draft field size contract.
const appStylesSource: string = readFileSync(
  resolve(__dirname, '../MobileApp.styles.ts'),
  'utf8',
);
// characterStylesSource contains the recurring-character note size contract.
const characterStylesSource: string = readFileSync(
  resolve(__dirname, 'CharacterProfilesEditor/CharacterProfilesEditor.styles.ts'),
  'utf8',
);
// briefStylesSource contains the learner-authored creative-anchor size contract.
const briefStylesSource: string = readFileSync(
  resolve(__dirname, 'SeriesCreativeBriefEditor/SeriesCreativeBriefEditor.styles.ts'),
  'utf8',
);
// setupFieldSource protects internal scrolling for final generated fields.
const setupFieldSource: string = readFileSync(
  resolve(__dirname, 'SeriesSetupTextField/SeriesSetupTextField.tsx'),
  'utf8',
);
// briefFieldSource protects internal scrolling for creative-anchor fields.
const briefFieldSource: string = readFileSync(
  resolve(__dirname, 'SeriesCreativeBriefEditor/SeriesCreativeBriefEditor.tsx'),
  'utf8',
);
// characterFieldSource protects internal scrolling for character descriptions.
const characterFieldSource: string = readFileSync(
  resolve(__dirname, 'CharacterProfilesEditor/CharacterProfilesEditor.tsx'),
  'utf8',
);

// This regression test keeps AI text length from changing setup layout geometry.
test('multiline setup fields keep fixed heights and scroll internally', (): void => {
  assert.match(appStylesSource, /formTextArea:\s*{\s*height:\s*96,/);
  assert.match(appStylesSource, /formCompactTextArea:\s*{\s*height:\s*58,/);
  assert.match(characterStylesSource, /descriptionInput:\s*{[\s\S]*?height:\s*58,/);
  assert.match(briefStylesSource, /ideaInput:\s*{\s*height:\s*112,/);
  assert.match(briefStylesSource, /multilineInput:\s*{\s*height:\s*76,/);
  assert.match(setupFieldSource, /scrollEnabled={usesMultilineLayout}/);
  assert.match(briefFieldSource, /scrollEnabled={usesMultilineLayout}/);
  assert.match(characterFieldSource, /placeholderTextColor={colors\.labelTertiary}\s*scrollEnabled/);
});
