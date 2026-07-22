import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Alert,
  Animated,
  Easing,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors } from '@presentation/theme';

import {
  BackIconButton,
  JellyPressable,
  PlatformBlurTargetView,
  screenEdgeDepths,
} from '../shared';
import { useAppTheme } from '../theme';

import type {
  Episode,
  EpisodeSentenceFrame,
  EpisodeInteraction,
  TranslationAnnotation,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  EpisodeSentence,
  ExcerptTranslationSheet,
  SelectableReaderText,
  SelectionActionBar,
  StoryContinuationPrelude,
  TranslationSheet,
} from './episodeReader/components';
import {
  createSelectionOwnerKey,
  shouldDismissReaderSelectionForScroll,
  type EpisodeSelectionRange,
} from './episodeReader/episodeExcerptSelection';
import {
  useEpisodeExcerptTranslation,
  type EpisodeExcerptTranslationController,
} from './episodeReader/useEpisodeExcerptTranslation';
import {
  useStoryWordSheet,
  type StoryWordSheetController,
} from './episodeReader/useStoryWordSheet';
import { EpisodeReaderEdgeEffects } from './EpisodeReaderEdgeEffects';
import {
  getFocusedEpisodeHeaderIndex,
  type EpisodeHeaderGeometry,
} from './EpisodeReaderEdgeEffects/episodeReaderHeaderMotion';
import { shouldRenderSettledEpisodeAnswer } from './episodeReader/episodeInteractionPresentation';
import { findPendingEpisodeContinuation } from './episodeReader/episodeReaderContinuationResume';
import type { PendingEpisodeContinuation } from './episodeReader/episodeReaderContinuationResume';
import { submitInteractionWithSilentRetry } from './episodeReader/interactionRequestPolicy';
import type { SpeakerThemeName } from './episodeReader/components/EpisodeSentence/EpisodeSentence';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// SPEAKER_THEME_ORDER assigns distinct dialogue accents by first encounter.
const SPEAKER_THEME_ORDER: readonly SpeakerThemeName[] = [
  'blue',
  'orange',
  'purple',
  'pink',
  'teal',
] as const;

// CONTINUATION_MINIMUM_LATENCY_MS keeps the inline shimmer visible during fast responses.
const CONTINUATION_MINIMUM_LATENCY_MS = 1500;

// GENERATED_CONTENT_TOP_GAP keeps the first new story beat below the compact Reader edge.
const GENERATED_CONTENT_TOP_GAP: number = 16;

// readerHeaderCollapseOffset matches Home's deliberate upward-scroll threshold.
const readerHeaderCollapseOffset: number = 38;
// readerHeaderExpandOffset matches Home's hysteresis against tiny scroll reversals.
const readerHeaderExpandOffset: number = 12;
// readerTitleTransitionDuration keeps the large-to-compact title swap identical to Home.
const readerTitleTransitionDuration: number = 220;
// readerMaterialTransitionDuration fades top material without a directional reveal.
const readerMaterialTransitionDuration: number = 180;

// EpisodeReaderScreenProps carries route input and series reader behavior.
type EpisodeReaderScreenProps = {
  // episodeOrderIndex loads only the selected visible episode when present.
  readonly episodeOrderIndex?: number;
  // seriesId loads the complete locally persisted episode sequence.
  readonly seriesId?: string;
  // isReadOnly prevents completed history from changing saved story outcomes.
  readonly isReadOnly?: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onExit returns to the owning series or stories list.
  readonly onExit?: () => void;
};

