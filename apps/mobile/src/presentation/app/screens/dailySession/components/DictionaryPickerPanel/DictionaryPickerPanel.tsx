import type { ReactElement } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { VocabularyItem } from '@domain/index';
import type { AppStyles } from '@presentation/app/types';

// DictionaryPickerPanelProps defines one local dictionary replacement picker.
export type DictionaryPickerPanelProps = {
  // isChoosing disables duplicate writes while the selected word is saved.
  readonly isChoosing: boolean;
  // isLoading distinguishes dictionary lookup from an empty result.
  readonly isLoading: boolean;
  // search is the controlled local dictionary query.
  readonly search: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // targetWord is the current Story Word slot being replaced.
  readonly targetWord: VocabularyItem | undefined;
  // words are local dictionary results available for this slot.
  readonly words: readonly VocabularyItem[];
  // onChangeSearch updates the local dictionary query.
  readonly onChangeSearch: (search: string) => void;
  // onChooseWord persists one explicit dictionary choice.
  readonly onChooseWord: (wordId: string) => void;
  // onClose hides the picker without changing the current Story Words.
  readonly onClose: () => void;
};

// DictionaryPickerPanel lets users choose one Story Word from the bundled catalog.
export function DictionaryPickerPanel({
  isChoosing,
  isLoading,
  search,
  styles,
  targetWord,
  words,
  onChangeSearch,
  onChooseWord,
  onClose,
}: DictionaryPickerPanelProps): ReactElement {
  return (
    <View style={styles.settingsCard}>
      <View style={styles.settingRow}>
        <View style={styles.flex}>
          <Text style={styles.actionTitle}>Choose from Dictionary</Text>
          <Text style={styles.secondaryText}>
            Replacing {targetWord?.word ?? 'selected word'}. Search the bundled
            catalog and choose a word.
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.secondarySmallButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondarySmallButtonText}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeSearch}
          placeholder="Search dictionary..."
          placeholderTextColor={styles.placeholder.color}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => onChangeSearch('')} hitSlop={10}>
            <Text style={styles.clearSearch}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.secondaryText}>
        {isLoading ? 'Loading matches...' : `${words.length} matches shown`}
      </Text>
      {words.map((word) => (
        <View key={word.id} style={styles.storyWordRow}>
          <View style={styles.flex}>
            <View style={styles.wordHeading}>
              <Text style={styles.wordTitle}>{word.word}</Text>
              <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
            </View>
            <Text style={styles.secondaryText} numberOfLines={2}>
              {word.examples[0] ?? 'No local example'}
            </Text>
          </View>
          <Pressable
            disabled={isChoosing}
            onPress={() => onChooseWord(word.id)}
            style={({ pressed }) => [
              styles.smallPrimaryButton,
              isChoosing && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.smallPrimaryButtonText}>Choose</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
