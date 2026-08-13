import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// screenSource protects the focused episode preparation sequence.
const screenSource: string = readFileSync(
  resolve(__dirname, '../../../DailySessionScreen.tsx'),
  'utf8',
);
// progressSource protects reversible navigation and compact remembered answers.
const progressSource: string = readFileSync(
  resolve(
    __dirname,
    'components/EpisodeSetupProgress/EpisodeSetupProgress.tsx',
  ),
  'utf8',
);
// flowStylesSource protects the stable compact answer strip between setup steps.
const flowStylesSource: string = readFileSync(
  resolve(__dirname, 'EpisodeSetupFlow.styles.ts'),
  'utf8',
);
// footerSource protects fixed, state-aware generation feedback.
const footerSource: string = readFileSync(
  resolve(__dirname, 'EpisodeSetupFooter.tsx'),
  'utf8',
);
// generationSource protects the in-place reduced-motion-aware writing status.
const generationSource: string = readFileSync(
  resolve(
    __dirname,
    'components/EpisodeGenerationStatus/EpisodeGenerationStatus.tsx',
  ),
  'utf8',
);

test('episode preparation renders two focused reversible tasks', (): void => {
  assert.match(screenSource, /activeSetupStep === 'details'/);
  assert.match(screenSource, /<EpisodeSetupDetailsCard/);
  assert.match(screenSource, /<StoryWordsPanel/);
  assert.match(progressSource, /EPISODE SETUP/);
  assert.match(progressSource, /onSelect\('details'\)/);
  assert.match(progressSource, /summaryItems\.length > 0/);
  assert.match(progressSource, /<ScrollView/);
  assert.match(progressSource, /showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(progressSource, /furthestIndex > 0 && summaryItems/);
  assert.match(
    flowStylesSource,
    /progressSurface:\s*\{\s*minHeight:\s*100,/,
  );
  assert.doesNotMatch(screenSource, /label="Tone"/);
});

test('episode generation stays in a fixed state-aware footer', (): void => {
  assert.match(screenSource, /episodeSetupFooterReservedDepth/);
  assert.match(screenSource, /<EpisodeSetupFooter/);
  assert.match(footerSource, /Available when online/);
  assert.match(footerSource, /<EpisodeGenerationStatus/);
  assert.match(generationSource, /Writing your episode\.\.\./);
  assert.match(generationSource, /useEpisodeGenerationPulse/);
});
