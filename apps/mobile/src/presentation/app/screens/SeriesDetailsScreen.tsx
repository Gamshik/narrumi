import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  Easing,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import {
  BackIconButton,
  BubbleStatus,
  BubbleSurface,
  JellyPressable,
  PlatformBlurTargetView,
  screenEdgeDepths,
} from '../shared';
import { useAppTheme } from '../theme';
import { lightColors, darkColors } from '@presentation/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  characterProfileNames,
  type Episode,
  type Series,
  type SeriesMemory,
} from '@domain/index';
import type {
  ConnectivityState,
  SeriesSetupGenerationTarget,
} from '@application/ports';
import type {
  GenerateSeriesSetupDraftInput,
  GenerateSeriesSetupDraftResult,
} from '@application/useCases';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  getSeriesTitleScrollThresholds,
  SeriesDetailsEdgeEffects,
  type SeriesTitleScrollThresholds,
} from './SeriesDetailsEdgeEffects';
import {
  applyTargetedSeriesSetupDraft,
  buildTargetedSeriesSetupDraftRequest,
} from './seriesSetupDraftRequest';
import { SeriesQuickActions } from './seriesDetails/components/SeriesQuickActions';
import { CreateSeriesFlow } from './home/components/CreateSeriesFlow';
import {
  createLocalSeriesSetupDraft,
  createSeriesSetupForm,
  createSeriesSetupFormFromDraft,
  validateSeriesSetupForm,
  type SeriesSetupFormErrors,
  type SeriesSetupFormState,
} from './seriesSetupForm';

// SeriesDetailsScreenProps carries route params and navigation callbacks.
type SeriesDetailsScreenProps = {
  // seriesId identifies the selected local story.
  readonly seriesId: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onBack returns to the stories list.
  readonly onBack: () => void;
  // onPrepareEpisode opens Story Words setup for this series.
  readonly onPrepareEpisode: (seriesId: string) => void;
  // onOpenEpisode reopens a saved episode in the reader.
  readonly onOpenEpisode: (episodeOrderIndex: number) => void;
  // onContinueEpisode reopens an unfinished episode in editable mode to resume it.
  readonly onContinueEpisode: (episodeOrderIndex: number) => void;
  // onReadSeries opens the complete saved series timeline.
  readonly onReadSeries: (seriesId: string) => void;
};

// SeriesDetailsState stores the local aggregate shown by the screen.
type SeriesDetailsState = {
  // series is the selected local story container.
  readonly series: Series;
  // episodes are saved local generated units.
  readonly episodes: readonly Episode[];
  // memory is compact continuity state when present.
  readonly memory?: SeriesMemory;
};

// seriesHeaderTransitionDuration keeps the compact navigation response quick and system-like.
const seriesHeaderTransitionDuration: number = 180;