// EpisodeReaderScreen renders saved story beats and decisions in episode order.
export function EpisodeReaderScreen({
  episodeOrderIndex,
  isReadOnly = false,
  onExit,
  seriesId,
  styles,
}: EpisodeReaderScreenProps): ReactElement {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  // titleTransition drives only the autonomous large-to-compact metadata swap.
  const [titleTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // materialTransition controls only the top blur-and-gradient opacity.
  const [materialTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [episodes, setEpisodes] = useState<readonly Episode[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [interactionErrorMessage, setInteractionErrorMessage] =
    useState<string>();
  const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);
  // excerptTranslation owns the ephemeral native selection and AI request lifecycle.
  const excerptTranslation: EpisodeExcerptTranslationController =
    useEpisodeExcerptTranslation();
  // storyWordSheet owns one-tap Story Word details and offline dictionary enrichment.
  const storyWordSheet: StoryWordSheetController = useStoryWordSheet();
  const scrollViewRef = useRef<ScrollView>(null);
  // readerDragStartOffsetRef distinguishes real scrolling from a selection micro-drag.
  const readerDragStartOffsetRef: RefObject<number | undefined> =
    useRef<number | undefined>(undefined);
  // componentMountedRef prevents background continuation work from updating an exited reader.
  const componentMountedRef: RefObject<boolean> = useRef<boolean>(false);
  // resumedInteractionKeysRef limits automatic retry to one attempt per reader mount.
  const resumedInteractionKeysRef: RefObject<Set<string>> = useRef<Set<string>>(
    new Set<string>(),
  );
  // blurTargetRef preserves the shared edge-effect source contract around Reader content.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // episodeBlockTopsRef stores each full-series episode origin in scroll-content coordinates.
  const episodeBlockTopsRef: RefObject<Map<string, number>> = useRef<
    Map<string, number>
  >(new Map<string, number>());
  // episodeHeadingHeightsRef stores the complete badge-and-title height for each episode.
  const episodeHeadingHeightsRef: RefObject<Map<string, number>> = useRef<
    Map<string, number>
  >(new Map<string, number>());
  // readerStoryTopsRef stores each story container origin inside its episode block.
  const readerStoryTopsRef: RefObject<Map<string, number>> = useRef<
    Map<string, number>
  >(new Map<string, number>());
  // pendingGeneratedSentenceScrollRef identifies the first new sentence to reveal once laid out.
  const pendingGeneratedSentenceScrollRef: RefObject<
    GeneratedSentenceScrollTarget | undefined
  > = useRef<GeneratedSentenceScrollTarget | undefined>(undefined);
  // pendingContinuationScrollRef arms one scroll after a restored loading state is laid out.
  const pendingContinuationScrollRef: RefObject<string | undefined> = useRef<
    string | undefined
  >(undefined);
  // readerContentInsets reserves only the compact Reader fades to maximize the visible text workspace.
  const readerContentInsets: ViewStyle = {
    paddingTop: insets.top + screenEdgeDepths.readerTop + 2,
    paddingBottom: insets.bottom + screenEdgeDepths.modalBottom + 16,
  };
  // readerStateInsets keeps pre-content states clear of system areas on the edge-to-edge route.
  const readerStateInsets: ViewStyle = {
    paddingTop: insets.top + 20,
    paddingBottom: insets.bottom + 20,
  };
  // largeTitleOpacity removes large metadata before the compact peer reaches full opacity.
  const largeTitleOpacity: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.18, 0.58, 1],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });
  // largeTitleTranslateY lets the large metadata leave with the reading content.
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

  const activeEpisode = episodes[activeEpisodeIndex];
  // backButton keeps reader navigation identical across loading, error, and content states.
  const backButton: ReactElement | null = onExit ? (
    <BackIconButton
      accessibilityHint="Returns to the series screen"
      accessibilityLabel="Back to series"
      colors={colors}
      onPress={onExit}
    />
  ) : null;

  useEffect((): (() => void) => {
    componentMountedRef.current = true;

    return (): void => {
      componentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reader uses the same autonomous title timing after scroll selects the target state.
    const titleAnimation: Animated.CompositeAnimation = Animated.timing(
      titleTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: readerTitleTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );
    // Material appears with a short opacity-only fade shared by Home and Settings.
    const materialAnimation: Animated.CompositeAnimation = Animated.timing(
      materialTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: readerMaterialTransitionDuration,
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

  const loadReader = useCallback(async (): Promise<void> => {
    try {
      if (seriesId && episodeOrderIndex) {
        const result = await localAppServices.loadEpisodeReader.execute({
          orderIndex: episodeOrderIndex,
          seriesId,
        });

        setEpisodes([result.episode]);
        setActiveEpisodeIndex(0);
        setErrorMessage(undefined);

        return;
      }

      if (seriesId) {
        const details = await localAppServices.loadSeriesDetails.execute({
          seriesId,
        });

        if (details.episodes.length > 0) {
          setEpisodes(details.episodes);
          setActiveEpisodeIndex(0);
          setErrorMessage(undefined);

          return;
        }
      }

      throw new Error('Reader target was not found.');
    } catch {
      setErrorMessage('Series reader could not load local episodes.');
    }
  }, [episodeOrderIndex, seriesId]);

  useEffect(() => {
    void loadReader();
  }, [loadReader]);

  // handleInteractionError presents only a final handled state after silent retry exhaustion.
  const handleInteractionError = useCallback(
    (error: unknown): void => {
      if (!componentMountedRef.current) {
        return;
      }

      const isModerationError: boolean =
        error instanceof SupabaseFunctionError &&
        (error.kind === 'moderation_warning' || error.kind === 'moderation_banned');
      const message: string =
        error instanceof Error
          ? error.message
          : 'Story interaction is online-only and requires configured Supabase Edge Functions.';

      if (isModerationError && error instanceof SupabaseFunctionError) {
        Alert.alert(
          error.kind === 'moderation_banned' ? 'You are banned' : 'Warning',
          message,
        );
        return;
      }

      setInteractionErrorMessage(
        `${message} Your answer is saved and can continue when the service recovers.`,
      );
    },
    [],
  );

  useEffect((): void => {
    if (isSubmittingInteraction) {
      return;
    }

    const pendingContinuation: PendingEpisodeContinuation | undefined =
      findPendingEpisodeContinuation(episodes);

    if (!pendingContinuation) {
      return;
    }

    const operationKey: string = `${pendingContinuation.episodeId}:${pendingContinuation.interactionId}`;

    if (resumedInteractionKeysRef.current.has(operationKey)) {
      return;
    }

    resumedInteractionKeysRef.current.add(operationKey);
    pendingContinuationScrollRef.current = operationKey;
    setInteractionErrorMessage(undefined);
    setIsSubmittingInteraction(true);

    // resumePendingContinuation rejoins the original request or retries its durable local draft.
    const resumePendingContinuation = async (): Promise<void> => {
      const startedAt: number = Date.now();
      // previousSentenceCount marks where the resumed AI continuation will begin.
      const previousSentenceCount: number =
        episodes.find(
          (episode: Episode): boolean =>
            episode.id === pendingContinuation.episodeId,
        )?.sentences.length ?? 0;

      try {
        const result = await submitInteractionWithSilentRetry(() =>
          localAppServices.submitEpisodeInteraction.execute({
            episodeId: pendingContinuation.episodeId,
            interactionId: pendingContinuation.interactionId,
            ...(pendingContinuation.choiceId
              ? { choiceId: pendingContinuation.choiceId }
              : {}),
            ...(pendingContinuation.userReply
              ? { userReply: pendingContinuation.userReply }
              : {}),
          })
        );
        await waitForRemainingLatency(startedAt);

        if (!componentMountedRef.current) {
          return;
        }

        requestScrollToGeneratedContent(
          result.episode,
          previousSentenceCount,
        );
        setEpisodes((currentEpisodes: readonly Episode[]): readonly Episode[] =>
          currentEpisodes.map((episode: Episode): Episode =>
            episode.id === pendingContinuation.episodeId
              ? result.episode
              : episode,
          ),
        );
        setInteractionErrorMessage(undefined);
      } catch (error) {
        handleInteractionError(error);
      } finally {
        if (componentMountedRef.current) {
          if (pendingContinuationScrollRef.current === operationKey) {
            pendingContinuationScrollRef.current = undefined;
          }

          setIsSubmittingInteraction(false);
        }
      }
    };

    void resumePendingContinuation();
  }, [episodes, handleInteractionError, isSubmittingInteraction]);

  const submitChoice = async (
    targetEpisodeIndex: number,
    interactionId: string,
    choiceId: string,
  ): Promise<void> => {
    // Answer the episode that owns the tapped interaction, not a fixed active
    // index — in "Read Full Series" all episodes are loaded and the pending
    // turn lives in the last one. An unfinished episode stays answerable so an
    // interrupted series can resume from any reader entry point.
    const targetEpisode = episodes[targetEpisodeIndex];

    if (!targetEpisode || targetEpisode.isComplete) {
      return;
    }

    const selectedChoice = targetEpisode.interactions
      .find((interaction) => interaction.id === interactionId)
      ?.choices.find((choice) => choice.id === choiceId);
    const submittedText = cleanSelectedReply(selectedChoice?.label);
    const startedAt = Date.now();
    // operationKey prevents the restoration effect from adding an unbounded third attempt.
    const operationKey: string = `${targetEpisode.id}:${interactionId}`;

    resumedInteractionKeysRef.current.add(operationKey);
    setIsSubmittingInteraction(true);
    setEpisodes((currentEpisodes) =>
      applyOptimisticChoice({
        activeEpisodeIndex: targetEpisodeIndex,
        choiceId,
        currentEpisodes,
        interactionId,
        submittedText,
      }),
    );

    try {
      const result = await submitInteractionWithSilentRetry(() =>
        localAppServices.submitEpisodeInteraction.execute({
          choiceId,
          episodeId: targetEpisode.id,
          interactionId,
        })
      );
      await waitForRemainingLatency(startedAt);

      if (!componentMountedRef.current) {
        return;
      }

      requestScrollToGeneratedContent(
        result.episode,
        targetEpisode.sentences.length,
      );
      setEpisodes((currentEpisodes: readonly Episode[]): readonly Episode[] =>
        currentEpisodes.map(
          (episode: Episode, episodeIndex: number): Episode =>
            episodeIndex === targetEpisodeIndex ? result.episode : episode,
        ),
      );
      setInteractionErrorMessage(undefined);
    } catch (error) {
      handleInteractionError(error);
    } finally {
      if (componentMountedRef.current) {
        setIsSubmittingInteraction(false);
      }
    }
  };

  const handleReaderScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const offsetY: number = event.nativeEvent.contentOffset.y;
    const dragStartOffset: number | undefined =
      readerDragStartOffsetRef.current;

    if (
      excerptTranslation.selection &&
      dragStartOffset !== undefined &&
      shouldDismissReaderSelectionForScroll(dragStartOffset, offsetY)
    ) {
      readerDragStartOffsetRef.current = undefined;
      excerptTranslation.clear();
    }

    if (episodes.length > 1) {
      // measuredHeaders excludes incomplete layout pairs until both values are available.
      const measuredHeaders: EpisodeHeaderGeometry[] = episodes.flatMap(
        (episode: Episode, index: number): EpisodeHeaderGeometry[] => {
          const top: number | undefined = episodeBlockTopsRef.current.get(
            episode.id,
          );
          const height: number | undefined =
            episodeHeadingHeightsRef.current.get(episode.id);

          return top === undefined || height === undefined
            ? []
            : [{ height, index, top }];
        },
      );
      const focusedEpisodeIndex: number | undefined =
        getFocusedEpisodeHeaderIndex({
          blurBottom: insets.top + screenEdgeDepths.readerTop,
          headers: measuredHeaders,
          scrollOffset: offsetY,
        });

      if (focusedEpisodeIndex === undefined) {
        if (isHeaderCollapsed) {
          setIsHeaderCollapsed(false);
        }
        return;
      }

      if (focusedEpisodeIndex !== activeEpisodeIndex) {
        setActiveEpisodeIndex(focusedEpisodeIndex);
      }
      if (!isHeaderCollapsed) {
        setIsHeaderCollapsed(true);
      }
      return;
    }

    if (!isHeaderCollapsed && offsetY >= readerHeaderCollapseOffset) {
      setIsHeaderCollapsed(true);
      return;
    }

    if (isHeaderCollapsed && offsetY <= readerHeaderExpandOffset) {
      setIsHeaderCollapsed(false);
    }
  };

  // handleReaderScrollBeginDrag records position without clearing a possible native selection.
  const handleReaderScrollBeginDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    readerDragStartOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  // handleReaderScrollEndDrag releases scroll tracking after a stationary selection gesture.
  const handleReaderScrollEndDrag = (): void => {
    readerDragStartOffsetRef.current = undefined;
  };

  // handleAnnotationPress preserves the existing one-tap Story Word translation path.
  const handleAnnotationPress = (annotation: TranslationAnnotation): void => {
    excerptTranslation.clear();
    storyWordSheet.open(annotation);
  };

  // handleEpisodeBlockLayout records an episode origin relative to the Reader content container.
  const handleEpisodeBlockLayout = (
    episodeIdValue: string,
    event: LayoutChangeEvent,
  ): void => {
    episodeBlockTopsRef.current.set(
      episodeIdValue,
      event.nativeEvent.layout.y,
    );
  };

  // handleEpisodeHeadingLayout records the full badge-and-title height used by the blur boundary.
  const handleEpisodeHeadingLayout = (
    episodeIdValue: string,
    event: LayoutChangeEvent,
  ): void => {
    episodeHeadingHeightsRef.current.set(
      episodeIdValue,
      event.nativeEvent.layout.height,
    );
  };

  // handleReaderStoryLayout records the story origin needed to resolve sentence coordinates.
  const handleReaderStoryLayout = (
    episodeIdValue: string,
    event: LayoutChangeEvent,
  ): void => {
    readerStoryTopsRef.current.set(
      episodeIdValue,
      event.nativeEvent.layout.y,
    );
  };

  // handleSentenceLayout reveals only the first sentence appended by the latest AI response.
  const handleSentenceLayout = (
    episodeIdValue: string,
    sentenceIndex: number,
    event: LayoutChangeEvent,
  ): void => {
    const target: GeneratedSentenceScrollTarget | undefined =
      pendingGeneratedSentenceScrollRef.current;

    if (
      !target ||
      target.episodeId !== episodeIdValue ||
      target.sentenceIndex !== sentenceIndex
    ) {
      return;
    }

    const episodeTop: number | undefined =
      episodeBlockTopsRef.current.get(episodeIdValue);
    const storyTop: number | undefined =
      readerStoryTopsRef.current.get(episodeIdValue);

    if (episodeTop === undefined || storyTop === undefined) {
      return;
    }

    // targetOffset places generated prose below the persistent top edge instead of at the list end.
    const targetOffset: number = Math.max(
      0,
      episodeTop +
        storyTop +
        event.nativeEvent.layout.y -
        (insets.top + screenEdgeDepths.readerTop + GENERATED_CONTENT_TOP_GAP),
    );
    pendingGeneratedSentenceScrollRef.current = undefined;

    requestAnimationFrame((): void => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: targetOffset,
      });
    });
  };

  // handlePendingContinuationLayout reveals a restored loading state once its height exists.
  const handlePendingContinuationLayout = (
    operationKey: string,
  ): void => {
    if (pendingContinuationScrollRef.current !== operationKey) {
      return;
    }

    pendingContinuationScrollRef.current = undefined;

    requestAnimationFrame((): void => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  };

  if (errorMessage) {
    return (
      <View style={[styles.screenContent, readerStateInsets]}>
        {backButton}
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!activeEpisode) {
    return (
      <View style={[styles.screenContent, readerStateInsets]}>
        {backButton}
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>Loading series...</Text>
        </View>
      </View>
    );
  }

  // isSingleEpisode limits header metadata to focused episode reading.
  const isSingleEpisode: boolean = episodes.length === 1;

  return (
    <View style={styles.flexOne}>
      <PlatformBlurTargetView
        blurTargetRef={blurTargetRef}
        style={styles.flexOne}
      >
        <Animated.ScrollView
          canCancelContentTouches
          contentContainerStyle={[styles.readerContent, readerContentInsets]}
          onScroll={handleReaderScroll}
          onScrollBeginDrag={handleReaderScrollBeginDrag}
          onScrollEndDrag={handleReaderScrollEndDrag}
          onTouchStart={excerptTranslation.clearForReaderTouchStart}
          ref={scrollViewRef}
          scrollEventThrottle={16}
        >
          {isSingleEpisode ? (
            <Animated.View
              style={{
                opacity: largeTitleOpacity,
                transform: [
                  { translateY: largeTitleTranslateY },
                  { scale: largeTitleScale },
                ],
              }}
            >
              <View style={styles.readerTitleBlock}>
                <Text style={styles.appCategory}>
                  EPISODE {activeEpisode.orderIndex}
                </Text>
                <Text style={styles.largeTitle}>
                  {activeEpisode.title ?? 'Untitled Episode'}
                </Text>
              </View>
            </Animated.View>
          ) : null}

          {interactionErrorMessage ? (
            <View style={styles.stateMessage}>
              <Text style={styles.stateMessageTitle}>
                {interactionErrorMessage}
              </Text>
            </View>
          ) : null}

          {episodes.map((episode, episodeIndex) => {
          const isLastEpisode = episodeIndex === episodes.length - 1;
          const pendingInteraction = [...episode.interactions]
            .reverse()
            .find((interaction) => interaction.feedback === undefined);
          const renderedFrames = buildReaderSentenceFrames(
            episode.sentenceFrames,
          );
          const speakerThemes = buildSpeakerThemes(renderedFrames);
          // completionText is the exact visible epilogue copy available for translation.
          const completionText: string =
            episode.cliffhanger ??
            'This episode is complete. The series can continue.';
          // completionOwnerKey keeps the epilogue range independent from story sentences.
          const completionOwnerKey: string = createSelectionOwnerKey(
            episode.id,
            'complete',
          );

          return (
            <View
              key={episode.id}
              style={styles.readerEpisodeBlock}
              onLayout={(event: LayoutChangeEvent): void =>
                handleEpisodeBlockLayout(episode.id, event)
              }
            >
              {!isSingleEpisode ? (
                <View
                  style={styles.readerEpisodeHeading}
                  onLayout={(event: LayoutChangeEvent): void =>
                    handleEpisodeHeadingLayout(episode.id, event)
                  }
                >
                  <Text style={styles.readerEpisodeBadge}>
                    EPISODE {episode.orderIndex}
                  </Text>
                  <Text style={styles.readerEpisodeTitle}>
                    {episode.title ?? 'Untitled Episode'}
                  </Text>
                </View>
              ) : null}

              <View
                style={styles.readerStory}
                onLayout={(event: LayoutChangeEvent): void =>
                  handleReaderStoryLayout(episode.id, event)
                }
              >
                {episode.sentences.map((_sentence, sentenceIndex) => {
                  const sentenceEndIndex = sentenceIndex + 1;
                  const interactionsAtBoundary = episode.interactions.filter(
                    (interaction) =>
                      interaction.sentenceEndIndex === sentenceEndIndex,
                  );
                  const sentenceFrame =
                    renderedFrames[sentenceIndex] ??
                    episode.sentenceFrames[sentenceIndex]!;
                  const speakerThemeName =
                    sentenceFrame.kind === 'dialogue'
                      ? speakerThemes.get(
                          normalizeSpeakerName(sentenceFrame.speaker),
                        )
                      : undefined;
                  // sentenceSelectionOwnerKey keeps native selection scoped to this story unit.
                  const sentenceSelectionOwnerKey: string =
                    createSelectionOwnerKey(
                      episode.id,
                      `sentence:${sentenceIndex}`,
                    );

                  return (
                    <View
                      key={`${episode.id}:${sentenceIndex}`}
                      onLayout={(event: LayoutChangeEvent): void =>
                        handleSentenceLayout(episode.id, sentenceIndex, event)
                      }
                    >
                      <EpisodeSentence
                        annotations={episode.annotations}
                        isActive={false}
                        isDimmed={false}
                        isSelectionOwner={
                          excerptTranslation.isSelectionOwner(
                            sentenceSelectionOwnerKey,
                          )
                        }
                        sentenceFrame={sentenceFrame}
                        sentenceIndex={sentenceIndex}
                        {...(speakerThemeName ? { speakerThemeName } : {})}
                        styles={styles}
                        onPressAnnotation={handleAnnotationPress}
                        onSelectionOwnerTouchStart={
                          excerptTranslation.markSelectionOwnerTouchStart
                        }
                        onSelectExcerpt={(
                          range: EpisodeSelectionRange | undefined,
                        ): void => {
                          storyWordSheet.close();
                          excerptTranslation.selectRange(
                            sentenceSelectionOwnerKey,
                            sentenceFrame.text,
                            range,
                          );
                        }}
                      />
                      {interactionsAtBoundary.map((interaction) => (
                        <EpisodeInteractionBlock
                          canAnswer={
                            isLastEpisode &&
                            !episode.isComplete &&
                            pendingInteraction?.id === interaction.id
                          }
                          interaction={interaction}
                          excerptTranslation={excerptTranslation}
                          isReadOnly={isReadOnly}
                          isSubmitting={isSubmittingInteraction}
                          key={interaction.id}
                          styles={styles}
                          onGeneratingLayout={(): void =>
                            handlePendingContinuationLayout(
                              `${episode.id}:${interaction.id}`,
                            )
                          }
                          onSelectChoice={(choiceId) => {
                            excerptTranslation.clear();
                            void submitChoice(
                              episodeIndex,
                              interaction.id,
                              choiceId,
                            );
                          }}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>

              {episode.isComplete ? (
                <View style={styles.readerComplete}>
                  <Text style={styles.sectionLabel}>EPISODE COMPLETE</Text>
                  <SelectableReaderText
                    isSelectionOwner={
                      excerptTranslation.isSelectionOwner(completionOwnerKey)
                    }
                    text={completionText}
                    textStyle={styles.secondaryText}
                    onSelectionOwnerTouchStart={
                      excerptTranslation.markSelectionOwnerTouchStart
                    }
                    onSelectionChange={(
                      range: EpisodeSelectionRange | undefined,
                    ): void => {
                      storyWordSheet.close();
                      excerptTranslation.selectRange(
                        completionOwnerKey,
                        completionText,
                        range,
                      );
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
          })}
        </Animated.ScrollView>
      </PlatformBlurTargetView>
      <EpisodeReaderEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        colors={colors}
        episodeNumber={activeEpisode.orderIndex}
        isDark={isDark}
        materialOpacity={materialTransition}
        topInset={insets.top}
        transitionProgress={titleTransition}
        title={activeEpisode.title ?? 'Untitled Episode'}
        {...(onExit ? { onExit } : {})}
      />

      <SelectionActionBar
        bottomInset={insets.bottom}
        colors={colors}
        isTranslating={excerptTranslation.isTranslating}
        isVisible={Boolean(
          excerptTranslation.selection && !excerptTranslation.result,
        )}
        onTranslate={(): void => {
          void excerptTranslation.translate();
        }}
      />

      <TranslationSheet
        details={storyWordSheet.details}
        onClose={storyWordSheet.close}
      />
      <ExcerptTranslationSheet
        result={excerptTranslation.result}
        onClose={excerptTranslation.clearResult}
      />
    </View>
  );

  // requestScrollToGeneratedContent arms one layout-driven scroll when new prose exists.
  function requestScrollToGeneratedContent(
    updatedEpisode: Episode,
    previousSentenceCount: number,
  ): void {
    if (updatedEpisode.sentences.length <= previousSentenceCount) {
      pendingGeneratedSentenceScrollRef.current = undefined;
      return;
    }

    pendingGeneratedSentenceScrollRef.current = {
      episodeId: updatedEpisode.id,
      sentenceIndex: previousSentenceCount,
    };
  }
}

// GeneratedSentenceScrollTarget points to the first sentence introduced by one continuation.
type GeneratedSentenceScrollTarget = {
  // episodeId scopes the target inside full-series reading mode.
  readonly episodeId: string;
  // sentenceIndex is the first index absent from the pre-request episode snapshot.
  readonly sentenceIndex: number;
};

// ReaderSentenceFrame stores the display-safe frame after speaker inheritance.
type ReaderSentenceFrame = EpisodeSentenceFrame;

// buildReaderSentenceFrames applies speaker inheritance for underspecified dialogue.
function buildReaderSentenceFrames(
  frames: readonly EpisodeSentenceFrame[],
): readonly ReaderSentenceFrame[] {
  let lastSpeaker: string | undefined;

  return frames.map((frame) => {
    if (frame.kind === 'narration') {
      return frame;
    }

    const speaker = shouldInheritSpeaker(frame.speaker)
      ? lastSpeaker ?? frame.speaker
      : frame.speaker;

    lastSpeaker = speaker;

    return {
      ...frame,
      speaker,
    };
  });
}

// buildSpeakerThemes assigns each encountered speaker a stable visual accent.
function buildSpeakerThemes(
  frames: readonly ReaderSentenceFrame[],
): ReadonlyMap<string, SpeakerThemeName> {
  const themes = new Map<string, SpeakerThemeName>();

  frames.forEach((frame) => {
    if (frame.kind !== 'dialogue') {
      return;
    }

    const speakerKey = normalizeSpeakerName(frame.speaker);

    if (themes.has(speakerKey)) {
      return;
    }

    const themeName =
      SPEAKER_THEME_ORDER[themes.size % SPEAKER_THEME_ORDER.length] ?? 'blue';

    themes.set(speakerKey, themeName);
  });

  return themes;
}

// shouldInheritSpeaker treats generic speaker labels as missing speaker metadata.
function shouldInheritSpeaker(speaker: string): boolean {
  return /^(speaker|unknown|stranger|voice)$/i.test(speaker.trim());
}

// normalizeSpeakerName makes speaker matching resilient to casing and spacing.
function normalizeSpeakerName(speaker: string): string {
  return speaker.trim().toLocaleLowerCase();
}

// cleanSelectedReply removes quote marks that should not appear in answer bubbles.
function cleanSelectedReply(reply: string | undefined): string {
  return reply?.replace(/["“”]/g, '').trim() ?? '';
}

// waitForRemainingLatency keeps the compact shimmer from flashing too quickly.
async function waitForRemainingLatency(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = CONTINUATION_MINIMUM_LATENCY_MS - elapsed;

  if (remaining <= 0) {
    return;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

// applyOptimisticChoice inserts the learner answer before the network response.
function applyOptimisticChoice({
  activeEpisodeIndex,
  choiceId,
  currentEpisodes,
  interactionId,
  submittedText,
}: {
  // activeEpisodeIndex identifies the locally visible episode to update.
  readonly activeEpisodeIndex: number;
  // choiceId stores the chosen option while continuation is pending.
  readonly choiceId: string;
  // currentEpisodes is the current immutable reader state.
  readonly currentEpisodes: readonly Episode[];
  // interactionId identifies the active turn being answered.
  readonly interactionId: string;
  // submittedText is the visible answer after quote stripping.
  readonly submittedText: string;
}): readonly Episode[] {
  return currentEpisodes.map((episode, episodeIndex) => {
    if (episodeIndex !== activeEpisodeIndex) {
      return episode;
    }

    return {
      ...episode,
      interactions: episode.interactions.map((interaction) =>
        interaction.id === interactionId
          ? {
              ...interaction,
              selectedChoiceId: choiceId,
              ...(submittedText ? { userReply: submittedText } : {}),
            }
          : interaction,
      ),
    };
  });
}

// EpisodeInteractionBlock chooses read-only, answered, or active interaction UI.
function EpisodeInteractionBlock({
  canAnswer,
  excerptTranslation,
  interaction,
  isReadOnly,
  isSubmitting,
  onGeneratingLayout,
  onSelectChoice,
  styles,
}: {
  // canAnswer permits only the latest pending turn in the current episode.
  readonly canAnswer: boolean;
  // excerptTranslation owns selectable prompt, answer, and feedback copy.
  readonly excerptTranslation: EpisodeExcerptTranslationController;
  // interaction is one ordered decision inside the episode timeline.
  readonly interaction: EpisodeInteraction;
  // isReadOnly prevents historical episodes from becoming interactive.
  readonly isReadOnly: boolean;
  // isSubmitting disables duplicate network requests.
  readonly isSubmitting: boolean;
  // onGeneratingLayout reveals a restored pending continuation after layout.
  readonly onGeneratingLayout: () => void;
  // onSelectChoice submits the selected controlled outcome.
  readonly onSelectChoice: (choiceId: string) => void;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement | null {
  const savedChoice = interaction.choices.find(
    (choice) => choice.id === interaction.selectedChoiceId,
  );
  const hasSavedAnswer =
    savedChoice !== undefined || interaction.userReply !== undefined;

  if (
    shouldRenderSettledEpisodeAnswer({
      hasFeedback: interaction.feedback !== undefined,
      hasSavedAnswer,
      isReadOnly,
      isSubmitting,
    })
  ) {
    return (
      <View style={styles.readerInteraction}>
        <SavedEpisodeAnswer
          excerptTranslation={excerptTranslation}
          interaction={interaction}
          isGenerating={false}
          onGeneratingLayout={onGeneratingLayout}
          savedChoiceLabel={savedChoice?.label}
          styles={styles}
        />
      </View>
    );
  }

  if (hasSavedAnswer) {
    return (
      <View style={styles.readerInteraction}>
        <SavedEpisodeAnswer
          excerptTranslation={excerptTranslation}
          interaction={interaction}
          isGenerating={isSubmitting}
          onGeneratingLayout={onGeneratingLayout}
          savedChoiceLabel={savedChoice?.label}
          styles={styles}
        />
      </View>
    );
  }

  if (canAnswer) {
    return (
      <View style={styles.readerInteraction}>
        <EpisodeChoice
          excerptTranslation={excerptTranslation}
          interaction={interaction}
          isSubmitting={isSubmitting}
          styles={styles}
          onSelectChoice={onSelectChoice}
        />
      </View>
    );
  }

  return null;
}

// EpisodeChoice renders the active controlled decision inside the episode.
function EpisodeChoice({
  excerptTranslation,
  interaction,
  isSubmitting,
  styles,
  onSelectChoice,
}: {
  // excerptTranslation makes only the visible story prompt selectable.
  readonly excerptTranslation: EpisodeExcerptTranslationController;
  // interaction is the current unanswered story turn.
  readonly interaction: EpisodeInteraction;
  // isSubmitting disables duplicate local and remote writes.
  readonly isSubmitting: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectChoice persists one learner-controlled outcome.
  readonly onSelectChoice: (choiceId: string) => void;
}): ReactElement {
  // promptOwnerKey distinguishes choice copy from answer and feedback surfaces.
  const promptOwnerKey: string = createSelectionOwnerKey(
    interaction.id,
    'prompt',
  );

  return (
    <>
      <Text style={styles.sectionLabel}>STORY CHOICE</Text>
      <SelectableReaderText
        isSelectionOwner={
          excerptTranslation.isSelectionOwner(promptOwnerKey)
        }
        text={interaction.prompt}
        textStyle={styles.actionTitle}
        onSelectionOwnerTouchStart={
          excerptTranslation.markSelectionOwnerTouchStart
        }
        onSelectionChange={(
          range: EpisodeSelectionRange | undefined,
        ): void =>
          excerptTranslation.selectRange(
            promptOwnerKey,
            interaction.prompt,
            range,
          )
        }
      />
      <View style={styles.choiceRow}>
        {interaction.choices.map((choice) => {
          const isSelected = interaction.selectedChoiceId === choice.id;

          return (
            <JellyPressable
              disabled={isSubmitting}
              key={choice.id}
              onPress={() => onSelectChoice(choice.id)}
              style={({ pressed }) => [
                styles.readerChoice,
                isSelected && styles.readerChoiceSelected,
                isSubmitting && styles.disabledControl,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.readerChoiceText}>
                {isSubmitting && isSelected ? 'Continuing...' : choice.label}
              </Text>
            </JellyPressable>
          );
        })}
      </View>
    </>
  );
}

// SavedEpisodeAnswer renders one persisted answer and its language feedback.
function SavedEpisodeAnswer({
  excerptTranslation,
  interaction,
  isGenerating,
  onGeneratingLayout,
  savedChoiceLabel,
  styles,
}: {
  // excerptTranslation makes saved answer and feedback copy selectable.
  readonly excerptTranslation: EpisodeExcerptTranslationController;
  // interaction contains the persisted learner answer and feedback.
  readonly interaction: EpisodeInteraction;
  // isGenerating shows the inline next-scene prelude below the saved answer.
  readonly isGenerating: boolean;
  // onGeneratingLayout reports when the restored prelude can be scrolled into view.
  readonly onGeneratingLayout: () => void;
  // savedChoiceLabel resolves the selected choice id for display.
  readonly savedChoiceLabel: string | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  const answer = interaction.userReply ?? savedChoiceLabel;
  const savedChoice = interaction.choices.find(
    (choice) => choice.id === interaction.selectedChoiceId,
  );
  const isSpeechAnswer = savedChoice?.isSpeech !== false;
  // answerText is the exact visible answer copy translated from this block.
  const answerText: string = isSpeechAnswer
    ? cleanSelectedReply(answer) || 'No answer was saved.'
    : `You decided to: ${cleanSelectedReply(answer) || 'No action was saved.'}`;
  // feedbackText narrows optional feedback once for rendering and selection callbacks.
  const feedbackText: string | undefined = interaction.feedback;
  // answerOwnerKey keeps answer selection separate from feedback selection.
  const answerOwnerKey: string = createSelectionOwnerKey(
    interaction.id,
    'answer',
  );
  // feedbackOwnerKey scopes optional language feedback selection.
  const feedbackOwnerKey: string = createSelectionOwnerKey(
    interaction.id,
    'feedback',
  );

  return (
    <>
      <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
      {isSpeechAnswer ? (
        <View style={styles.readerSavedAnswer}>
          <SelectableReaderText
            isSelectionOwner={
              excerptTranslation.isSelectionOwner(answerOwnerKey)
            }
            text={answerText}
            textStyle={styles.readerSavedAnswerText}
            onSelectionOwnerTouchStart={
              excerptTranslation.markSelectionOwnerTouchStart
            }
            onSelectionChange={(
              range: EpisodeSelectionRange | undefined,
            ): void =>
              excerptTranslation.selectRange(
                answerOwnerKey,
                answerText,
                range,
              )
            }
          />
        </View>
      ) : (
        <View style={styles.readerNarrativeAnswer}>
          <SelectableReaderText
            isSelectionOwner={
              excerptTranslation.isSelectionOwner(answerOwnerKey)
            }
            text={answerText}
            textStyle={styles.readerNarrativeAnswerText}
            onSelectionOwnerTouchStart={
              excerptTranslation.markSelectionOwnerTouchStart
            }
            onSelectionChange={(
              range: EpisodeSelectionRange | undefined,
            ): void =>
              excerptTranslation.selectRange(
                answerOwnerKey,
                answerText,
                range,
              )
            }
          />
        </View>
      )}
      {isGenerating ? (
        <View onLayout={onGeneratingLayout}>
          <StoryContinuationPrelude />
        </View>
      ) : null}
      {feedbackText ? (
        <View style={styles.readerFeedback}>
          <Text style={styles.sectionLabel}>FEEDBACK</Text>
          <SelectableReaderText
            isSelectionOwner={
              excerptTranslation.isSelectionOwner(feedbackOwnerKey)
            }
            text={feedbackText}
            textStyle={styles.secondaryText}
            onSelectionOwnerTouchStart={
              excerptTranslation.markSelectionOwnerTouchStart
            }
            onSelectionChange={(
              range: EpisodeSelectionRange | undefined,
            ): void =>
              excerptTranslation.selectRange(
                feedbackOwnerKey,
                feedbackText,
                range,
              )
            }
          />
        </View>
      ) : null}
    </>
  );
}
