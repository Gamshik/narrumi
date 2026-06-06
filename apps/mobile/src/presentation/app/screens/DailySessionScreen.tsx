import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  learningGenres,
  type LearningGenre,
  type LearningPreferences,
  type Series,
  type VocabularyItem,
  type WordSet,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import { EpisodeReaderScreen } from './EpisodeReaderScreen';

// genreLabels maps domain genre values to user-facing labels from the PRD.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'work-it': 'Work & IT',
  'travel-leisure': 'Travel',
  'short-fiction': 'Short Fiction',
};

// DailySessionScreenProps carries themed styles into the unified episode flow.
type DailySessionScreenProps = {
  // seriesId scopes the episode setup to one local story.
  readonly seriesId?: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onExit returns from the story flow to the stories list.
  readonly onExit: () => void;
};

// EpisodeFlowStage tracks the unified Story Words -> Reader flow.
type EpisodeFlowStage = 'loading' | 'setup' | 'reader';

// EpisodeWordSelectionState stores current local Story Words and settings.
type EpisodeWordSelectionState = {
  // preferences define the configured number of proposed Story Words.
  readonly preferences: LearningPreferences;
  // todayWordSet is preserved as the local daily source.
  readonly todayWordSet: WordSet;
  // episodeWordSet is the editable current generation set.
  readonly episodeWordSet: WordSet;
  // words are the resolved visible words for the current episode.
  readonly words: readonly VocabularyItem[];
};

// DailySessionScreen hosts Story Words, AI generation, and Episode Reader together.
export function DailySessionScreen({
  onExit,
  seriesId,
  styles,
}: DailySessionScreenProps): ReactElement {
  const [stage, setStage] = useState<EpisodeFlowStage>('loading');
  const [selectionState, setSelectionState] =
    useState<EpisodeWordSelectionState>();
  const [series, setSeries] = useState<Series>();
  const [selectedGenre, setSelectedGenre] = useState<LearningGenre>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isReplacing, setIsReplacing] = useState(false);
  const [generatedEpisodeId, setGeneratedEpisodeId] = useState<string>();
  const [isOnline, setIsOnline] = useState(false);

  const loadWordSelection = useCallback(async (isActive = true): Promise<void> => {
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.startEpisodeWordSelection.execute();
      const loadedSeries = seriesId
        ? (await localAppServices.listSeries.execute()).series.find(
            (candidate) => candidate.id === seriesId,
          )
        : undefined;

      if (isActive) {
        setSeries(loadedSeries);
        setSelectionState(result);
        setSelectedGenre(loadedSeries?.genre ?? result.preferences.preferredGenre);
        setStage('setup');
      }
    } catch {
      if (isActive) {
        setErrorMessage('Local Story Words could not be loaded.');
      }
    }
  }, [seriesId]);

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

    void loadWordSelection(isActive);

    return () => {
      isActive = false;
    };
  }, [loadWordSelection]);

  const replaceWord = async (wordId: string): Promise<void> => {
    if (!selectionState) {
      return;
    }

    setIsReplacing(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.replaceEpisodeStoryWord.execute({
        episodeWordSet: selectionState.episodeWordSet,
        wordId,
      });

      setSelectionState({
        ...selectionState,
        episodeWordSet: result.episodeWordSet,
        words: result.words,
      });
    } catch {
      setErrorMessage('Story Word could not be replaced locally.');
    } finally {
      setIsReplacing(false);
    }
  };

  const generateEpisode = async (): Promise<void> => {
    if (!seriesId) {
      setErrorMessage('Open a series before generating an episode.');

      return;
    }

    if (!selectionState) {
      setErrorMessage('Story Words must be loaded before generation.');

      return;
    }

    try {
      const result = await localAppServices.generateEpisode.execute({
        episodeWordSet: selectionState.episodeWordSet,
        seriesId,
      });

      setGeneratedEpisodeId(result.episode.id);
      setStage('reader');
    } catch (error) {
      console.error('generateEpisode error:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Episode generation is online-only and requires configured Supabase Edge Functions.',
      );
    }
  };

  if (stage === 'reader') {
    return (
      <EpisodeReaderScreen
        {...(generatedEpisodeId ? { episodeId: generatedEpisodeId } : {})}
        {...(seriesId ? { seriesId } : {})}
        styles={styles}
        onExit={onExit}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.appCategory}>NEXT EPISODE</Text>
          <Text style={styles.largeTitle}>{series?.title ?? 'Story Setup'}</Text>
        </View>
        <Pressable
          onPress={onExit}
          style={({ pressed }) => [styles.smallPrimaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallPrimaryButtonText}>Exit</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      ) : null}

      {stage === 'loading' || !selectionState ? (
        <View style={styles.settingsCard}>
          <Text style={styles.actionTitle}>Loading local Story Words...</Text>
          <Text style={styles.secondaryText}>
            The app checks saved daily words and the last current episode set.
          </Text>
        </View>
      ) : (
        <>
          <StoryWordsPanel
            isReplacing={isReplacing}
            selectionState={selectionState}
            styles={styles}
            onReplaceWord={(wordId) => {
              void replaceWord(wordId);
            }}
          />
          <GenreSelection
            selectedGenre={selectedGenre}
            styles={styles}
            onSelectGenre={setSelectedGenre}
          />
          <GenerationPanel
            isOnline={isOnline}
            selectedGenre={selectedGenre}
            selectedWordCount={selectionState.words.length}
            styles={styles}
            onGenerateEpisode={() => {
              void generateEpisode();
            }}
          />
        </>
      )}
    </ScrollView>
  );
}

