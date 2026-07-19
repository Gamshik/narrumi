import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { TranslationAnnotation } from '@domain/index';

import { BubbleSheet } from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import { useAppTheme } from '../../../../theme';

// TranslationSheetProps controls the inline translation bottom sheet.
type TranslationSheetProps = {
  // annotation is the selected inline hint; undefined keeps the sheet hidden.
  readonly annotation: TranslationAnnotation | undefined;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onClose clears the selected annotation.
  readonly onClose: () => void;
};

// TranslationSheet shows context-aware translation without leaving the reader.
export function TranslationSheet({
  annotation,
  styles,
  onClose,
}: TranslationSheetProps): ReactElement | null {
  const { isDark } = useAppTheme();
  // colors keeps the Reader sheet chrome identical to the Dictionary sheet in both themes.
  const colors: AppColors = isDark ? darkColors : lightColors;

  if (!annotation) {
    return null;
  }

  return (
    <BubbleSheet
      closeAccessibilityLabel="Close translation details"
      colors={colors}
      onClose={onClose}
      title={annotation.surfaceText}
    >
      <View style={styles.readerTranslationContent}>
        <Text style={styles.translationText}>{annotation.translation}</Text>
        {annotation.transcription ? (
          <Text style={styles.phonetics}>{annotation.transcription}</Text>
        ) : null}
        <Text style={styles.secondaryText}>
          Context-aware hint from the validated episode payload.
        </Text>
      </View>
    </BubbleSheet>
  );
}
