import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { BlurTargetView } from 'expo-blur';
import {
  Alert,
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkColors, lightColors } from '@presentation/theme';

import { JellyPressable, screenEdgeDepths } from '../shared';
import { useAppTheme } from '../theme';

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
import { DictionaryPickerPanel } from './dailySession/components/DictionaryPickerPanel';
import { DailySessionEdgeEffects } from './DailySessionEdgeEffects';
import { EpisodeReaderScreen } from './EpisodeReaderScreen';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// genreLabels maps domain genre values to user-facing labels from the PRD.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'work-it': 'Work & IT',
  'travel-leisure': 'Travel',
  'short-fiction': 'Short Fiction',
};

// setupHeaderCollapseOffset matches Home's deliberate upward-scroll threshold.
const setupHeaderCollapseOffset: number = 38;
// setupHeaderExpandOffset matches Home's hysteresis against small scroll reversals.
const setupHeaderExpandOffset: number = 12;
// setupTitleTransitionDuration keeps the large-to-compact title swap identical to Home.
const setupTitleTransitionDuration: number = 220;
// setupMaterialTransitionDuration fades top glass independently without a directional reveal.
const setupMaterialTransitionDuration: number = 180;

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
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  // titleTransition drives the autonomous large-to-compact title swap.
  const [titleTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // materialTransition controls only the top blur-and-gradient opacity.
  const [materialTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  // blurTargetRef identifies the edge-to-edge Story Words scroll surface for Android blur.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // setupContentInsets places the hero below top glass and clears the quiet lower fade.
  const setupContentInsets: ViewStyle = {
    paddingTop: insets.top + screenEdgeDepths.compactTop + 2,
    paddingBottom: insets.bottom + screenEdgeDepths.modalBottom + 16,
  };
  // largeTitleOpacity removes the hero title before the compact peer becomes fully visible.
  const largeTitleOpacity: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.18, 0.58, 1],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });
  // largeTitleTranslateY lets the hero title leave with its scrolling content.
  const largeTitleTranslateY: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [0, -10, -10],
      extrapolate: 'clamp',
    });
  // largeTitleScale adds the same restrained compression used by Home.
  const largeTitleScale: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [1, 0.97, 0.97],
      extrapolate: 'clamp',
    });
  const [stage, setStage] = useState<EpisodeFlowStage>('loading');
  const [selectionState, setSelectionState] =
    useState<EpisodeWordSelectionState>();
  const [series, setSeries] = useState<Series>();
  const [selectedGenre, setSelectedGenre] = useState<LearningGenre>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pickerWordId, setPickerWordId] = useState<string>();
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [dictionaryWords, setDictionaryWords] = useState<readonly VocabularyItem[]>([]);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [generatedEpisodeId, setGeneratedEpisodeId] = useState<string>();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // The scroll threshold selects a stable target; both animations finish independently of the gesture.
    const titleAnimation: Animated.CompositeAnimation = Animated.timing(
      titleTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: setupTitleTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );
    const materialAnimation: Animated.CompositeAnimation = Animated.timing(
      materialTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: setupMaterialTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );

    titleAnimation.start();
    materialAnimation.start();

    return (): void => {
      titleAnimation.stop();
      materialAnimation.stop();
    };
  }, [isHeaderCollapsed, materialTransition, titleTransition]);

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

  useEffect(() => {
    if (!pickerWordId) {
      setDictionaryWords([]);

      return;
    }

    let isActive = true;

    setIsDictionaryLoading(true);

    void localAppServices.browseVocabulary
      .execute(dictionarySearch.trim() ? { search: dictionarySearch } : {})
      .then((words) => {
        if (isActive) {
          setDictionaryWords(words.slice(0, 32));
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('Dictionary words could not be loaded locally.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsDictionaryLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [dictionarySearch, pickerWordId]);

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

  const shuffleWords = async (): Promise<void> => {
    if (!selectionState) {
      return;
    }

    setIsShuffling(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.shuffleEpisodeStoryWords.execute({
        episodeWordSet: selectionState.episodeWordSet,
        preferences: selectionState.preferences,
      });

      setSelectionState({
        ...selectionState,
        episodeWordSet: result.episodeWordSet,
        words: result.words,
      });
    } catch {
      setErrorMessage('Story Words could not be shuffled locally.');
    } finally {
      setIsShuffling(false);
    }
  };

  const chooseWord = async (replacementWordId: string): Promise<void> => {
    if (!selectionState || !pickerWordId) {
      return;
    }

    setIsChoosing(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.chooseEpisodeStoryWord.execute({
        episodeWordSet: selectionState.episodeWordSet,
        maxLevel: selectionState.preferences.preferredCefrLevel,
        replacementWordId,
        wordId: pickerWordId,
      });

      setSelectionState({
        ...selectionState,
        episodeWordSet: result.episodeWordSet,
        words: result.words,
      });
      setPickerWordId(undefined);
      setDictionarySearch('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Selected dictionary word could not be used.',
      );
    } finally {
      setIsChoosing(false);
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
        ...(selectedGenre ? { genre: selectedGenre } : {}),
        seriesId,
      });

      setGeneratedEpisodeId(result.episode.id);
      setStage('reader');
    } catch (error) {
      const isModerationError =
        error instanceof SupabaseFunctionError &&
        (error.kind === 'moderation_warning' ||
          error.kind === 'moderation_banned');
      const message =
        error instanceof Error
          ? error.message
          : 'Episode generation is online-only and requires configured Supabase Edge Functions.';

      if (isModerationError) {
        Alert.alert(
          error.kind === 'moderation_banned'
            ? 'You are banned'
            : 'Warning',
          message,
        );
        return;
      }

      console.error('generateEpisode error:', error);
      Alert.alert('Episode generation stopped', message);
      setErrorMessage(message);
    }
  };

  const handleSetupScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const offsetY: number = event.nativeEvent.contentOffset.y;

    if (!isHeaderCollapsed && offsetY >= setupHeaderCollapseOffset) {
      setIsHeaderCollapsed(true);
      return;
    }

    if (isHeaderCollapsed && offsetY <= setupHeaderExpandOffset) {
      setIsHeaderCollapsed(false);
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
    <View style={styles.flexOne}>
      <BlurTargetView ref={blurTargetRef} style={styles.flexOne}>
        <Animated.ScrollView
          contentContainerStyle={[styles.screenContent, setupContentInsets]}
          onScroll={handleSetupScroll}
          scrollEventThrottle={16}
        >
          <Animated.View
            style={[
              styles.dailySessionTitleBlock,
              {
                opacity: largeTitleOpacity,
                transform: [
                  { translateY: largeTitleTranslateY },
                  { scale: largeTitleScale },
                ],
              },
            ]}
          >
            <Text style={styles.appCategory}>NEXT EPISODE</Text>
            <Text style={styles.largeTitle}>
              {series?.title ?? 'Story Setup'}
            </Text>
          </Animated.View>

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
          {pickerWordId ? (
            <DictionaryPickerPanel
              isChoosing={isChoosing}
              isLoading={isDictionaryLoading}
              search={dictionarySearch}
              styles={styles}
              targetWord={
                selectionState.words.find((word) => word.id === pickerWordId)
              }
              words={dictionaryWords}
              onChangeSearch={setDictionarySearch}
              onChooseWord={(wordId) => {
                void chooseWord(wordId);
              }}
              onClose={() => {
                setPickerWordId(undefined);
                setDictionarySearch('');
              }}
            />
          ) : (
            <StoryWordsPanel
              isUpdating={isReplacing || isChoosing || isShuffling}
              selectionState={selectionState}
              styles={styles}
              onPickWord={(wordId) => {
                setPickerWordId(wordId);
              }}
              onReplaceWord={(wordId) => {
                void replaceWord(wordId);
              }}
              onShuffleWords={() => {
                void shuffleWords();
              }}
            />
          )}
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
        </Animated.ScrollView>
      </BlurTargetView>
      <DailySessionEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        colors={colors}
        isDark={isDark}
        materialOpacity={materialTransition}
        title={series?.title ?? 'Story Setup'}
        titleTransitionProgress={titleTransition}
        topInset={insets.top}
        onExit={onExit}
      />
    </View>
  );
}

// StoryWordsPanel shows the current editable words while preserving today's source.
function StoryWordsPanel({
  isUpdating,
  selectionState,
  styles,
  onPickWord,
  onReplaceWord,
  onShuffleWords,
}: {
  // isUpdating disables duplicate local writes while words are changing.
  readonly isUpdating: boolean;
  // selectionState carries today's source and current episode words.
  readonly selectionState: EpisodeWordSelectionState;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onPickWord opens the local dictionary for one editable slot.
  readonly onPickWord: (wordId: string) => void;
  // onReplaceWord changes only the current episode word set.
  readonly onReplaceWord: (wordId: string) => void;
  // onShuffleWords replaces the full current episode word set by explicit choice.
  readonly onShuffleWords: () => void;
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
        <JellyPressable
          disabled={isUpdating}
          onPress={onShuffleWords}
          style={({ pressed }) => [
            styles.smallPrimaryButton,
            isUpdating && styles.disabledControl,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.smallPrimaryButtonText}>Shuffle</Text>
        </JellyPressable>
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
          <View style={styles.rowActionStack}>
            <JellyPressable
              disabled={isUpdating}
              onPress={() => onPickWord(word.id)}
              style={({ pressed }) => [
                styles.smallPrimaryButton,
                isUpdating && styles.disabledControl,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.smallPrimaryButtonText}>Pick</Text>
            </JellyPressable>
            <JellyPressable
              disabled={isUpdating}
              onPress={() => onReplaceWord(word.id)}
              style={({ pressed }) => [
                styles.secondarySmallButton,
                isUpdating && styles.disabledControl,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondarySmallButtonText}>Random</Text>
            </JellyPressable>
          </View>
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
      <View style={styles.choiceRowWrapped}>
        {learningGenres.map((genre) => (
          <JellyPressable
            key={genre}
            onPress={() => onSelectGenre(genre)}
            style={({ pressed }) => [
              styles.goalChoiceWrapped,
              genre === selectedGenre && styles.activeGoalChoiceWrapped,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.goalChoiceTextWrapped,
                genre === selectedGenre && styles.activeGoalChoiceTextWrapped,
              ]}
            >
              {genreLabels[genre]}
            </Text>
          </JellyPressable>
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
      <JellyPressable
        disabled={!isOnline}
        onPress={onGenerateEpisode}
        style={({ pressed }) => [
          styles.primaryButton,
          !isOnline && styles.disabledControl,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Generate Episode</Text>
      </JellyPressable>
    </View>
  );
}
