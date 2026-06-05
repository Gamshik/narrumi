import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  learningGenres,
  type LearningGenre,
  type LearningSignalKind,
  type VocabularyItem,
  type WordSet,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';

// genreLabels maps domain genre values to user-facing labels from the PRD.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'work-it': 'Work & IT',
  'travel-leisure': 'Travel',
  'short-fiction': 'Short Fiction',
};

// WordPickerScreenProps carries themed styles into the local Story Words flow.
type DailySessionScreenProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// WordPickerStage tracks the visible part of the local Story Words flow.
type WordPickerStage = 'loading' | 'picker' | 'genre' | 'generation';

// WordPickerState stores the loaded local word set and vocabulary suggestions.
type WordPickerState = {
  // wordSet is the persisted Today's Words selection.
  readonly wordSet: WordSet;
  // words are the ordered vocabulary suggestions shown in Word Picker.
  readonly words: readonly VocabularyItem[];
};

// DailySessionScreen now hosts the first local Word Picker step for the series MVP.
export function DailySessionScreen({
  styles,
}: DailySessionScreenProps): ReactElement {
  const [stage, setStage] = useState<WordPickerStage>('loading');
  const [pickerState, setPickerState] = useState<WordPickerState>();
  const [selectedGenre, setSelectedGenre] = useState<LearningGenre>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let isActive = true;

    void localAppServices.networkStatus
      .getCurrentState()
      .then((state) => {
        if (isActive) {
          setIsOnline(state.isOnline);
        }
      })
      .catch(() => setIsOnline(false));

    void startLocalWordPicker(isActive);

    return () => {
      isActive = false;
    };
  }, []);

  const currentWord = useMemo(
    () =>
      pickerState?.words.find((word) =>
        pickerState.wordSet.wordIds.includes(word.id),
      ),
    [pickerState],
  );

  const startLocalWordPicker = async (isActive = true): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const { wordSet } = await localAppServices.startTodaysWordSet.execute();
      const words = await loadWordSetWords(wordSet);

      if (isActive) {
        setPickerState({ wordSet, words });
        setStage(words.length > 0 ? 'picker' : 'genre');
      }
    } catch {
      if (isActive) {
        setErrorMessage('Local Story Words could not be loaded.');
      }
    } finally {
      if (isActive) {
        setIsLoading(false);
      }
    }
  };

  const applyWordAction = async (
    word: VocabularyItem,
    signalKind: LearningSignalKind,
  ): Promise<void> => {
    if (!pickerState) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      await localAppServices.recordLearningSignal.execute({
        wordId: word.id,
        kind: signalKind,
      });

      const wordSet =
        signalKind === 'selected' || signalKind === 'pinned'
          ? await localAppServices.updateWordSet.execute({
              wordSet: pickerState.wordSet,
              addWordId: word.id,
            })
          : await localAppServices.updateWordSet.execute({
              wordSet: pickerState.wordSet,
              removeWordId: word.id,
            });

      setPickerState({ ...pickerState, wordSet });

      if (wordSet.wordIds.length === 0 || signalKind === 'selected') {
        setStage('genre');
      }
    } catch {
      setErrorMessage('Story Word choice could not be saved locally.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectGenre = (genre: LearningGenre): void => {
    setSelectedGenre(genre);
    setStage('generation');
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.largeTitle}>Story Words</Text>
      </View>

      {errorMessage ? (
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      ) : null}

      {stage === 'loading' ? (
        <View style={styles.settingsCard}>
          <Text style={styles.actionTitle}>Loading local Word Picker...</Text>
          <Text style={styles.secondaryText}>
            Suggestions come from the bundled dictionary and local learning
            signals on this device.
          </Text>
        </View>
      ) : null}

      {stage === 'picker' && pickerState && currentWord ? (
        <StoryWordCard
          isLoading={isLoading}
          progressLabel={`${pickerState.wordSet.wordIds.indexOf(currentWord.id) + 1} of ${
            pickerState.wordSet.wordIds.length
          }`}
          styles={styles}
          word={currentWord}
          onAction={applyWordAction}
        />
      ) : null}

      {stage === 'genre' ? (
        <GenreSelection
          isLoading={isLoading}
          selectedGenre={selectedGenre}
          styles={styles}
          onSelectGenre={selectGenre}
        />
      ) : null}

      {stage === 'generation' ? (
        <GenerationState
          isOnline={isOnline}
          selectedGenre={selectedGenre}
          selectedWordCount={pickerState?.wordSet.wordIds.length ?? 0}
          styles={styles}
        />
      ) : null}
    </ScrollView>
  );
}

