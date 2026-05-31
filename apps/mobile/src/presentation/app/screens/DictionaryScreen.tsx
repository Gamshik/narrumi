import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  cefrLevels,
  type LearnedWordProgress,
  type VocabularyItem,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import { LevelBadge } from '../shared';
import type { AppStyles, LevelFilter } from '../types';

// levelFilters keeps the visual CEFR selector aligned with the domain levels.
const levelFilters: readonly LevelFilter[] = ['ALL', ...cefrLevels];
// queueFilters are local progress-state filters for the bundled dictionary.
const queueFilters = [
  'All',
  'Unseen',
  'Skipped',
  'Learning',
  'Review',
  'Mastered',
] as const;
// QueueFilter is the selected visual state filter shown above the dictionary list.
type QueueFilter = (typeof queueFilters)[number];

// DictionaryScreenProps defines the dictionary list screen dependencies.
type DictionaryScreenProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectWord opens native details for the selected domain item.
  readonly onSelectWord: (word: VocabularyItem) => void;
};

// StyledViewProps is used by small static dictionary subcomponents.
type StyledViewProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// SearchBarProps defines controlled search input state for local vocabulary lookup.
type SearchBarProps = {
  // search is the current text used to filter local vocabulary.
  readonly search: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeSearch updates the dictionary query text.
  readonly onChangeSearch: (search: string) => void;
};

// LevelFiltersProps defines CEFR selector state for the dictionary catalog.
type LevelFiltersProps = {
  // level is the active CEFR filter or ALL for the full catalog.
  readonly level: LevelFilter;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeLevel applies a new CEFR filter.
  readonly onChangeLevel: (level: LevelFilter) => void;
};

// QueueFiltersProps defines the visual card-state selector contract.
type QueueFiltersProps = {
  // selectedFilter is the active visual state bucket.
  readonly selectedFilter: QueueFilter;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeFilter updates the visual card-state selection.
  readonly onChangeFilter: (filter: QueueFilter) => void;
};

// DictionaryContentProps defines the loaded/error/list states for catalog results.
type DictionaryContentProps = {
  // errorMessage is shown when the bundled catalog cannot be read.
  readonly errorMessage: string | undefined;
  // isLoading distinguishes initial catalog loading from an empty result.
  readonly isLoading: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // words are normalized vocabulary items returned by the use case.
  readonly words: readonly VocabularyItem[];
  // onSelectWord opens details for a selected row.
  readonly onSelectWord: (word: VocabularyItem) => void;
};

// ProgressByWordId maps vocabulary ids to local practice records.
type ProgressByWordId = ReadonlyMap<string, LearnedWordProgress>;

// StateMessageProps defines a compact empty/error state.
type StateMessageProps = {
  // message is the primary user-facing state text.
  readonly message: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// DictionaryWordRowProps defines one tappable dictionary catalog row.
type DictionaryWordRowProps = {
  // onPress selects the row for native details.
  readonly onPress: () => void;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is the normalized vocabulary item displayed by the row.
  readonly word: VocabularyItem;
};

export function DictionaryScreen({
  styles,
  onSelectWord,
}: DictionaryScreenProps): ReactElement {
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('All');
  const [search, setSearch] = useState('');
  const [words, setWords] = useState<readonly VocabularyItem[]>([]);
  const [progressByWordId, setProgressByWordId] = useState<ProgressByWordId>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void localAppServices.loadWordProgress
        .execute()
        .then(({ progress }) => {
          if (isActive) {
            setProgressByWordId(
              new Map(progress.map((item) => [item.wordId, item])),
            );
          }
        })
        .catch(() => {
          if (isActive) {
            setErrorMessage('Local word progress could not be loaded.');
          }
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    // Filters can change while the catalog promise is resolving; ignore stale
    // responses so older searches do not overwrite the latest list.
    let isActive = true;

    setIsLoading(true);
    setErrorMessage(undefined);

    void localAppServices.browseVocabulary
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

  const filteredWords = useMemo(
    () => filterWordsByProgress(words, queueFilter, progressByWordId),
    [progressByWordId, queueFilter, words],
  );

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
        {isLoading
          ? 'Loading local catalog...'
          : `${filteredWords.length} words available`}
      </Text>
      <DictionaryContent
        errorMessage={errorMessage}
        isLoading={isLoading}
        styles={styles}
        words={filteredWords}
        onSelectWord={onSelectWord}
      />
    </View>
  );
}

// DictionaryHeader renders the screen title without Oxford-specific marketing text.
function DictionaryHeader({ styles }: StyledViewProps): ReactElement {
  return (
    <View style={styles.dictionaryHeader}>
      <Text style={styles.largeTitle}>Dictionary</Text>
    </View>
  );
}

// SearchBar renders a controlled local search field for bundled vocabulary.
function SearchBar({
  search,
  styles,
  onChangeSearch,
}: SearchBarProps): ReactElement {
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

// LevelFilters renders the horizontal CEFR filter selector.
function LevelFilters({
  level,
  styles,
  onChangeLevel,
}: LevelFiltersProps): ReactElement {
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

// QueueFilters renders local card-state filters backed by AsyncStorage progress.
function QueueFilters({
  selectedFilter,
  styles,
  onChangeFilter,
}: QueueFiltersProps): ReactElement {
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

// filterWordsByProgress applies dictionary stage filters from local practice state.
function filterWordsByProgress(
  words: readonly VocabularyItem[],
  queueFilter: QueueFilter,
  progressByWordId: ProgressByWordId,
): readonly VocabularyItem[] {
  if (queueFilter === 'All') {
    return words;
  }

  return words.filter((word) => {
    const progress = progressByWordId.get(word.id);

    if (queueFilter === 'Unseen') {
      return progress === undefined;
    }

    if (queueFilter === 'Skipped') {
      return progress?.status === 'skipped';
    }

    if (queueFilter === 'Learning') {
      return progress?.status === 'learning';
    }

    if (queueFilter === 'Review') {
      return progress?.status === 'in-review';
    }

    return progress?.status === 'mastered';
  });
}

// DictionaryContent selects the correct list, empty, or error state.
function DictionaryContent({
  errorMessage,
  isLoading,
  styles,
  words,
  onSelectWord,
}: DictionaryContentProps): ReactElement {
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

// StateMessage renders a compact fallback for empty and failed dictionary states.
function StateMessage({
  message,
  styles,
}: StateMessageProps): ReactElement {
  return (
    <View style={styles.stateMessage}>
      <Text style={styles.stateMessageTitle}>{message}</Text>
      <Text style={styles.secondaryText}>Try another filter or search query.</Text>
    </View>
  );
}

// DictionaryWordRow renders a dictionary-specific row, separate from future study cards.
function DictionaryWordRow({
  onPress,
  styles,
  word,
}: DictionaryWordRowProps): ReactElement {
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
