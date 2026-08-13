import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Alert,
  Animated,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkColors, lightColors } from '@presentation/theme';

import {
  PlatformBlurTargetView,
  screenEdgeDepths,
  useReducedMotionPreference,
} from '../shared';
import { useAppTheme } from '../theme';

import {
  type CefrLevel,
  type LearningGenre,
  type LearningPreferences,
  type VocabularyItem,
  type WordSet,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import { useEpisodeGeneration } from '../generation';
import { DictionaryPickerPanel } from './dailySession/components/DictionaryPickerPanel';
import { EpisodeSetupDetailsCard } from './dailySession/components/EpisodeSetupDetailsCard';
import {
  EpisodeSetupFlow,
  EpisodeSetupFooter,
  type EpisodeSetupStep,
} from './dailySession/components/EpisodeSetupFlow';
import { StoryWordsPanel } from './dailySession/components/StoryWordsPanel';
import { resolveEpisodeSetupDefaults } from './dailySession/episodeSetupOptions';
import { DailySessionEdgeEffects } from './DailySessionEdgeEffects';
import { EpisodeReaderScreen } from './EpisodeReaderScreen';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// episodeSetupFooterReservedDepth keeps the final scroll content above fixed actions.
const episodeSetupFooterReservedDepth: number = 116;

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
  // blurTargetRef preserves the shared edge-effect source contract around Story Words.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // setupContentInsets places the hero below top glass and clears the quiet lower fade.
  const setupContentInsets: ViewStyle = {
    paddingTop: insets.top + screenEdgeDepths.compactTop + 2,
    paddingBottom:
      insets.bottom +
      screenEdgeDepths.modalBottom +
      episodeSetupFooterReservedDepth,
  };
  const [stage, setStage] = useState<EpisodeFlowStage>('loading');
  const [selectionState, setSelectionState] =
    useState<EpisodeWordSelectionState>();
  const [selectedCefrLevel, setSelectedCefrLevel] = useState<CefrLevel>();
  const [selectedGenre, setSelectedGenre] = useState<LearningGenre>();
  // activeSetupStep keeps repeated episode preparation focused on one task.
  const [activeSetupStep, setActiveSetupStep] =
    useState<EpisodeSetupStep>('details');
  // furthestSetupStepIndex enables reversible navigation only after Continue.
  const [furthestSetupStepIndex, setFurthestSetupStepIndex] =
    useState<number>(0);
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
  const isGenerating: boolean = generationState?.kind === 'generating';
  const [generatedEpisodeOrderIndex, setGeneratedEpisodeOrderIndex] =
    useState<number>();
  const [isOnline, setIsOnline] = useState(false);
  // isEpisodeSetupBusy prevents navigation across an unresolved local or online write.
  const isEpisodeSetupBusy: boolean =
    isChoosing ||
    isShuffling ||
    replacingWordId !== undefined ||
    isGenerating;

  useEffect((): void => {
    // A different series always begins with its remembered episode direction.
    setActiveSetupStep('details');
    setFurthestSetupStepIndex(0);
  }, [seriesId]);

  useEffect((): void => {
    if (!isGenerating) {
      return;
    }

    // Restored generation requests reopen the exact step that owns their progress.
    setActiveSetupStep('words');
    setFurthestSetupStepIndex(1);
  }, [isGenerating]);

  const loadWordSelection = useCallback(async (isActive = true): Promise<void> => {
    setErrorMessage(undefined);

    try {
      const seriesDetails = seriesId
        ? await localAppServices.loadSeriesDetails.execute({ seriesId })
        : undefined;
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
    if (!selectionState || replacingWordId || isShuffling || isGenerating) {
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
    if (!selectionState || isShuffling || isGenerating) {
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
    if (!selectionState || !pickerWordId || isChoosing || isGenerating) {
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

  // openDictionaryPicker prevents a late tap from editing the immutable generation snapshot.
  const openDictionaryPicker = (wordId: string): void => {
    if (isEpisodeSetupBusy) {
      return;
    }

    setPickerWordId(wordId);
  };

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

  // showEpisodeSetupStep reopens a reached task without mutating later choices.
  const showEpisodeSetupStep = (step: EpisodeSetupStep): void => {
    if (isEpisodeSetupBusy) {
      return;
    }

    setActiveSetupStep(step);
  };

  // continueToStoryWords unlocks the second task while preserving episode direction.
  const continueToStoryWords = (): void => {
    setFurthestSetupStepIndex(1);
    setActiveSetupStep('words');
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
        >
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
        <EpisodeSetupFlow
          activeStep={activeSetupStep}
          cefrLevel={selectedCefrLevel}
          colors={colors}
          furthestIndex={furthestSetupStepIndex}
          genre={selectedGenre}
          isNavigationLocked={isEpisodeSetupBusy}
          onSelectStep={showEpisodeSetupStep}
        >
          {activeSetupStep === 'details' ? (
            <EpisodeSetupDetailsCard
              colors={colors}
              isDark={isDark}
              selectedCefrLevel={selectedCefrLevel}
              selectedGenre={selectedGenre}
              sharedStyles={styles}
              onSelectCefrLevel={setSelectedCefrLevel}
              onSelectGenre={setSelectedGenre}
            />
          ) : pickerWordId ? (
            <DictionaryPickerPanel
              colors={colors}
              isChoosing={isChoosing}
              isLocked={isGenerating}
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
              isLocked={isGenerating}
              isShuffling={isShuffling}
              replacingWordId={replacingWordId}
              styles={styles}
              words={selectionState.words}
              onPickWord={openDictionaryPicker}
              onReplaceWord={(wordId: string): void => {
                void replaceWord(wordId);
              }}
              onShuffleWords={(): void => {
                void shuffleWords();
              }}
            />
          )}
        </EpisodeSetupFlow>
      )}
        </Animated.ScrollView>
      </PlatformBlurTargetView>
      <DailySessionEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        colors={colors}
        isDark={isDark}
        title="Create an episode"
        topInset={insets.top}
        onExit={onExit}
      />
      {stage === 'setup' && selectionState && !pickerWordId ? (
        <EpisodeSetupFooter
          activeStep={activeSetupStep}
          bottomInset={insets.bottom}
          colors={colors}
          isBusy={isEpisodeSetupBusy}
          isGenerating={isGenerating}
          isOnline={isOnline}
          onBack={(): void => setActiveSetupStep('details')}
          onContinue={continueToStoryWords}
          onGenerate={generateEpisode}
        />
      ) : null}
    </View>
  );
}
