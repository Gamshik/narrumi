import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { BubbleButton } from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { styles } from './HomeLibraryHeader.styles';

// HomeLibraryHeaderProps owns the stable library label and its explicit creation command.
type HomeLibraryHeaderProps = {
  // colors provides the active light or dark Sorbet palette.
  readonly colors: AppColors;
  // onCreateSeries starts a fresh setup instead of resuming an unfinished draft.
  readonly onCreateSeries: () => void;
};

// HomeLibraryHeader keeps creation visually prominent without presenting it as navigation.
export function HomeLibraryHeader({
  colors,
  onCreateSeries,
}: HomeLibraryHeaderProps): ReactElement {
  return (
    <View style={styles.header}>
      <Text
        numberOfLines={1}
        style={[styles.title, { color: colors.labelPrimary }]}
      >
        Your library
      </Text>
      <BubbleButton
        accessibilityHint="Starts a fresh series setup"
        accessibilityLabel="Create a new series"
        colors={colors}
        contentStyle={styles.createActionContent}
        onPress={onCreateSeries}
        style={styles.createAction}
        variant="primary"
      >
        <Text style={styles.createActionIcon}>+</Text>
        <Text style={styles.createActionLabel}>New series</Text>
      </BubbleButton>
    </View>
  );
}
