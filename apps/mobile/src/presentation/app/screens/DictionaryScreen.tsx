import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createBrowseVocabulary } from '@application/index';
import { cefrLevels, type VocabularyItem } from '@domain/index';
import { BundledOxfordVocabularyCatalog } from '@infrastructure/index';

import { LevelBadge } from '../shared';
import type { AppStyles, LevelFilter } from '../types';

const catalog = new BundledOxfordVocabularyCatalog();
const browseVocabulary = createBrowseVocabulary(catalog);
const levelFilters: readonly LevelFilter[] = ['ALL', ...cefrLevels];
const queueFilters = ['All', 'Unseen', 'Study', 'Mastered'] as const;

export function DictionaryScreen({
  styles,
  onSelectWord,
}: {
  readonly styles: AppStyles;
  readonly onSelectWord: (word: VocabularyItem) => void;
}) {
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [queueFilter, setQueueFilter] = useState<(typeof queueFilters)[number]>('All');
  const [search, setSearch] = useState('');
  const [words, setWords] = useState<readonly VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setErrorMessage(undefined);

    void browseVocabulary
      .execute({
        ...(level === 'ALL' ? {} : { level }),
        ...(search.trim() ? { search } : {}),
      })
      .then((items) => {
        if (isActive) {
          setWords(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('The bundled dictionary could not be loaded.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [level, search]);

  return (
    <View style={styles.dictionaryScreen}>
      <DictionaryHeader styles={styles} />
      <SearchBar search={search} styles={styles} onChangeSearch={setSearch} />
      <LevelFilters level={level} styles={styles} onChangeLevel={setLevel} />
      <QueueFilters
        selectedFilter={queueFilter}
        styles={styles}
        onChangeFilter={setQueueFilter}
      />
      <Text style={styles.counterText}>
        {isLoading ? 'Loading local catalog...' : `${words.length} words available`}
      </Text>
      <DictionaryContent
        errorMessage={errorMessage}
        isLoading={isLoading}
        styles={styles}
        words={words}
        onSelectWord={onSelectWord}
      />
    </View>
  );
}

function DictionaryHeader({ styles }: { readonly styles: AppStyles }) {
  return (
    <View style={styles.dictionaryHeader}>
      <Text style={styles.largeTitle}>Dictionary</Text>
    </View>
  );
}

function SearchBar({
  search,
  styles,
  onChangeSearch,
}: {
  readonly search: string;
  readonly styles: AppStyles;
  readonly onChangeSearch: (search: string) => void;
}) {
  return (
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeSearch}
        placeholder="Search vocabulary..."
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
  );
}

function LevelFilters({
  level,
  styles,
  onChangeLevel,
}: {
  readonly level: LevelFilter;
  readonly styles: AppStyles;
  readonly onChangeLevel: (level: LevelFilter) => void;
}) {
  return (
    <View style={styles.filterViewport}>
      <ScrollView
        contentContainerStyle={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {levelFilters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => onChangeLevel(filter)}
            style={({ pressed }) => [
              styles.filterPill,
              filter === level && styles.activeFilterPill,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === level && styles.activeFilterText,
              ]}
            >
              {filter === 'ALL' ? 'All levels' : filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function QueueFilters({
  selectedFilter,
  styles,
  onChangeFilter,
}: {
  readonly selectedFilter: (typeof queueFilters)[number];
  readonly styles: AppStyles;
  readonly onChangeFilter: (filter: (typeof queueFilters)[number]) => void;
}) {
  return (
    <View style={styles.queueFilterBar}>
      {queueFilters.map((filter) => (
        <Pressable
          key={filter}
          onPress={() => onChangeFilter(filter)}
          style={[
            styles.queueFilterOption,
            filter === selectedFilter && styles.activeQueueFilterOption,
          ]}
        >
          <Text
            style={[
              styles.queueFilterText,
              filter === selectedFilter && styles.activeQueueFilterText,
            ]}
          >
            {filter}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function DictionaryContent({
  errorMessage,
  isLoading,
  styles,
  words,
  onSelectWord,
}: {
  readonly errorMessage: string | undefined;
  readonly isLoading: boolean;
  readonly styles: AppStyles;
  readonly words: readonly VocabularyItem[];
  readonly onSelectWord: (word: VocabularyItem) => void;
}) {
  if (errorMessage) {
    return <StateMessage message={errorMessage} styles={styles} />;
  }

  if (!isLoading && words.length === 0) {
    return <StateMessage message="No vocabulary matches found." styles={styles} />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.wordList}
      data={words}
      initialNumToRender={24}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <DictionaryWordRow
          styles={styles}
          word={item}
          onPress={() => onSelectWord(item)}
        />
      )}
    />
  );
}

function StateMessage({
  message,
  styles,
}: {
  readonly message: string;
  readonly styles: AppStyles;
}) {
  return (
    <View style={styles.stateMessage}>
      <Text style={styles.stateMessageTitle}>{message}</Text>
      <Text style={styles.secondaryText}>Try another filter or search query.</Text>
    </View>
  );
}

function DictionaryWordRow({
  onPress,
  styles,
  word,
}: {
  readonly onPress: () => void;
  readonly styles: AppStyles;
  readonly word: VocabularyItem;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wordRow, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <View style={styles.wordHeading}>
          <Text style={styles.wordTitle}>{word.word}</Text>
          <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
        </View>
        <Text style={styles.phonetics}>
          {word.phonetics.us ?? word.phonetics.uk ?? 'No phonetics'}
        </Text>
      </View>
      <LevelBadge level={word.level} styles={styles} />
    </Pressable>
  );
}