// StoryWordCard renders one Word Picker suggestion with non-punitive decisions.
function StoryWordCard({
  isLoading,
  progressLabel,
  styles,
  word,
  onAction,
}: {
  // isLoading disables duplicate local writes.
  readonly isLoading: boolean;
  // progressLabel shows the suggestion position inside Today's Words.
  readonly progressLabel: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is the current local Word Picker suggestion.
  readonly word: VocabularyItem;
  // onAction persists the selected Word Picker signal.
  readonly onAction: (
    word: VocabularyItem,
    signalKind: LearningSignalKind,
  ) => void;
}): ReactElement {
  return (
    <View style={styles.practiceCard}>
      <Text style={styles.sectionLabel}>{progressLabel}</Text>
      <Text style={styles.practiceWord}>{word.word}</Text>
      <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
      <Text style={styles.phonetics}>
        {word.phonetics.us ?? word.phonetics.uk ?? 'No phonetics'}
      </Text>
      <Text style={styles.exampleText}>{word.examples[0] ?? 'No example'}</Text>
      <View style={styles.practiceActions}>
        <SecondaryAction
          disabled={isLoading}
          label="Know it"
          styles={styles}
          onPress={() => onAction(word, 'known')}
        />
        <PrimaryAction
          disabled={isLoading}
          label="Use in episode"
          styles={styles}
          onPress={() => onAction(word, 'selected')}
        />
      </View>
      <View style={styles.practiceActions}>
        <SecondaryAction
          disabled={isLoading}
          label="Later"
          styles={styles}
          onPress={() => onAction(word, 'later')}
        />
        <SecondaryAction
          disabled={isLoading}
          label="Pin"
          styles={styles}
          onPress={() => onAction(word, 'pinned')}
        />
      </View>
    </View>
  );
}

// GenreSelection renders the approved MVP genre choices before generation.
function GenreSelection({
  isLoading,
  selectedGenre,
  styles,
  onSelectGenre,
}: {
  // isLoading disables duplicate genre writes.
  readonly isLoading: boolean;
  // selectedGenre is the locally selected story genre when present.
  readonly selectedGenre: LearningGenre | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectGenre stores the selected genre in screen state.
  readonly onSelectGenre: (genre: LearningGenre) => void;
}): ReactElement {
  return (
    <View style={styles.settingsCard}>
      <Text style={styles.actionTitle}>Choose a series genre</Text>
      <Text style={styles.secondaryText}>
        The next implementation step will attach this to a personal series.
      </Text>
      {learningGenres.map((genre) => (
        <Pressable
          disabled={isLoading}
          key={genre}
          onPress={() => onSelectGenre(genre)}
          style={({ pressed }) => [
            styles.genreRow,
            genre === selectedGenre && styles.activeGenreRow,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionTitle}>{genreLabels[genre]}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

// GenerationState renders the explicit offline state for server-only episode generation.
function GenerationState({
  isOnline,
  selectedGenre,
  selectedWordCount,
  styles,
}: {
  // isOnline tells whether server-backed generation could be attempted.
  readonly isOnline: boolean;
  // selectedGenre is the saved genre used by the future episode request.
  readonly selectedGenre: LearningGenre | undefined;
  // selectedWordCount shows how many Story Words are ready locally.
  readonly selectedWordCount: number;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  return (
    <View style={styles.goalCard}>
      <Text style={styles.actionTitle}>Episode Generation</Text>
      <Text style={styles.secondaryText}>
        Story Words: {selectedWordCount}. Genre:{' '}
        {selectedGenre ? genreLabels[selectedGenre] : 'not selected'}.
      </Text>
      <View style={styles.offlineNotice}>
        <Text style={styles.stateMessageTitle}>
          {isOnline ? 'Generation backend is not connected yet.' : 'Offline mode'}
        </Text>
        <Text style={styles.secondaryText}>
          AI episodes require a Supabase Edge Function. Local Story Words and
          signals are saved first and can sync later.
        </Text>
      </View>
    </View>
  );
}

// PrimaryAction renders the main filled action button.
function PrimaryAction({
  disabled,
  label,
  styles,
  onPress,
}: {
  // disabled prevents duplicate local writes while an action is pending.
  readonly disabled: boolean;
  // label is the visible action text.
  readonly label: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onPress forwards the user intent to the screen use case handler.
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

// SecondaryAction renders the neutral companion action button.
function SecondaryAction({
  disabled,
  label,
  styles,
  onPress,
}: {
  // disabled prevents duplicate local writes while an action is pending.
  readonly disabled: boolean;
  // label is the visible action text.
  readonly label: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onPress forwards the user intent to the screen use case handler.
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

// loadWordSetWords resolves Today's Words through the vocabulary use case.
async function loadWordSetWords(wordSet: WordSet): Promise<readonly VocabularyItem[]> {
  const words = await localAppServices.browseVocabulary.execute();
  const wordsById = new Map(words.map((word) => [word.id, word]));

  return wordSet.wordIds.flatMap((wordId) => {
    const word = wordsById.get(wordId);

    return word ? [word] : [];
  });
}
