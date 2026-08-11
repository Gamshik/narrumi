import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  createEmptySeriesSetupForm,
  type SeriesSetupFormState,
} from '../../../seriesSetupForm';
import {
  getInitialSeriesSetupStep,
  getSeriesSetupMemoryItems,
  isSeriesSetupStepComplete,
  seriesSetupSteps,
  type SeriesSetupMemoryItem,
} from './seriesSetupFlow';

// completeCharacters provides one canonical cast for navigation and memory tests.
const completeCharacters: SeriesSetupFormState['characterProfiles'] = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A careful airport trainee.',
  },
];

describe('create-series four-card state', (): void => {
  it('keeps only role, idea, characters, and title cards', (): void => {
    assert.deepEqual(seriesSetupSteps, [
      'participation',
      'idea',
      'characters',
      'title',
    ]);
  });

  it('resumes at the earliest unfinished required card', (): void => {
    // emptyForm is a genuinely new setup and must start with the role question.
    const emptyForm: SeriesSetupFormState = createEmptySeriesSetupForm();
    // ideaForm has completed the idea but still needs a cast.
    const ideaForm: SeriesSetupFormState = {
      ...emptyForm,
      premise: 'A silent train arrives every midnight.',
    };
    // castForm has enough story context to continue directly to the title.
    const castForm: SeriesSetupFormState = {
      ...ideaForm,
      characterProfiles: completeCharacters,
    };

    assert.equal(getInitialSeriesSetupStep(emptyForm), 'participation');
    assert.equal(getInitialSeriesSetupStep(ideaForm), 'characters');
    assert.equal(getInitialSeriesSetupStep(castForm), 'title');
  });

  it('requires a canonical learner identity only in Character mode', (): void => {
    // producerForm needs only one normalized character profile.
    const producerForm: SeriesSetupFormState = {
      ...createEmptySeriesSetupForm(),
      premise: 'A signal arrives from an empty runway.',
      characterProfiles: completeCharacters,
    };
    // characterForm initially uses a description instead of the canonical name.
    const characterForm: SeriesSetupFormState = {
      ...producerForm,
      participationMode: 'character',
      userRole: 'Airport trainee',
    };

    assert.equal(
      isSeriesSetupStepComplete(producerForm, 'characters'),
      true,
    );
    assert.equal(
      isSeriesSetupStepComplete(characterForm, 'characters'),
      false,
    );
    assert.equal(
      isSeriesSetupStepComplete(
        { ...characterForm, userRole: 'mira' },
        'characters',
      ),
      true,
    );
  });

  it('allows saving only while every required card remains complete', (): void => {
    // completeForm represents the only state in which the final action may save.
    const completeForm: SeriesSetupFormState = {
      ...createEmptySeriesSetupForm(),
      premise: 'A signal arrives from an empty runway.',
      characterProfiles: completeCharacters,
      title: 'The Empty Runway',
    };

    assert.equal(isSeriesSetupStepComplete(completeForm, 'title'), true);
    assert.equal(
      isSeriesSetupStepComplete({ ...completeForm, premise: '' }, 'title'),
      false,
    );
    assert.equal(
      isSeriesSetupStepComplete(
        { ...completeForm, characterProfiles: [] },
        'title',
      ),
      false,
    );
  });

  it('summarizes previous cards and the live first-card choice', (): void => {
    // form represents a complete Character-mode path before the title card.
    const form: SeriesSetupFormState = {
      ...createEmptySeriesSetupForm(),
      participationMode: 'character',
      premise:
        'A very long idea about two old friends who discover a silent train that should be shortened.',
      characterProfiles: completeCharacters,
      userRole: 'Mira',
    };
    // memoryItems must omit the current title card and any future content.
    const memoryItems: readonly SeriesSetupMemoryItem[] =
      getSeriesSetupMemoryItems(form, 'title');

    assert.deepEqual(
      memoryItems.map((item: SeriesSetupMemoryItem): string => item.label),
      ['Role', 'Idea', 'Cast'],
    );
    assert.equal(memoryItems[0]?.value, 'Character');
    assert.match(memoryItems[1]?.value ?? '', /…$/);
    assert.equal(memoryItems[2]?.value, '1 · You: Mira');
    assert.deepEqual(getSeriesSetupMemoryItems(form, 'participation'), [
      {
        step: 'participation',
        label: 'Role',
        value: 'Character',
      },
    ]);
  });

  it('renders four image-led cards without redundant written hints', (): void => {
    // fieldSource protects the complete learner-facing input contract.
    const fieldSource: string = [
      'steps/IdeaStep/IdeaStep.tsx',
      'steps/CharactersStep/CharactersStep.tsx',
      'steps/TitleStep/TitleStep.tsx',
    ]
      .map((sourcePath: string): string =>
        readFileSync(resolve(__dirname, sourcePath), 'utf8'),
      )
      .join('\n');
    // flowSource protects direct cards without optional gates or horizontal paging.
    const flowSource: string = readFileSync(
      resolve(__dirname, 'CreateSeriesFlow.tsx'),
      'utf8',
    );
    // overviewSource protects the unified progress-and-memory surface.
    const overviewSource: string = readFileSync(
      resolve(
        __dirname,
        'components/SeriesSetupOverview/SeriesSetupOverview.tsx',
      ),
      'utf8',
    );
    // flowStyleSource protects the stable overview height across summarized steps.
    const flowStyleSource: string = readFileSync(
      resolve(__dirname, 'CreateSeriesFlow.styles.ts'),
      'utf8',
    );
    // actionSource owns the one shared Generate by AI label.
    const actionSource: string = readFileSync(
      resolve(
        __dirname,
        'components/GenerateWithAiAction/GenerateWithAiAction.tsx',
      ),
      'utf8',
    );
    // cardSource protects the title-image-controls hierarchy from helper copy returning.
    const cardSource: string = readFileSync(
      resolve(__dirname, 'SeriesSetupStepCard.tsx'),
      'utf8',
    );
    // participationSource protects the image-led role choice from explanatory paragraphs.
    const participationSource: string = readFileSync(
      resolve(
        __dirname,
        'steps/ParticipationStep/ParticipationStep.tsx',
      ),
      'utf8',
    );
    // imageSource protects the exact four bundled asset bindings.
    const imageSource: string = readFileSync(
      resolve(__dirname, 'CreateSeriesFlow.assets.ts'),
      'utf8',
    );
    // imageComponentSource protects instant source-stable switching between decoded images.
    const imageComponentSource: string = readFileSync(
      resolve(
        __dirname,
        'components/SeriesSetupCardImage/SeriesSetupCardImage.tsx',
      ),
      'utf8',
    );
    // imageStyleSource protects one uniform illustration scale across every card.
    const imageStyleSource: string = readFileSync(
      resolve(
        __dirname,
        'components/SeriesSetupCardImage/SeriesSetupCardImage.styles.ts',
      ),
      'utf8',
    );
    // assetPaths verifies every required generated PNG is present in the Expo bundle.
    const assetPaths: readonly string[] = [
      'role.png',
      'idea.png',
      'characters.png',
      'title.png',
    ].map((fileName: string): string =>
      resolve(
        __dirname,
        '../../../../../../../assets/create-series',
        fileName,
      ),
    );
    // characterEditorSource protects the concise optional descriptor on each cast row.
    const characterEditorSource: string = readFileSync(
      resolve(
        __dirname,
        '../../../../shared/CharacterProfilesEditor/CharacterProfilesEditor.tsx',
      ),
      'utf8',
    );

    assert.match(fieldSource, /label="Story idea"/);
    assert.match(fieldSource, /CharacterProfilesEditor/);
    assert.match(characterEditorSource, /Role or personality \(optional\)/);
    assert.match(fieldSource, /label="Your character"/);
    assert.match(fieldSource, /label="Series title"/);
    assert.match(actionSource, /Generate by AI/);
    assert.match(imageSource, /role\.png/);
    assert.match(imageSource, /idea\.png/);
    assert.match(imageSource, /characters\.png/);
    assert.match(imageSource, /title\.png/);
    assert.match(imageSource, /Asset\.loadAsync/);
    assert.match(imageComponentSource, /seriesSetupSteps\.map/);
    assert.match(imageComponentSource, /fadeDuration=\{0\}/);
    assert.match(imageComponentSource, /resizeMethod="resize"/);
    assert.match(imageStyleSource, /transform: \[\{ scale: 1\.24 \}\]/);
    assert.match(overviewSource, /items\.length === 0 && styles\.setupOverviewEmpty/);
    assert.match(flowStyleSource, /setupOverview:[\s\S]*?minHeight: 91/);
    assert.match(flowStyleSource, /setupOverviewEmpty:[\s\S]*?justifyContent: 'center'/);
    assert.equal(
      assetPaths.every((assetPath: string): boolean => existsSync(assetPath)),
      true,
    );
    assert.doesNotMatch(cardSource, /cardHelper|helper/);
    assert.doesNotMatch(participationSource, /description|GOOD TO KNOW/);
    assert.doesNotMatch(
      actionSource,
      /AI changes only this card|Reconnect to generate|Manual editing/,
    );
    assert.doesNotMatch(
      fieldSource,
      /worldAndSetting|backstory|storyDriver|preferredCastSize|mustInclude|avoid/,
    );
    assert.doesNotMatch(flowSource, /OptionalStepGate|pagingEnabled/);
    assert.match(flowSource, /<SeriesSetupOverview/);
    assert.doesNotMatch(
      flowSource,
      /SeriesSetupProgress|SeriesSetupMemory/,
    );
    assert.match(overviewSource, /setupOverviewMemory/);
    assert.doesNotMatch(overviewSource, /STORY SO FAR/);
  });
});
