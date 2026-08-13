import { useMemo, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import {
  BubbleSurface,
  CefrLevelSelector,
  SeriesSetupChoiceGroup,
} from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';
import type { AppColors } from '@presentation/theme';
import {
  learningGenres,
  type CefrLevel,
  type LearningGenre,
} from '@domain/index';

import { episodeGenreLabels } from '../../episodeSetupOptions';
import {
  createEpisodeSetupDetailsCardStyles,
  type EpisodeSetupDetailsCardStyles,
} from './EpisodeSetupDetailsCard.styles';

// EpisodeSetupDetailsCardProps defines the per-episode prose and genre controls.
type EpisodeSetupDetailsCardProps = {
  // colors supplies the current Sorbet surface palette.
  readonly colors: AppColors;
  // isDark selects the appropriate raised choice material.
  readonly isDark: boolean;
  // selectedCefrLevel is the remembered or newly selected prose target.
  readonly selectedCefrLevel: CefrLevel | undefined;
  // selectedGenre is the remembered or newly selected story genre.
  readonly selectedGenre: LearningGenre | undefined;
  // sharedStyles supplies the existing selector geometry contract.
  readonly sharedStyles: AppStyles;
  // onSelectCefrLevel updates prose difficulty without changing Story Words.
  readonly onSelectCefrLevel: (cefrLevel: CefrLevel) => void;
  // onSelectGenre updates only the episode's approved narrative genre.
  readonly onSelectGenre: (genre: LearningGenre) => void;
};

// EpisodeSetupDetailsCard renders the first focused preparation task.
export function EpisodeSetupDetailsCard({
  colors,
  isDark,
  selectedCefrLevel,
  selectedGenre,
  sharedStyles,
  onSelectCefrLevel,
  onSelectGenre,
}: EpisodeSetupDetailsCardProps): ReactElement {
  // styles memoizes the current light or dark card typography.
  const styles: EpisodeSetupDetailsCardStyles = useMemo(
    (): EpisodeSetupDetailsCardStyles =>
      createEpisodeSetupDetailsCardStyles(colors),
    [colors],
  );

  return (
    <BubbleSurface colors={colors} style={styles.card} variant="card">
      <View style={styles.heading}>
        <Text style={styles.title}>Set the scene</Text>
        <Text style={styles.subtitle}>
          Pick the reading level and story genre for this episode.
        </Text>
      </View>
      {selectedCefrLevel ? (
        <CefrLevelSelector
          isDark={isDark}
          selectedLevel={selectedCefrLevel}
          styles={sharedStyles}
          onSelect={onSelectCefrLevel}
        />
      ) : null}
      <SeriesSetupChoiceGroup
        isDark={isDark}
        isWrapped
        label="Genre"
        labels={episodeGenreLabels}
        options={learningGenres}
        selected={selectedGenre}
        styles={sharedStyles}
        onSelect={onSelectGenre}
      />
    </BubbleSurface>
  );
}