// StoryWordsPanel shows the current editable words while preserving today's source.
function StoryWordsPanel({
  isReplacing,
  selectionState,
  styles,
  onReplaceWord,
}: {
  // isReplacing disables duplicate local writes.
  readonly isReplacing: boolean;
  // selectionState carries today's source and current episode words.
  readonly selectionState: EpisodeWordSelectionState;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onReplaceWord changes only the current episode word set.
  readonly onReplaceWord: (wordId: string) => void;
}): ReactElement {
  return (
    <View style={styles.settingsCard}>
      <View style={styles.settingRow}>
        <View style={styles.flex}>
          <Text style={styles.actionTitle}>Story Words</Text>
          <Text style={styles.secondaryText}>
            Showing {selectionState.words.length} of{' '}
            {selectionState.preferences.storyWordGoal} words from settings.
          </Text>
        </View>
        <Text style={styles.settingValue}>
          Today: {selectionState.todayWordSet.wordIds.length}
        </Text>
      </View>
      {selectionState.words.map((word) => (
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
            disabled={isReplacing}
            onPress={() => onReplaceWord(word.id)}
            style={({ pressed }) => [
              styles.smallPrimaryButton,
              isReplacing && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.smallPrimaryButtonText}>Replace</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// GenreSelection renders the approved MVP genre choices before generation.
function GenreSelection({
  selectedGenre,
  styles,
  onSelectGenre,
}: {
  // selectedGenre is the locally selected story genre when present.
  readonly selectedGenre: LearningGenre | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectGenre stores the selected genre in screen state.
  readonly onSelectGenre: (genre: LearningGenre) => void;
}): ReactElement {
  return (
    <View style={styles.settingsCard}>
      <Text style={styles.actionTitle}>Genre</Text>
      <View style={styles.choiceRow}>
        {learningGenres.map((genre) => (
          <Pressable
            key={genre}
            onPress={() => onSelectGenre(genre)}
            style={({ pressed }) => [
              styles.goalChoice,
              genre === selectedGenre && styles.activeGoalChoice,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.goalChoiceText,
                genre === selectedGenre && styles.activeGoalChoiceText,
              ]}
            >
              {genreLabels[genre]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// GenerationPanel opens the AI reader while keeping server-only status explicit.
function GenerationPanel({
  isOnline,
  selectedGenre,
  selectedWordCount,
  styles,
  onGenerateEpisode,
}: {
  // isOnline tells whether server-backed generation could be attempted.
  readonly isOnline: boolean;
  // selectedGenre is the saved genre used by the future episode request.
  readonly selectedGenre: LearningGenre | undefined;
  // selectedWordCount shows how many Story Words are ready locally.
  readonly selectedWordCount: number;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onGenerateEpisode calls the Supabase AI boundary through application use cases.
  readonly onGenerateEpisode: () => void;
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
          {isOnline ? 'Ready for AI generation' : 'Offline mode'}
        </Text>
        <Text style={styles.secondaryText}>
          Episode generation requires Supabase Edge Functions and remains disabled
          while the device is offline.
        </Text>
      </View>
      <Pressable
        disabled={!isOnline}
        onPress={onGenerateEpisode}
        style={({ pressed }) => [
          styles.primaryButton,
          !isOnline && styles.disabledControl,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Generate Episode</Text>
      </Pressable>
    </View>
  );
}
