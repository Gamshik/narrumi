import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// componentSource captures the outgoing learner branch without requiring a native renderer.
const componentSource: string = readFileSync(
  resolve(__dirname, 'EpisodeSentence.tsx'),
  'utf8',
);
// stylesSource captures the direction and asymmetric outgoing bubble geometry.
const stylesSource: string = readFileSync(
  resolve(__dirname, '../../../../MobileApp.styles.ts'),
  'utf8',
);

test('renders learner-character dialogue as a green outgoing row', (): void => {
  assert.match(componentSource, /isLearnerDialogue && styles\.readerLearnerDialogueRow/);
  assert.match(componentSource, /themeColors\.systemGreen/);
  assert.match(componentSource, /`YOU · \$\{sentenceFrame\.speaker\}`/);
  assert.match(stylesSource, /readerLearnerDialogueRow:\s*\{\s*flexDirection: 'row-reverse'/);
  assert.match(stylesSource, /readerLearnerDialogueBubbleFrame:[\s\S]*borderTopRightRadius: 4/);
});