// SeriesDetailsScreen shows one series, its memory, and completed episodes.
export function SeriesDetailsScreen({
  onBack,
  onContinueEpisode,
  onOpenEpisode,
  onPrepareEpisode,
  onReadSeries,
  seriesId,
  styles,
}: SeriesDetailsScreenProps): ReactElement {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  // headerTransition drives top material and compact title without changing the large in-flow title.
  const [headerTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [state, setState] = useState<SeriesDetailsState>();
  const [setupForm, setSetupForm] = useState<SeriesSetupFormState>();
  const [setupErrors, setSetupErrors] = useState<SeriesSetupFormErrors>({});
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  // generatingSetupTarget identifies the card that owns the current targeted AI request.
  const [generatingSetupTarget, setGeneratingSetupTarget] =
    useState<SeriesSetupGenerationTarget>();
  // isSetupOnline controls the online-only actions inside the shared setup flow.
  const [isSetupOnline, setIsSetupOnline] = useState<boolean>(false);
  // setupGenerationLockRef blocks rapid presses before React applies busy state.
  const setupGenerationLockRef = useRef<boolean>(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [setupActionError, setSetupActionError] = useState<string>();
  // blurTargetRef preserves the shared edge-effect source contract around series content.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // seriesHeaderTopRef stores the header position needed to resolve title edges in scroll coordinates.
  const seriesHeaderTopRef: RefObject<number | undefined> = useRef<
    number | undefined
  >(undefined);
  // seriesTitleTopRef stores the large title position inside its header.
  const seriesTitleTopRef: RefObject<number | undefined> = useRef<
    number | undefined
  >(undefined);
  // seriesTitleHeightRef stores the rendered height for one- and two-line names.
  const seriesTitleHeightRef: RefObject<number | undefined> = useRef<
    number | undefined
  >(undefined);
  // seriesContentInsets starts the hero below top glass and clears the quiet pushed-screen bottom fade.
  const seriesContentInsets: ViewStyle = {
    paddingTop: insets.top + screenEdgeDepths.compactTop + 2,
    paddingBottom: insets.bottom + screenEdgeDepths.modalBottom + 16,
  };
  // fallbackInsets retain safe spacing while loading and error states do not render edge materials.
  const fallbackInsets: ViewStyle = {
    paddingTop: insets.top + 20,
    paddingBottom: insets.bottom + 20,
  };

  useEffect(() => {
    // The gesture selects a stable header state; timing completes independently of finger position.
    const animation: Animated.CompositeAnimation = Animated.timing(
      headerTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: seriesHeaderTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );

    animation.start();

    return (): void => {
      animation.stop();
    };
  }, [headerTransition, isHeaderCollapsed]);

  const loadDetails = useCallback(async (): Promise<void> => {
    try {
      const details = await localAppServices.loadSeriesDetails.execute({ seriesId });

      setState(details);
      setSetupForm(createSeriesSetupForm(details.series));
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Series details could not be loaded.');
    }
  }, [seriesId]);

  // Reload on every focus so returning from the reader reflects a freshly
  // completed episode (banner switches from "Continue" to "Prepare next").
  useFocusEffect(
    useCallback(() => {
      void loadDetails();
    }, [loadDetails]),
  );

  const requestDeleteEpisode = (episode: Episode): void => {
    Alert.alert(
      'Delete episode?',
      `This removes Episode ${episode.orderIndex} from local history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteEpisode(episode.id);
          },
        },
      ],
    );
  };

  const deleteEpisode = async (episodeId: string): Promise<void> => {
    setDeletingEpisodeId(episodeId);
    setErrorMessage(undefined);

    try {
      await localAppServices.deleteEpisode.execute({ episodeId });
      await loadDetails();
    } catch {
      setErrorMessage('Episode could not be deleted.');
    } finally {
      setDeletingEpisodeId(undefined);
    }
  };

  const canEditSetup = (state?.episodes.length ?? 1) === 0;

  const saveSetup = async (): Promise<void> => {
    if (!setupForm || !state) {
      return;
    }

    const validationErrors = validateSeriesSetupForm(setupForm);
    const isComplete: boolean = Object.keys(validationErrors).length === 0;
    let isDraftSaved: boolean = false;

    setIsSavingSetup(true);
    setSetupActionError(undefined);

    try {
      await localAppServices.saveSeriesSetupDraft.execute(
        createLocalSeriesSetupDraft(
          setupForm,
          state.series.id,
          new Date().toISOString(),
          state.series.id,
        ),
      );
      isDraftSaved = true;

      if (!isComplete) {
        setIsSetupOpen(false);
        setSetupErrors({});
        setSetupForm(createSeriesSetupForm(state.series));
        return;
      }

      await localAppServices.updateSeriesSetup.execute({
        seriesId: state.series.id,
        title: setupForm.title,
        premise: setupForm.premise,
        participationMode: setupForm.participationMode,
        mainCharacters: characterProfileNames(setupForm.characterProfiles),
        characterProfiles: setupForm.characterProfiles,
        creativeBrief: setupForm.creativeBrief,
        setupDraftMeta: setupForm.setupDraftMeta,
        ...(setupForm.participationMode === 'character' &&
        setupForm.userRole.trim()
          ? { userRole: setupForm.userRole }
          : {}),
      });
      await localAppServices.deleteSeriesSetupDraft
        .execute({ draftId: state.series.id })
        .catch(() => undefined);
      setIsSetupOpen(false);
      setSetupErrors({});
      await loadDetails();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : 'Series setup could not be saved.';

      setSetupActionError(
        isDraftSaved ? `${message} Your draft is saved on this device.` : message,
      );
    } finally {
      setIsSavingSetup(false);
    }
  };

  // generateSetupField replaces only the field owned by the active setup card.
  const generateSetupField = async (
    target: SeriesSetupGenerationTarget,
  ): Promise<boolean> => {
    if (!setupForm) {
      return false;
    }

    if (setupGenerationLockRef.current) {
      return false;
    }

    setupGenerationLockRef.current = true;
    setGeneratingSetupTarget(target);
    setSetupActionError(undefined);

    try {
      const generationRequest: GenerateSeriesSetupDraftInput =
        buildTargetedSeriesSetupDraftRequest(setupForm, target);
      const result: GenerateSeriesSetupDraftResult =
        await localAppServices.generateSeriesSetupDraft.execute(
          generationRequest,
        );
      const generatedForm: SeriesSetupFormState =
        applyTargetedSeriesSetupDraft(setupForm, target, result.draft);

      setSetupForm(generatedForm);
      setSetupErrors((currentErrors: SeriesSetupFormErrors) =>
        Object.keys(currentErrors).length > 0
          ? validateSeriesSetupForm(generatedForm)
          : {},
      );
      return true;
    } catch (error) {
      setSetupActionError(
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.',
      );
      return false;
    } finally {
      setupGenerationLockRef.current = false;
      setGeneratingSetupTarget(undefined);
    }
  };

  // cancelSetup closes the setup sheet without persisting, discarding unsaved edits
  // and AI generations so the form reopens with the last saved series values.
  const cancelSetup = (): void => {
    setSetupErrors({});
    setSetupActionError(undefined);
    setIsSetupOpen(false);

    if (state) {
      // Revert in-memory edits; persistence only happens through Save.
      setSetupForm(createSeriesSetupForm(state.series));
    }
  };

  // openSetup restores a saved pre-episode draft while keeping completed series read-only.
  const openSetup = async (): Promise<void> => {
    if (!state) {
      return;
    }

    setSetupActionError(undefined);
    setSetupErrors({});

    // networkState gives the shared setup cards a current online-action snapshot.
    const networkState: ConnectivityState =
      await localAppServices.networkStatus
        .getCurrentState()
        .catch((): ConnectivityState => ({ isOnline: false }));

    setIsSetupOnline(networkState.isOnline);

    if (canEditSetup) {
      try {
        const result = await localAppServices.loadSeriesSetupDraft.execute({
          draftId: state.series.id,
        });

        setSetupForm(
          result.draft
            ? createSeriesSetupFormFromDraft(result.draft)
            : createSeriesSetupForm(state.series),
        );
      } catch {
        setSetupForm(createSeriesSetupForm(state.series));
        setSetupActionError('Your local setup draft could not be loaded.');
      }
    } else {
      setSetupForm(createSeriesSetupForm(state.series));
    }

    setIsSetupOpen(true);
  };

  const handleSeriesScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const offsetY: number = event.nativeEvent.contentOffset.y;
    const headerTop: number | undefined = seriesHeaderTopRef.current;
    const titleTop: number | undefined = seriesTitleTopRef.current;
    const titleHeight: number | undefined = seriesTitleHeightRef.current;

    if (
      headerTop === undefined ||
      titleTop === undefined ||
      titleHeight === undefined
    ) {
      return;
    }

    // thresholds match the exact large-title edges requested for each scroll direction.
    const thresholds: SeriesTitleScrollThresholds =
      getSeriesTitleScrollThresholds({
        blurBottom: insets.top + screenEdgeDepths.compactTop,
        headerTop,
        titleHeight,
        titleTop,
      });

    if (!isHeaderCollapsed && offsetY >= thresholds.appearanceOffset) {
      setIsHeaderCollapsed(true);
      return;
    }

    if (isHeaderCollapsed && offsetY <= thresholds.disappearanceOffset) {
      setIsHeaderCollapsed(false);
    }
  };

  // handleSeriesHeaderLayout captures the header origin within scroll-content coordinates.
  const handleSeriesHeaderLayout = (event: LayoutChangeEvent): void => {
    seriesHeaderTopRef.current = event.nativeEvent.layout.y;
  };

  // handleSeriesTitleLayout captures both measured edges of the rendered large title.
  const handleSeriesTitleLayout = (event: LayoutChangeEvent): void => {
    seriesTitleTopRef.current = event.nativeEvent.layout.y;
    seriesTitleHeightRef.current = event.nativeEvent.layout.height;
  };

  if (errorMessage) {
    return (
      <View style={[styles.screenContent, fallbackInsets]}>
        <View style={styles.homeHeader}>
          <BackIconButton
            accessibilityHint="Returns to the stories list"
            accessibilityLabel="Back to stories"
            colors={colors}
            onPress={onBack}
          />
        </View>
        <BubbleStatus colors={colors} tone="error" title={errorMessage} variant="row" />
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.screenContent, fallbackInsets]}>
        <BubbleStatus colors={colors} tone="loading" title="Loading series..." variant="row" />
      </View>
    );
  }

  const latestEpisode = state.episodes.at(-1);
  const hasEpisodeInProgress =
    latestEpisode !== undefined && !latestEpisode.isComplete;

  return (
    <View style={styles.flexOne}>
      <PlatformBlurTargetView
        blurTargetRef={blurTargetRef}
        style={styles.flexOne}
      >
        <Animated.ScrollView
          contentContainerStyle={[styles.screenContent, seriesContentInsets]}
          onScroll={handleSeriesScroll}
          scrollEventThrottle={16}
        >
          <View
            onLayout={handleSeriesHeaderLayout}
            style={styles.seriesDetailsHeader}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={2}
              onLayout={handleSeriesTitleLayout}
              style={styles.largeTitle}
            >
              {state.series.title}
            </Text>
          </View>

          <SeriesQuickActions
            colors={colors}
            hasEpisodeInProgress={hasEpisodeInProgress}
            hasEpisodes={state.episodes.length > 0}
            onPrimaryAction={() => {
              if (latestEpisode && !latestEpisode.isComplete) {
                onContinueEpisode(latestEpisode.orderIndex);

                return;
              }

              onPrepareEpisode(state.series.id);
            }}
            onReadSeries={() => onReadSeries(state.series.id)}
          />

          <Text style={styles.sectionLabel}>EPISODE HISTORY</Text>
          {state.episodes.length === 0 ? (
            <View style={styles.emptySeriesPanel}>
              <Text style={styles.actionTitle}>No episodes yet</Text>
              <Text style={styles.secondaryText}>
                Generate the first episode to create local history.
              </Text>
            </View>
          ) : (
            <View style={styles.episodeList}>
              {state.episodes.map((episode) => (
                <EpisodeHistoryRow
                  isDeleting={episode.id === deletingEpisodeId}
                  episode={episode}
                  key={episode.id}
                  styles={styles}
                  onDeleteEpisode={requestDeleteEpisode}
                  onOpenEpisode={onOpenEpisode}
                />
              ))}
            </View>
          )}
          {setupForm ? (
            <CreateSeriesFlow
              actionError={setupActionError}
              colors={colors}
              errors={setupErrors}
              form={setupForm}
              generatingSetupTarget={generatingSetupTarget}
              isDark={isDark}
              isOnline={isSetupOnline}
              isSaving={isSavingSetup}
              isVisible={isSetupOpen}
              styles={styles}
              variant={canEditSetup ? 'edit' : 'view'}
              onChangeForm={(nextForm: SeriesSetupFormState): void => {
                setSetupActionError(undefined);
                setSetupForm(nextForm);
                setSetupErrors(
                  (currentErrors: SeriesSetupFormErrors) =>
                    Object.keys(currentErrors).length > 0
                      ? validateSeriesSetupForm(nextForm)
                      : {},
                );
              }}
              onClose={cancelSetup}
              onGenerate={generateSetupField}
              onSaveDraft={saveSetup}
              onSubmit={saveSetup}
            />
          ) : null}
        </Animated.ScrollView>
      </PlatformBlurTargetView>
      <SeriesDetailsEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        canEditSetup={canEditSetup}
        colors={colors}
        isDark={isDark}
        styles={styles}
        title={state.series.title}
        topInset={insets.top}
        transitionProgress={headerTransition}
        onBack={onBack}
        onOpenSetup={() => void openSetup()}
      />
    </View>
  );
}

// EpisodeHistoryRow opens one completed local episode in read/listen mode.
function EpisodeHistoryRow({
  episode,
  isDeleting,
  styles,
  onDeleteEpisode,
  onOpenEpisode,
}: {
  // episode is a locally saved generated unit.
  readonly episode: Episode;
  // isDeleting prevents duplicate destructive writes for this row.
  readonly isDeleting: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onDeleteEpisode triggers a confirmation before local deletion.
  readonly onDeleteEpisode: (episode: Episode) => void;
  // onOpenEpisode opens this saved episode in the reader.
  readonly onOpenEpisode: (episodeOrderIndex: number) => void;
}): ReactElement {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;

  return (
    <BubbleSurface colors={colors} tone="neutral" variant="card" style={styles.episodeCard}>
      <JellyPressable
        onPress={() => onOpenEpisode(episode.orderIndex)}
        style={({ pressed }) => [styles.episodeCardContent, pressed && styles.pressed]}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={2}
          style={[styles.actionTitle, styles.episodeCardTitle]}
        >
          Episode {episode.orderIndex}: {episode.title ?? 'Untitled'}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.secondaryText, styles.episodeCardSummary]}
        >
          {episode.summaryUpdate}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.sectionLabel}
        >
          {episode.isComplete
            ? `${episode.cefrLevel} · ${episode.genre.toUpperCase()} · ${episode.interactions.length} DECISIONS · COMPLETE`
            : `${episode.cefrLevel} · ${episode.genre.toUpperCase()} · ${episode.interactions.length} DECISIONS · IN PROGRESS`}
        </Text>
      </JellyPressable>
      <View style={styles.episodeCardActions}>
        <JellyPressable
          onPress={() => onOpenEpisode(episode.orderIndex)}
          style={({ pressed }) => [
            styles.smallPrimaryButton,
            styles.flex,
            pressed && styles.pressed,
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
            style={styles.smallPrimaryButtonText}
          >
            Read
          </Text>
        </JellyPressable>
        <JellyPressable
          disabled={isDeleting}
          onPress={() => onDeleteEpisode(episode)}
          style={({ pressed }) => [
            styles.destructiveIconButton,
            styles.episodeCompactDelete,
            pressed && styles.pressed,
            isDeleting && styles.disabledControl,
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.76}
            numberOfLines={1}
            style={styles.destructiveIconText}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Text>
        </JellyPressable>
      </View>
    </BubbleSurface>
  );
}
