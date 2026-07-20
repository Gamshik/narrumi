import { useMemo, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { BubbleSheet } from '@presentation/app/shared';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import { useAppTheme } from '../../../../theme';
import type { StoryWordSheetDetails } from '../../storyWordSheetDetails';
import {
  createTranslationSheetStyles,
  type TranslationSheetStyles,
} from './TranslationSheet.styles';

// TranslationSheetProps controls the inline translation bottom sheet.
type TranslationSheetProps = {
  // details contains exactly the four fields shown for a prepared Story Word.
  readonly details: StoryWordSheetDetails | undefined;
  // onClose clears the selected Story Word.
  readonly onClose: () => void;
};

// TranslationSheet shows context-aware translation without leaving the reader.
export function TranslationSheet({
  details,
  onClose,
}: TranslationSheetProps): ReactElement | null {
  const { isDark } = useAppTheme();
  // colors keeps the Reader sheet chrome identical to the Dictionary sheet in both themes.
  const colors: AppColors = isDark ? darkColors : lightColors;
  // styles gives the compact card active-theme colors without Reader-wide style coupling.
  const styles: TranslationSheetStyles = useMemo(
    () => createTranslationSheetStyles(colors),
    [colors],
  );

  if (!details) {
    return null;
  }

  return (
    <BubbleSheet
      closeAccessibilityLabel="Close translation details"
      colors={colors}
      onClose={onClose}
      style={styles.overlay}
    >
      <View style={styles.content}>
        <View style={styles.identityRow}>
          <View style={styles.identity}>
            <Text accessibilityLabel={`Word: ${details.word}`} style={styles.word}>
              {details.word}
            </Text>
            <Text
              accessibilityLabel={`Transcription: ${details.transcription}`}
              style={styles.transcription}
            >
              {details.transcription}
            </Text>
          </View>
          <View style={styles.partOfSpeechBadge}>
            <Text
              accessibilityLabel={`Part of speech: ${details.partOfSpeech}`}
              style={styles.partOfSpeechText}
            >
              {details.partOfSpeech}
            </Text>
          </View>
        </View>
        <View style={styles.translationSurface}>
          <Text
            accessibilityLabel={`Translation: ${details.translation}`}
            style={styles.translationText}
          >
            {details.translation}
          </Text>
        </View>
      </View>
    </BubbleSheet>
  );
}
