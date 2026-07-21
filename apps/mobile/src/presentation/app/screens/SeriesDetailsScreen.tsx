import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import {
  BackIconButton,
  BubbleButton,
  BubbleStatus,
  BubbleSurface,
  CefrLevelSelector,
  SeriesSetupChoiceGroup,
  CharacterProfilesEditor,
  SeriesCreativeBriefEditor,
  SeriesSetupTextField,
  JellyPressable,
  PlatformBlurTargetView,
  ScreenEdgeEffects,
  screenEdgeDepths,
} from '../shared';
import { useAppTheme } from '../theme';
import { lightColors, darkColors } from '@presentation/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  characterProfileNames,
  learningGenres,
  normalizeCharacterProfiles,
  seriesParticipationModes,
  type Episode,
  type Series,
  type SeriesMemory,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  getSeriesTitleScrollThresholds,
  SeriesDetailsEdgeEffects,
  type SeriesTitleScrollThresholds,
} from './SeriesDetailsEdgeEffects';
import { buildSeriesSetupDraftRequest } from './seriesSetupDraftRequest';
import {
  applyAiGeneratedFields,
  createLocalSeriesSetupDraft,
  createSeriesSetupForm,
  createSeriesSetupFormFromDraft,
  genreLabels,
  getSeriesSetupGenerationActionLabel,
  isAiGeneratedField,
  markSetupFieldUserAuthored,
  participationModeLabels,
  shouldConfirmSeriesSetupGeneration,
  storyToneOptions,
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
  // generationUndoForm keeps one pre-generation setup snapshot until another edit.
  const [generationUndoForm, setGenerationUndoForm] =
    useState<SeriesSetupFormState>();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
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
        setGenerationUndoForm(undefined);
        setSetupErrors({});
        setSetupForm(createSeriesSetupForm(state.series));
        return;
      }

      await localAppServices.updateSeriesSetup.execute({
        seriesId: state.series.id,
        title: setupForm.title,
        genre: setupForm.genre,
        cefrLevel: setupForm.cefrLevel,
        tone: setupForm.tone,
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
      setGenerationUndoForm(undefined);
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

  const generateSetup = async (): Promise<void> => {
    if (!setupForm) {
      return;
    }

    if (setupGenerationLockRef.current) {
      return;
    }

    setupGenerationLockRef.current = true;
    setIsGeneratingSetup(true);
    setSetupActionError(undefined);

    try {
      const generationRequest = buildSeriesSetupDraftRequest(setupForm);
      const result = await localAppServices.generateSeriesSetupDraft.execute(
        generationRequest,
      );
      const generatedForm = applyAiGeneratedFields(
        {
          ...setupForm,
          title: result.draft.title,
          premise: result.draft.premise,
          characterProfiles: result.draft.characterProfiles,
          userRole:
            setupForm.participationMode === 'character'
              ? result.draft.userRole ?? setupForm.userRole
              : '',
        },
        result.draft.changedFields,
      );

      setGenerationUndoForm(
        result.draft.changedFields.length > 0 ? setupForm : undefined,
      );
      setSetupForm(generatedForm);
      setSetupErrors({});
    } catch (error) {
      setSetupActionError(
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.',
      );
    } finally {
      setupGenerationLockRef.current = false;
      setIsGeneratingSetup(false);
    }
  };

  // requestSetupGeneration confirms only a rebuild that discards visible final fields.
  const requestSetupGeneration = (): void => {
    if (!setupForm || !shouldConfirmSeriesSetupGeneration(setupForm)) {
      void generateSetup();
      return;
    }

    Alert.alert(
      'Rebuild this draft?',
      'Title, premise, characters, and role may be replaced. Your idea and story anchors stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rebuild',
          style: 'destructive',
          onPress: () => void generateSetup(),
        },
      ],
    );
  };

  // cancelSetup closes the setup sheet without persisting, discarding unsaved edits
  // and AI generations so the form reopens with the last saved series values.
  const cancelSetup = (): void => {
    setSetupErrors({});
    setSetupActionError(undefined);
    setGenerationUndoForm(undefined);
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
    setGenerationUndoForm(undefined);

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
  const nextEpisodeNumber = state.episodes.length + 1;

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
            <Text style={styles.readerBadge}>
              {genreLabels[state.series.genre]} - {state.series.cefrLevel}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={2}
              onLayout={handleSeriesTitleLayout}
              style={styles.largeTitle}
            >
              {state.series.title}
            </Text>
            <Text numberOfLines={2} style={styles.secondaryText}>
              {buildSeriesDetailsMeta(state.series, state.episodes.length)}
            </Text>
          </View>

          <BubbleSurface
            colors={colors}
            tone="primary"
            variant="card"
            style={[styles.continueBanner, styles.seriesPrepareBanner]}
          >
            <Text style={styles.continueTag}>
              {hasEpisodeInProgress ? 'CONTINUE' : 'PREPARE NEXT'}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={2}
              style={styles.continueTitle}
            >
              {hasEpisodeInProgress
                ? 'Resume episode'
                : `Episode ${nextEpisodeNumber}`}
            </Text>
            <Text numberOfLines={2} style={styles.continueText}>
              {hasEpisodeInProgress
                ? 'Return to the latest decision.'
                : 'Choose Story Words for the next episode.'}
            </Text>
            <BubbleButton
              colors={colors}
              contentStyle={styles.bannerButton}
              onPress={() => {
                if (latestEpisode && !latestEpisode.isComplete) {
                  onContinueEpisode(latestEpisode.orderIndex);

                  return;
                }

                onPrepareEpisode(state.series.id);
              }}
              variant="inverted"
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                style={styles.bannerButtonText}
              >
                {hasEpisodeInProgress ? 'Continue Reading' : 'Start Setup'}
              </Text>
            </BubbleButton>
          </BubbleSurface>

          {state.episodes.length > 0 ? (
            <JellyPressable
              onPress={() => onReadSeries(state.series.id)}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.seriesSecondaryAction,
                pressed && styles.pressed,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={1}
                style={[
                  styles.primaryButtonText,
                  styles.seriesSecondaryActionText,
                ]}
              >
                Read Full Series
              </Text>
            </JellyPressable>
          ) : null}

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
            <SeriesSetupModal
              actionError={setupActionError}
              canUndoGeneration={generationUndoForm !== undefined}
              colors={colors}
              canEdit={canEditSetup}
              errors={setupErrors}
              form={setupForm}
              isGenerating={isGeneratingSetup}
              isDark={isDark}
              isSaving={isSavingSetup}
              isVisible={isSetupOpen}
              styles={styles}
              onChangeForm={(nextForm) => {
                setGenerationUndoForm(undefined);
                setSetupForm(nextForm);
                setSetupErrors((currentErrors) =>
                  Object.keys(currentErrors).length > 0
                    ? validateSeriesSetupForm(nextForm)
                    : {},
                );
              }}
              onClose={cancelSetup}
              onGenerate={requestSetupGeneration}
              onSave={saveSetup}
              onUndoGeneration={() => {
                if (generationUndoForm) {
                  setSetupForm(generationUndoForm);
                  setGenerationUndoForm(undefined);
                }
              }}
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

// SeriesSetupModal shows the locked or editable setup contract for one series.
function SeriesSetupModal({
  actionError,
  canUndoGeneration,
  colors,
  canEdit,
  errors,
  form,
  isGenerating,
  isDark,
  isSaving,
  isVisible,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onSave,
  onUndoGeneration,
}: {
  // actionError reports save or generation failures inside the open modal.
  readonly actionError: string | undefined;
  // canUndoGeneration reveals one rollback after a successful AI result.
  readonly canUndoGeneration: boolean;
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // canEdit is true only before the first generated episode exists.
  readonly canEdit: boolean;
  // errors are validation messages for editable setup fields.
  readonly errors: SeriesSetupFormErrors;
  // form stores the visible setup values.
  readonly form: SeriesSetupFormState;
  // isGenerating disables duplicate AI setup generation.
  readonly isGenerating: boolean;
  // isDark selects the matching shared blur tint.
  readonly isDark: boolean;
  // isSaving disables duplicate local writes.
  readonly isSaving: boolean;
  // isVisible controls the native modal presentation.
  readonly isVisible: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeForm updates one or more setup fields.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onClose dismisses the setup sheet.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onSave persists editable setup changes.
  readonly onSave: () => void;
  // onUndoGeneration restores the setup snapshot from before the latest AI result.
  readonly onUndoGeneration: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset: number = insets.top;
  const bottomInset: number = insets.bottom;
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  // setupModalBlurTargetRef preserves the shared edge-effect source contract inside setup.
  const setupModalBlurTargetRef: RefObject<View | null> = useRef<View>(null);
  // setupModalContentInsets matches the create-series modal's edge clearances.
  const setupModalContentInsets: ViewStyle = {
    paddingTop: topInset + 96,
    paddingBottom: bottomInset + screenEdgeDepths.modalBottom + 16,
  };
  // setupModalHeaderPosition floats actions above shared top glass without an opaque slab.
  const setupModalHeaderPosition: ViewStyle = {
    position: 'absolute',
    top: topInset,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  };
  // isBusy blocks setup controls while a save or AI setup generation runs.
  const isBusy = isSaving || isGenerating;
  // isComplete switches the editable header action between draft save and final save.
  const isComplete: boolean =
    Object.keys(validateSeriesSetupForm(form)).length === 0;
  // generationActionLabel reflects strategy and whether the creative context is blank.
  const generationActionLabel: string =
    getSeriesSetupGenerationActionLabel(form);
  const updateForm = (patch: Partial<SeriesSetupFormState>): void => {
    onChangeForm({ ...form, ...patch });
  };
  const registerFieldOffset = (fieldId: string, offsetY: number): void => {
    fieldOffsetsRef.current[fieldId] = offsetY;
  };
  const scrollToField = (fieldId: string): void => {
    setTimeout(() => {
      const offsetY = fieldOffsetsRef.current[fieldId];

      if (offsetY !== undefined) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, offsetY - 72),
          animated: true,
        });
      }
    }, 120);
  };
  // scrollToAddedCharacter positions the newly inserted card below the modal header.
  const scrollToAddedCharacter = (characterOffsetY: number): void => {
    const sectionOffsetY = fieldOffsetsRef.current.characterProfiles;

    if (sectionOffsetY === undefined) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      y: Math.max(0, sectionOffsetY + characterOffsetY - 72),
      animated: true,
    });
  };

  return (
    <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.modalScreen}
      >
        <PlatformBlurTargetView
          blurTargetRef={setupModalBlurTargetRef}
          style={styles.flexOne}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.modalContent,
              setupModalContentInsets,
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="always"
          >
          <View style={styles.setupSectionCard}>
            <CefrLevelSelector
              isDark={isDark}
              isDisabled={!canEdit}
              selectedLevel={form.cefrLevel}
              styles={styles}
              onSelect={(cefrLevel) => updateForm({ cefrLevel })}
            />
            <SeriesSetupChoiceGroup
              isDark={isDark}
              isDisabled={!canEdit}
              isWrapped
              label="Genre"
              options={learningGenres}
              selected={form.genre}
              styles={styles}
              labels={genreLabels}
              onSelect={(genre) => updateForm({ genre })}
            />
            <SeriesSetupChoiceGroup
              isDark={isDark}
              isDisabled={!canEdit}
              isWrapped
              label="Tone"
              options={storyToneOptions}
              selected={form.tone}
              styles={styles}
              onSelect={(tone) => updateForm({ tone })}
            />
            <SeriesSetupChoiceGroup
              isDark={isDark}
              isDisabled={!canEdit}
              label="Mode"
              options={seriesParticipationModes}
              selected={form.participationMode}
              styles={styles}
              labels={participationModeLabels}
              onSelect={(participationMode) => {
                const nextForm = markSetupFieldUserAuthored(
                  {
                    ...form,
                    participationMode,
                    ...(participationMode === 'director'
                      ? { userRole: '' }
                      : {}),
                  },
                  'userRole',
                );

                onChangeForm(nextForm);
              }}
            />

            <SeriesCreativeBriefEditor
              brief={form.creativeBrief}
              colors={colors}
              completedCharacterCount={
                normalizeCharacterProfiles(form.characterProfiles).length
              }
              isDark={isDark}
              isEditable={canEdit}
              styles={styles}
              onChange={(creativeBrief) => updateForm({ creativeBrief })}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
            />
            {canEdit ? (
              <>
                <BubbleButton
                  accessibilityHint="Updates the final setup using the selected AI strategy"
                  colors={colors}
                  contentStyle={styles.setupBuildAction}
                  disabled={isBusy}
                  onPress={onGenerate}
                  variant="primary"
                >
                  <Text style={styles.setupBuildActionText}>
                    {generationActionLabel}
                  </Text>
                </BubbleButton>
                {canUndoGeneration ? (
                  <BubbleButton
                    accessibilityHint="Restores the setup from before the latest AI result"
                    colors={colors}
                    contentStyle={styles.setupUndoAction}
                    disabled={isBusy}
                    onPress={onUndoGeneration}
                    variant="secondary"
                  >
                    <Text style={styles.setupUndoActionText}>
                      Undo AI changes
                    </Text>
                  </BubbleButton>
                ) : null}
              </>
            ) : null}
            <View style={styles.setupDraftHeader}>
              <Text style={styles.setupDraftTitle}>Series draft</Text>
              {canEdit ? (
                <Text style={styles.formHelperText}>
                  AI suggestions stay editable. Your idea and story anchors stay fixed.
                </Text>
              ) : null}
            </View>
            <SeriesSetupTextField
              colors={colors}
              {...(errors.title ? { error: errors.title } : {})}
              isEditable={canEdit}
              fieldId="title"
              isAiSuggested={isAiGeneratedField(form, 'title')}
              label="Title"
              maxLength={160}
              placeholder="Orbit Letters"
              styles={styles}
              value={form.title}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(title) =>
                onChangeForm(
                  markSetupFieldUserAuthored({ ...form, title }, 'title'),
                )
              }
            />
            <SeriesSetupTextField
              colors={colors}
              {...(errors.premise ? { error: errors.premise } : {})}
              isEditable={canEdit}
              fieldId="premise"
              isAiSuggested={isAiGeneratedField(form, 'premise')}
              isMultiline
              label="Premise"
              maxLength={1000}
              placeholder="A learner receives strange English notes from a future city."
              styles={styles}
              value={form.premise}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(premise) =>
                onChangeForm(
                  markSetupFieldUserAuthored(
                    { ...form, premise },
                    'premise',
                  ),
                )
              }
            />
            {isAiGeneratedField(form, 'characterProfiles') ? (
              <Text style={styles.setupAiSourceLabel}>
                CAST · AI SUGGESTION · EDITABLE
              </Text>
            ) : null}
            <CharacterProfilesEditor
              colors={colors}
              {...(errors.mainCharacters
                ? { error: errors.mainCharacters }
                : {})}
              isEditable={canEdit}
              profiles={form.characterProfiles}
              onAddedProfileLayout={scrollToAddedCharacter}
              onFocus={() => scrollToField('characterProfiles')}
              onLayout={(event) =>
                registerFieldOffset(
                  'characterProfiles',
                  event.nativeEvent.layout.y,
                )
              }
              onChange={(characterProfiles) =>
                onChangeForm(
                  markSetupFieldUserAuthored(
                    { ...form, characterProfiles },
                    'characterProfiles',
                  ),
                )
              }
            />
            {form.participationMode === 'character' ? (
              <SeriesSetupTextField
                colors={colors}
                {...(errors.userRole ? { error: errors.userRole } : {})}
                {...(canEdit
                  ? {
                      helper:
                        'Required. This role becomes read-only after the first episode.',
                    }
                  : {})}
                isEditable={canEdit}
                fieldId="userRole"
                isAiSuggested={isAiGeneratedField(form, 'userRole')}
                isCompactMultiline
                label="Your Role"
                maxLength={160}
                placeholder="New analyst"
                styles={styles}
                value={form.userRole}
                onFocus={scrollToField}
                onLayout={registerFieldOffset}
                onChangeText={(userRole) =>
                  onChangeForm(
                    markSetupFieldUserAuthored(
                      { ...form, userRole },
                      'userRole',
                    ),
                  )
                }
              />
            ) : null}
          </View>
          {canEdit ? (
            <>
              {isBusy ? (
                <BubbleStatus
                  colors={colors}
                  tone="loading"
                  title={isSaving ? 'Saving setup...' : 'Generating setup...'}
                  variant="row"
                />
          ) : null}
          {!isBusy && actionError ? (
            <BubbleStatus
              accessibilityRole="alert"
              colors={colors}
              tone="error"
              title={actionError}
              variant="row"
            />
          ) : null}
            </>
          ) : (
            <BubbleStatus
              colors={colors}
              tone="warning"
              title="Setup is read-only after the first episode."
              variant="row"
            />
          )}
          </ScrollView>
        </PlatformBlurTargetView>
        <ScreenEdgeEffects
          blurTarget={setupModalBlurTargetRef}
          bottomInset={bottomInset}
          bottomVariant="modal"
          colors={colors}
          isDark={isDark}
          materialOpacity={1}
          topInset={topInset}
        />
        <View style={[styles.modalHeader, setupModalHeaderPosition]}>
          <BackIconButton
            accessibilityHint="Closes series setup"
            accessibilityLabel="Back from series setup"
            colors={colors}
            onPress={onClose}
          />
          <View style={styles.modalActions}>
            <BubbleButton
              colors={colors}
              contentStyle={styles.modalSecondaryAction}
              disabled={!canEdit || isBusy}
              onPress={onSave}
              variant="secondary"
            >
              <Text style={styles.modalSecondaryActionText}>
                {isComplete ? 'Save' : 'Save draft'}
              </Text>
            </BubbleButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// buildSeriesDetailsMeta keeps orientation compact without exposing the full premise.
function buildSeriesDetailsMeta(series: Series, episodeCount: number): string {
  const names = characterProfileNames(series.characterProfiles).slice(0, 2);
  const cast = names.length > 0 ? names.join(' & ') : participationModeLabels[series.participationMode];
  const episodeLabel = episodeCount === 1 ? '1 episode' : `${episodeCount} episodes`;

  return `${cast} - ${episodeLabel}`;
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
            ? `${episode.interactions.length} DECISIONS - COMPLETE`
            : `${episode.interactions.length} DECISIONS - IN PROGRESS`}
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
