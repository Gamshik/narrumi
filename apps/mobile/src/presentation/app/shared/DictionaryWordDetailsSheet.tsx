import { Pressable, Text, View } from 'react-native';

import type { VocabularyItem } from '@domain/index';

import type { AppStyles } from '../types';

export function DictionaryWordDetailsSheet({
  styles,
  word,
  onClose,
}: {
  readonly styles: AppStyles;
  readonly word: VocabularyItem | undefined;
  readonly onClose: () => void;
}) {
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
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.closeButton}>×</Text>
        </Pressable>
      </View>
      <View style={styles.sheetDivider} />
      <Text style={styles.sectionLabel}>PART OF SPEECH</Text>
      <Text style={styles.detailsText}>{word.partOfSpeech}</Text>
      <Text style={styles.sectionLabel}>OXFORD EXAMPLES</Text>
      {word.examples.slice(0, 3).map((example) => (
        <Text key={example} style={styles.exampleText}>
          • {example}
        </Text>
      ))}
    </View>
  );
}
