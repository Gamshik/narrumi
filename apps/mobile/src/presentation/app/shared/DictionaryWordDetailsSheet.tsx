import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { JellyPressable } from './JellyPressable';

import type { VocabularyItem } from '@domain/index';

import type { AppStyles } from '../types';

// DictionaryWordDetailsSheetProps defines the native sheet content contract.
type DictionaryWordDetailsSheetProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is undefined when a route id cannot be resolved from the local catalog.
  readonly word: VocabularyItem | undefined;
  // onClose dismisses the native form sheet route.
  readonly onClose: () => void;
};

// DictionaryWordDetailsSheet renders read-only dictionary details for one word.
export function DictionaryWordDetailsSheet({
  styles,
  word,
  onClose,
}: DictionaryWordDetailsSheetProps): ReactElement {
  if (!word) {
    return (
      <View style={styles.sheetContent}>
        <Text style={styles.stateMessageTitle}>Word not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.sheetContent}>
      <View style={styles.detailsHeader}>
        <View style={styles.flex}>
          <Text style={styles.detailsTitle}>{word.word}</Text>
          <Text style={styles.phonetics}>
            {word.phonetics.us ?? word.phonetics.uk ?? 'No phonetics'}
          </Text>
        </View>
        <JellyPressable onPress={onClose} hitSlop={12}>
          <Text style={styles.closeButton}>×</Text>
        </JellyPressable>
      </View>
      <View style={styles.sheetDivider} />
      <Text style={styles.sectionLabel}>PART OF SPEECH</Text>
      <Text style={styles.detailsText}>{word.partOfSpeech}</Text>
      <Text style={styles.sectionLabel}>OXFORD EXAMPLES</Text>
      {/* Keep the native form sheet content-sized instead of turning it into a reader. */}
      {word.examples.slice(0, 3).map((example) => (
        <Text key={example} style={styles.exampleText}>
          • {example}
        </Text>
      ))}
    </View>
  );
}
