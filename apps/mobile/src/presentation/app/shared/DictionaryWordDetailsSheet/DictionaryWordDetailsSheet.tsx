import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { VocabularyItem } from '@domain/index';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import type { AppStyles } from '@presentation/app/types';
import { BubbleSheet } from '../BubbleSheet';

// DictionaryWordDetailsSheetProps defines the native sheet content contract.
type DictionaryWordDetailsSheetProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is undefined when a route id cannot be resolved from the local catalog.
  readonly word: VocabularyItem | undefined | null;
  // isLoading separates the initial data fetch from the missing-word state.
  readonly isLoading?: boolean;
  // onClose dismisses the dictionary details route from the custom modal drawer.
  readonly onClose: () => void;
};

// DictionaryWordDetailsSheet renders read-only dictionary details for one word.
export function DictionaryWordDetailsSheet({
  styles,
  word,
  isLoading,
  onClose,
}: DictionaryWordDetailsSheetProps): ReactElement {
  // colors resolves the active light/dark token set for the shared sheet frame.
  const colors: AppColors = resolveColorsFromStyles(styles);

  if (isLoading) {
    return (
      <BubbleSheet
        closeAccessibilityLabel="Close dictionary details"
        colors={colors}
        onClose={onClose}
        title="Dictionary"
      >
        <View style={styles.dictionarySheetContent}>
          <Text style={styles.stateMessageTitle}>Loading word...</Text>
        </View>
      </BubbleSheet>
    );
  }

  if (!word) {
    return (
      <BubbleSheet
        closeAccessibilityLabel="Close dictionary details"
        colors={colors}
        onClose={onClose}
        title="Dictionary"
      >
        <View style={styles.dictionarySheetContent}>
          <Text style={styles.stateMessageTitle}>Word not found.</Text>
        </View>
      </BubbleSheet>
    );
  }

  return (
    <BubbleSheet
      closeAccessibilityLabel="Close dictionary details"
      colors={colors}
      onClose={onClose}
      title={word.word}
    >
      <View style={styles.dictionarySheetContent}>
        <Text style={styles.phonetics}>
          {word.phonetics.us ?? word.phonetics.uk ?? 'No phonetics'}
        </Text>
        <View style={styles.sheetDivider} />
        <Text style={styles.sectionLabel}>PART OF SPEECH</Text>
        <Text style={styles.detailsText}>{word.partOfSpeech}</Text>
        <Text style={styles.sectionLabel}>OXFORD EXAMPLES</Text>
        {/* Keep dictionary details compact instead of turning the drawer into a reader. */}
        {word.examples.slice(0, 3).map((example) => (
          <Text key={example} style={styles.exampleText}>
            • {example}
          </Text>
        ))}
      </View>
    </BubbleSheet>
  );
}

// resolveColorsFromStyles preserves the sheet props while feeding BubbleSheet tokens.
function resolveColorsFromStyles(styles: AppStyles): AppColors {
  const safeAreaStyle = StyleSheet.flatten(styles.safeArea);

  return safeAreaStyle.backgroundColor === darkColors.backgroundPrimary
    ? darkColors
    : lightColors;
}
