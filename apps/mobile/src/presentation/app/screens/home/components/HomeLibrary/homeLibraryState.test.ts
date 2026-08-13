import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

import {
  createNewSeriesSetupDraftId,
  createDefaultSeriesCreativeBrief,
  createDefaultSeriesSetupDraftMeta,
  type LocalSeriesSetupDraft,
} from '@domain/index';

import { getSeriesDraftSummary } from './homeLibraryState';

// createDraft builds one valid local snapshot while allowing each progress case to override fields.
function createDraft(
  overrides: Partial<LocalSeriesSetupDraft> = {},
): LocalSeriesSetupDraft {
  return {
    characterProfiles: [],
    creativeBrief: createDefaultSeriesCreativeBrief(),
    draftId: 'new-series',
    participationMode: 'director',
    premise: '',
    setupDraftMeta: createDefaultSeriesSetupDraftMeta(),
    title: '',
    updatedAt: '2026-08-11T09:00:00.000Z',
    userRole: '',
    ...overrides,
  };
}

// The suite protects the unified Home library and the draft card's bounded summary.
describe('Home library draft state', (): void => {
  // An early snapshot still communicates the selected Role card and a safe title fallback.
  test('summarizes an unfinished draft without a title', (): void => {
    assert.deepEqual(getSeriesDraftSummary(createDraft()), {
      completedStepCount: 1,
      modeLabel: 'Producer',
      title: 'Untitled series',
    });
  });

  // A complete saved form reports all four setup cards and keeps learner-facing mode copy.
  test('summarizes a complete character-mode draft', (): void => {
    assert.deepEqual(
      getSeriesDraftSummary(
        createDraft({
          characterProfiles: [
            {
              description: 'A curious pilot',
              id: 'character:mina',
              name: 'Mina',
            },
          ],
          participationMode: 'character',
          premise: 'A floating city loses its map.',
          title: 'Above the Clouds',
          userRole: 'Mina',
        }),
      ),
      {
        completedStepCount: 4,
        modeLabel: 'Character',
        title: 'Above the Clouds',
      },
    );
  });

  // Draft rows keep one tap target and align concise content around one centered marker.
  test('renders each draft as one aligned laconic card', (): void => {
    // cardSource protects the full-card interaction and intentionally small content set.
    const cardSource: string = readFileSync(
      resolve(__dirname, 'SeriesDraftCard/SeriesDraftCard.tsx'),
      'utf8',
    );
    // cardStylesSource protects the centered marker and saved-series row height.
    const cardStylesSource: string = readFileSync(
      resolve(__dirname, 'SeriesDraftCard/SeriesDraftCard.styles.ts'),
      'utf8',
    );

    assert.match(cardSource, /<SwipeableLibraryCard/);
    assert.match(cardSource, /itemKind="draft"/);
    assert.match(cardSource, /onOpen=\{onResume\}/);
    assert.match(cardSource, /onRequestDelete=\{onRequestDelete\}/);
    assert.match(
      cardSource,
      /backgroundColor: colors\.bubbleSurfaceRaised/,
    );
    assert.match(cardSource, /styles\.progressMarker/);
    assert.doesNotMatch(cardSource, /LinearGradient|BubblePill|resumeCue/);
    assert.doesNotMatch(cardSource, /<BubbleButton/);
    assert.match(
      cardStylesSource,
      /cardSurface:[\s\S]*?alignItems: 'center'[\s\S]*?height: 88/,
    );
    assert.match(
      cardStylesSource,
      /progressMarker:[\s\S]*?alignItems: 'center'[\s\S]*?height: 42[\s\S]*?justifyContent: 'center'[\s\S]*?width: 42/,
    );
    assert.match(
      cardStylesSource,
      /progressText:[\s\S]*?includeFontPadding: false[\s\S]*?textAlign: 'center'/,
    );
  });

  // The library keeps drafts visible while presenting creation as an independent command.
  test('renders one stable library with a labeled create action', (): void => {
    // librarySource protects the visible lifecycle sections and their order.
    const librarySource: string = readFileSync(
      resolve(__dirname, 'HomeLibrary.tsx'),
      'utf8',
    );
    // headerSource protects the explicit command label and accessible action name.
    const headerSource: string = readFileSync(
      resolve(__dirname, 'HomeLibraryHeader/HomeLibraryHeader.tsx'),
      'utf8',
    );

    assert.match(librarySource, /<HomeLibraryHeader/);
    assert.match(librarySource, /CONTINUE SETUP/);
    assert.match(librarySource, /YOUR SERIES/);
    assert.match(librarySource, /drafts\.map/);
    assert.match(librarySource, /series\.map/);
    assert.match(headerSource, /accessibilityLabel="Create a new series"/);
    assert.match(headerSource, />New series</);
    assert.doesNotMatch(librarySource, /activeTab|onSelectTab|tablist/);
    assert.doesNotMatch(headerSource, /position: 'absolute'|accessibilityRole="tab"/);
  });

  // The permanent create action and the draft row must open different setup sources.
  test('resumes a draft only from its list row', (): void => {
    // homeSource protects the explicit create-versus-resume routing on Home.
    const homeSource: string = readFileSync(
      resolve(__dirname, '../../../HomeScreen.tsx'),
      'utf8',
    );

    assert.match(
      homeSource,
      /onCreateSeries=\{\(\) => void openSeriesSetup\(\{ mode: 'create' \}\)\}/,
    );
    assert.match(
      homeSource,
      /onResumeDraft=\{\(draftId: string\): void =>[\s\S]*?openSeriesSetup\(\{ draftId, mode: 'resume' \}\)/,
    );
    // headerSource owns the explicit create action while draft rows retain resume behavior.
    const headerSource: string = readFileSync(
      resolve(__dirname, 'HomeLibraryHeader/HomeLibraryHeader.tsx'),
      'utf8',
    );

    assert.match(headerSource, /accessibilityLabel="Create a new series"/);
    assert.doesNotMatch(homeSource, /CreateHero|Create a story/);
    assert.doesNotMatch(homeSource, /Continue your draft|Resume Draft/);
  });

  // Draft deletion must use the same swipe-confirm pattern while targeting one local snapshot.
  test('deletes only the selected draft through confirmation', (): void => {
    // librarySource connects every draft row to its own destructive target.
    const librarySource: string = readFileSync(
      resolve(__dirname, 'HomeLibrary.tsx'),
      'utf8',
    );
    // homeRouteSource passes stable draft identity into a dedicated confirmation route.
    const homeRouteSource: string = readFileSync(
      resolve(__dirname, '../../../../../../../app/(tabs)/index.tsx'),
      'utf8',
    );
    // confirmationSource owns the exact local-only delete call.
    const confirmationSource: string = readFileSync(
      resolve(
        __dirname,
        '../../../../../../../app/delete-draft-confirmation.tsx',
      ),
      'utf8',
    );

    assert.match(librarySource, /onDeleteDraft\(draft, onCancel\)/);
    assert.match(homeRouteSource, /pathname: '\/delete-draft-confirmation'/);
    assert.match(homeRouteSource, /draftId: draft\.draftId/);
    assert.match(
      confirmationSource,
      /deleteSeriesSetupDraft\.execute\(\{ draftId \}\)/,
    );
    assert.match(confirmationSource, /Your other drafts remain available\./);
  });

  // Fresh creation flows must never reuse the same draft key when saved separately.
  test('creates distinct ids for separate draft flows', (): void => {
    const updatedAt: string = '2026-08-11T09:00:00.000Z';

    assert.notEqual(
      createNewSeriesSetupDraftId(updatedAt, 0.1),
      createNewSeriesSetupDraftId(updatedAt, 0.2),
    );
  });
});
