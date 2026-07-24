import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
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

import {
  JellyPressable,
  PlatformBlurTargetView,
  screenEdgeDepths,
  CefrLevelSelector,
  SeriesSetupChoiceGroup,
  useReducedMotionPreference,
} from '../shared';
import { useAppTheme } from '../theme';

import {
  learningGenres,
  type CefrLevel,
  type LearningGenre,
  type LearningPreferences,
  type Series,
  type VocabularyItem,
  type WordSet,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import { useEpisodeGeneration } from '../generation';
import { DictionaryPickerPanel } from './dailySession/components/DictionaryPickerPanel';
import { StoryWordsPanel } from './dailySession/components/StoryWordsPanel';
import {
  episodeGenreLabels,
  resolveEpisodeSetupDefaults,
} from './dailySession/episodeSetupOptions';
import { DailySessionEdgeEffects } from './DailySessionEdgeEffects';
import { EpisodeReaderScreen } from './EpisodeReaderScreen';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

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
  // reduceMotion is resolved while setup is visible so picker transitions respect accessibility immediately.
  const reduceMotion: boolean = useReducedMotionPreference();
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
  // blurTargetRef preserves the shared edge-effect source contract around Story Words.
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
  const [selectedCefrLevel, setSelectedCefrLevel] = useState<CefrLevel>();
  const [selectedGenre, setSelectedGenre] = useState<LearningGenre>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pickerWordId, setPickerWordId] = useState<string>();
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [dictionaryWords, setDictionaryWords] = useState<readonly VocabularyItem[]>([]);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  // replacingWordId keeps per-word shuffle progress local instead of dimming the full Story Words grid.
  const [replacingWordId, setReplacingWordId] = useState<string>();
  const [isChoosing, setIsChoosing] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const {
    clearGeneration,
    generationStates,
    generateEpisode: requestEpisodeGeneration,
  } = useEpisodeGeneration();
  const generationState = seriesId
    ? generationStates.get(seriesId)
    : undefined;
  // isGenerating follows the root provider instead of this route's mount lifetime.
  const isGenerating = generationState?.kind === 'generating';
  const [generatedEpisodeOrderIndex, setGeneratedEpisodeOrderIndex] =
    useState<number>();
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
      const seriesDetails = seriesId
        ? await localAppServices.loadSeriesDetails.execute({ seriesId })
        : undefined;
      const loadedSeries = seriesDetails?.series;
      const latestEpisode = seriesDetails?.episodes.at(-1);
      const incompleteEpisode = seriesDetails?.episodes
        .filter((episode) => !episode.isComplete)
        .at(-1);
      const result = await localAppServices.startEpisodeWordSelection.execute();
      const defaults = resolveEpisodeSetupDefaults(
        latestEpisode,
        result.preferences.preferredCefrLevel,
      );

      if (isActive) {
        setSeries(loadedSeries);
        setSelectionState(result);
        setSelectedCefrLevel(defaults.cefrLevel);
        setSelectedGenre(defaults.genre);
        setGeneratedEpisodeOrderIndex(incompleteEpisode?.orderIndex);
        setStage((currentStage) =>
          currentStage === 'reader' || incompleteEpisode
            ? 'reader'
            : 'setup',
        );
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

  useEffect((): void => {
    if (!seriesId || !generationState || generationState.kind === 'generating') {
      return;
    }

    if (generationState.kind === 'completed') {
      setGeneratedEpisodeOrderIndex(generationState.result.episode.orderIndex);
      setStage('reader');
      clearGeneration(seriesId);

      return;
    }

    const error = generationState.error;
    const isModerationError =
      error instanceof SupabaseFunctionError &&
      (error.kind === 'moderation_warning' ||
        error.kind === 'moderation_banned');
    const isExpectedGenerationState =
      error instanceof SupabaseFunctionError &&
      (error.kind === 'generation_in_progress' ||
        error.kind === 'generation_conflict' ||
        error.kind === 'episode_incomplete' ||
        error.kind === 'episode_out_of_order');
    const message =
      error instanceof Error
        ? error.message
        : 'Episode generation is online-only and requires configured Supabase Edge Functions.';

    if (isModerationError) {
      Alert.alert(
        error.kind === 'moderation_banned' ? 'You are banned' : 'Warning',
        message,
      );
    } else if (isExpectedGenerationState) {
      setErrorMessage(message);
    } else {
      console.warn('generateEpisode warning:', error);
      Alert.alert('Episode generation stopped', message);
      setErrorMessage(message);
    }

    clearGeneration(seriesId);
  }, [clearGeneration, generationState, seriesId]);

  useEffect(() => {
    if (!pickerWordId || !selectionState) {
      setDictionaryWords([]);

      return;
    }

    let isActive = true;

    setIsDictionaryLoading(true);

    void localAppServices.browseVocabulary
      .execute({
        excludedWordIds: selectionState.episodeWordSet.wordIds,
        ...(dictionarySearch.trim() ? { search: dictionarySearch } : {}),
      })
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
  }, [dictionarySearch, pickerWordId, selectionState]);

  const replaceWord = async (wordId: string): Promise<void> => {
    if (!selectionState || replacingWordId || isShuffling) {
      return;
    }

    setReplacingWordId(wordId);
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
      setReplacingWordId(undefined);
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

  const chooseWord = async (replacementWordId: string): Promise<boolean> => {
    if (!selectionState || !pickerWordId) {
      return false;
    }

    setIsChoosing(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.chooseEpisodeStoryWord.execute({
        episodeWordSet: selectionState.episodeWordSet,
        replacementWordId,
        wordId: pickerWordId,
      });

      setSelectionState({
        ...selectionState,
        episodeWordSet: result.episodeWordSet,
        words: result.words,
      });

      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Selected dictionary word could not be used.',
      );

      return false;
    } finally {
      setIsChoosing(false);
    }
  };

  // closeDictionaryPicker clears picker-only state after its visual exit completes.
  const closeDictionaryPicker = useCallback((): void => {
    setPickerWordId(undefined);
    setDictionarySearch('');
  }, []);

  const generateEpisode = (): void => {
    if (!seriesId) {
      setErrorMessage('Open a series before generating an episode.');

      return;
    }

    if (!selectionState || !selectedCefrLevel || !selectedGenre) {
      setErrorMessage('Story Words must be loaded before generation.');

      return;
    }

    if (isGenerating) {
      return;
    }

    setErrorMessage(undefined);
    void requestEpisodeGeneration({
      cefrLevel: selectedCefrLevel,
      episodeWordSet: selectionState.episodeWordSet,
      genre: selectedGenre,
      seriesId,
    }).catch((): void => undefined);
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
        {...(generatedEpisodeOrderIndex
          ? { episodeOrderIndex: generatedEpisodeOrderIndex }
          : {})}
        {...(seriesId ? { seriesId } : {})}
        styles={styles}
        onExit={onExit}
      />
    );
  }

  return (
    <View style={styles.flexOne}>
      <PlatformBlurTargetView
        blurTargetRef={blurTargetRef}
        style={styles.flexOne}
      >
        {/* The parent must forward handled picker taps while dictionary search owns the keyboard. */}
        <Animated.ScrollView
          contentContainerStyle={[styles.screenContent, setupContentInsets]}
          keyboardShouldPersistTaps="handled"
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
          <EpisodeSettingsSelection
            isDark={isDark}
            selectedCefrLevel={selectedCefrLevel}
            selectedGenre={selectedGenre}
            styles={styles}
            onSelectCefrLevel={setSelectedCefrLevel}
            onSelectGenre={setSelectedGenre}
          />
          {pickerWordId ? (
            <DictionaryPickerPanel
              colors={colors}
              isChoosing={isChoosing}
              isLoading={isDictionaryLoading}
              reduceMotion={reduceMotion}
              search={dictionarySearch}
              styles={styles}
              targetWord={
                selectionState.words.find((word) => word.id === pickerWordId)
              }
              words={dictionaryWords}
              onChangeSearch={setDictionarySearch}
              onChooseWord={chooseWord}
              onClose={closeDictionaryPicker}
            />
          ) : (
            <StoryWordsPanel
              colors={colors}
              isShuffling={isShuffling}
              replacingWordId={replacingWordId}
              styles={styles}
              words={selectionState.words}
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
          <EpisodeGenerationButton
            isGenerating={isGenerating}
            isOnline={isOnline}
            styles={styles}
            onGenerateEpisode={() => {
              void generateEpisode();
            }}
          />
        </>
      )}
        </Animated.ScrollView>
      </PlatformBlurTargetView>
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

// EpisodeSettingsSelection renders the per-episode CEFR and genre controls.
function EpisodeSettingsSelection({
  isDark,
  selectedCefrLevel,
  selectedGenre,
  styles,
  onSelectCefrLevel,
  onSelectGenre,
}: {
  // isDark selects the same restrained setup material used by series creation.
  readonly isDark: boolean;
  // selectedCefrLevel is the language target remembered from settings or episode history.
  readonly selectedCefrLevel: CefrLevel | undefined;
  // selectedGenre is the locally selected story genre when present.
  readonly selectedGenre: LearningGenre | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectCefrLevel updates only the episode target and preserves explicit Story Words.
  readonly onSelectCefrLevel: (cefrLevel: CefrLevel) => void;
  // onSelectGenre stores the selected genre in screen state.
  readonly onSelectGenre: (genre: LearningGenre) => void;
}): ReactElement {
  return (
    <View style={styles.settingsCard}>
      {selectedCefrLevel ? (
        <CefrLevelSelector
          isDark={isDark}
          selectedLevel={selectedCefrLevel}
          styles={styles}
          onSelect={onSelectCefrLevel}
        />
      ) : null}
      <SeriesSetupChoiceGroup
        isDark={isDark}
        isWrapped
        label="Genre"
        labels={episodeGenreLabels}
        options={learningGenres}
        selected={selectedGenre}
        styles={styles}
        onSelect={onSelectGenre}
      />
    </View>
  );
}

// EpisodeGenerationButton keeps the final setup action concise and state-aware.
function EpisodeGenerationButton({
  isGenerating,
  isOnline,
  styles,
  onGenerateEpisode,
}: {
  // isGenerating prevents duplicate requests and announces in-progress work.
  readonly isGenerating: boolean;
  // isOnline tells whether server-backed generation could be attempted.
  readonly isOnline: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onGenerateEpisode calls the Supabase AI boundary through application use cases.
  readonly onGenerateEpisode: () => void;
}): ReactElement {
  // isDisabled keeps the action stable while offline or during the active request.
  const isDisabled: boolean = !isOnline || isGenerating;

  return (
    <JellyPressable
      accessibilityHint={
        isOnline
          ? 'Creates the next episode from the selected Story Words and genre'
          : 'Episode generation becomes available when the device is online'
      }
      accessibilityState={{
        busy: isGenerating,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      onPress={onGenerateEpisode}
      style={({ pressed }) => [
        styles.primaryButton,
        isDisabled && styles.disabledControl,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>
        {isGenerating
          ? 'Generating Episode...'
          : isOnline
            ? 'Generate Episode'
            : 'Available When Online'}
      </Text>
    </JellyPressable>
  );
}
