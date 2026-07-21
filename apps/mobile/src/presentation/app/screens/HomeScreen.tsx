import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackIconButton,
  BubbleSurface,
  BubbleButton,
  BubbleStatus,
  CefrLevelSelector,
  SeriesSetupChoiceGroup,
  CharacterProfilesEditor,
  SeriesCreativeBriefEditor,
  SeriesSetupTextField,
  CollapsingTitleEdgeEffects,
  PlatformBlurTargetView,
  ScreenEdgeEffects,
  screenEdgeDepths,
} from '../shared';
import { useAppTheme } from '../theme';
import {
  lightColors,
  darkColors,
} from '@presentation/theme';

import {
  characterProfileNames,
  learningGenres,
  newSeriesSetupDraftId,
  normalizeCharacterProfiles,
  seriesParticipationModes,
  type Series,
} from '@domain/index';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import { floatingTabBarMetrics } from '@presentation/theme/layout';
import { HomeSeriesSkeleton } from './home/components/HomeSeriesSkeleton';
import {
  resolveOpenSwipeSeriesId,
  SwipeableSeriesCard,
} from './home/components/SwipeableSeriesCard';
import {
  getHomeContentState,
  type HomeContentState,
} from './home/homeContentState';
import { buildSeriesSetupDraftRequest } from './seriesSetupDraftRequest';
import {
  applyAiGeneratedFields,
  createLocalSeriesSetupDraft,
  createEmptySeriesSetupForm,
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

// HomeScreenProps carries the shared themed style sheet into the home dashboard.
type HomeScreenProps = {
  // styles is the app-level StyleSheet contract generated from current theme colors.
  readonly styles: AppStyles;
  // onOpenSeries opens the unified Story Words and reader flow for one story.
  readonly onOpenSeries: (seriesId: string) => void;
  // onRequestDeleteSeries opens the native-like confirmation sheet for one story.
  readonly onRequestDeleteSeries: (series: Series) => void;
};

// homeHeaderCollapseOffset starts the autonomous title transition after a deliberate upward scroll.
const homeHeaderCollapseOffset: number = 38;
// homeHeaderExpandOffset adds hysteresis so tiny scroll changes cannot toggle the header repeatedly.
const homeHeaderExpandOffset: number = 12;
// homeTitleTransitionDuration keeps the two-stage title swap quick and independent from static materials.
const homeTitleTransitionDuration: number = 220;
// homeMaterialTransitionDuration softly fades static blur and tint without directional effects.
const homeMaterialTransitionDuration: number = 180;

// HomeScreen renders the series-first dashboard and local create-series flow.
export function HomeScreen({
  onOpenSeries,
  onRequestDeleteSeries,
  styles,
}: HomeScreenProps): ReactElement {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  // titleTransition drives only the autonomous large-to-compact title swap.
  const [titleTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // materialTransition controls only the simple opacity of the top blur-and-gradient material.
  const [materialTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  // homeContentInsets preserves the initial safe spacing while allowing later content to scroll behind both edges.
  const homeContentInsets: ViewStyle = {
    paddingTop: insets.top + 20,
    paddingBottom: floatingTabBarMetrics(insets).contentPaddingBottom,
  };
  // largeTitleOpacity removes the large heading before the compact header reaches full opacity.
  const largeTitleOpacity: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.18, 0.58, 1],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });
  // largeTitleTranslateY lets the large heading leave with the scrolling content instead of blinking away.
  const largeTitleTranslateY: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [0, -10, -10],
      extrapolate: 'clamp',
    });
  // largeTitleScale subtly compresses the title during collapse without imitating a zoom effect.
  const largeTitleScale: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [1, 0.97, 0.97],
      extrapolate: 'clamp',
    });
  const [series, setSeries] = useState<readonly Series[]>([]);
  // isInitialSeriesLoading distinguishes unresolved local data from a settled empty library.
  const [isInitialSeriesLoading, setIsInitialSeriesLoading] =
    useState<boolean>(true);
  const [form, setForm] = useState<SeriesSetupFormState>(
    createEmptySeriesSetupForm,
  );
  const [formErrors, setFormErrors] = useState<SeriesSetupFormErrors>({});
  // generationUndoForm keeps one pre-generation snapshot until the learner edits again.
  const [generationUndoForm, setGenerationUndoForm] =
    useState<SeriesSetupFormState>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openSwipeSeriesId, setOpenSwipeSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  // setupGenerationLockRef blocks rapid presses before React applies busy state.
  const setupGenerationLockRef = useRef<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [formActionError, setFormActionError] = useState<string>();
  // blurTargetRef preserves the shared edge-effect source contract around Home content.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);

  useEffect(() => {
    // The scroll gesture chooses the target state; timing completes independently of finger position.
    const titleAnimation: Animated.CompositeAnimation = Animated.timing(
      titleTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: homeTitleTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );
    // Material uses a short opacity-only fade so it appears calmly without a reveal effect.
    const materialAnimation: Animated.CompositeAnimation = Animated.timing(
      materialTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: homeMaterialTransitionDuration,
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

  const loadSeries = useCallback(async (): Promise<void> => {
    try {
      const result = await localAppServices.listSeries.execute();

      setSeries(result.series);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Local series could not be loaded.');
    } finally {
      setIsInitialSeriesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSeries();

      return (): void => {
        setOpenSwipeSeriesId(undefined);
      };
    }, [loadSeries]),
  );

  const submitSeries = async (): Promise<void> => {
    const validationErrors = validateSeriesSetupForm(form);
    const isComplete: boolean = Object.keys(validationErrors).length === 0;
    let isDraftSaved: boolean = false;

    setIsSaving(true);
    setFormActionError(undefined);

    try {
      await localAppServices.saveSeriesSetupDraft.execute(
        createLocalSeriesSetupDraft(
          form,
          newSeriesSetupDraftId,
          new Date().toISOString(),
        ),
      );
      isDraftSaved = true;

      if (!isComplete) {
        setForm(createEmptySeriesSetupForm());
        setGenerationUndoForm(undefined);
        setFormErrors({});
        setIsCreateOpen(false);
        return;
      }

      await localAppServices.createSeries.execute({
        title: form.title,
        genre: form.genre,
        cefrLevel: form.cefrLevel,
        tone: form.tone,
        premise: form.premise,
        participationMode: form.participationMode,
        mainCharacters: characterProfileNames(form.characterProfiles),
        characterProfiles: form.characterProfiles,
        creativeBrief: form.creativeBrief,
        setupDraftMeta: form.setupDraftMeta,
        ...(form.participationMode === 'character' && form.userRole.trim()
          ? { userRole: form.userRole }
          : {}),
      });
      await localAppServices.deleteSeriesSetupDraft
        .execute({ draftId: newSeriesSetupDraftId })
        .catch(() => undefined);
      setForm(createEmptySeriesSetupForm());
      setGenerationUndoForm(undefined);
      setFormErrors({});
      setIsCreateOpen(false);
      await loadSeries();
    } catch (error) {
      const isModerationError =
        error instanceof SupabaseFunctionError &&
        (error.kind === 'moderation_soft_block' ||
          error.kind === 'moderation_warning' ||
          error.kind === 'moderation_banned');
      const message =
        error instanceof Error
          ? error.message
          : 'Series could not be saved. Check required fields.';

      if (isModerationError) {
        Alert.alert(
          error.kind === 'moderation_banned'
            ? 'You are banned'
            : 'Series not saved',
          `${message}\n\nYour draft is saved on this device.`,
        );
        return;
      }

      setFormActionError(
        isDraftSaved ? `${message} Your draft is saved on this device.` : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // openCreateSeries restores an explicitly saved local draft before presenting the form.
  const openCreateSeries = async (): Promise<void> => {
    if (openSwipeSeriesId) {
      setOpenSwipeSeriesId(undefined);
      return;
    }

    setFormActionError(undefined);
    setGenerationUndoForm(undefined);

    try {
      const result = await localAppServices.loadSeriesSetupDraft.execute({
        draftId: newSeriesSetupDraftId,
      });

      setForm(
        result.draft
          ? createSeriesSetupFormFromDraft(result.draft)
          : createEmptySeriesSetupForm(),
      );
    } catch {
      setForm(createEmptySeriesSetupForm());
      setFormActionError('Your local draft could not be loaded.');
    }

    setFormErrors({});
    setIsCreateOpen(true);
  };

  const generateSetupDraft = async (): Promise<void> => {
    if (setupGenerationLockRef.current) {
      return;
    }

    setupGenerationLockRef.current = true;
    setIsGeneratingSetup(true);
    setFormActionError(undefined);

    try {
      const generationRequest = buildSeriesSetupDraftRequest(form);
      const result = await localAppServices.generateSeriesSetupDraft.execute(
        generationRequest,
      );
      const generatedForm = applyAiGeneratedFields(
        {
          ...form,
          title: result.draft.title,
          premise: result.draft.premise,
          characterProfiles: result.draft.characterProfiles,
          userRole:
            form.participationMode === 'character'
              ? result.draft.userRole ?? form.userRole
              : '',
        },
        result.draft.changedFields,
      );

      setGenerationUndoForm(
        result.draft.changedFields.length > 0 ? form : undefined,
      );
      setForm(generatedForm);
      setFormErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.';

      setFormActionError(message);
    } finally {
      setupGenerationLockRef.current = false;
      setIsGeneratingSetup(false);
    }
  };

  // requestSetupGeneration confirms only a destructive rebuild of visible draft fields.
  const requestSetupGeneration = (): void => {
    if (!shouldConfirmSeriesSetupGeneration(form)) {
      void generateSetupDraft();
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
          onPress: () => void generateSetupDraft(),
        },
      ],
    );
  };

  const requestDeleteSeries = (
    seriesToDelete: Series,
    onCancel?: () => void,
  ): void => {
    onRequestDeleteSeries(seriesToDelete);
    onCancel?.();
    setOpenSwipeSeriesId(undefined);
  };

  // changeOpenSwipeSeries keeps a late close animation from clearing a newer open row.
  const changeOpenSwipeSeries = (
    seriesId: string,
    shouldOpen: boolean,
  ): void => {
    setOpenSwipeSeriesId(
      (
        // currentSeriesId is the latest owner after any overlapping row animation.
        currentSeriesId: string | undefined,
      ): string | undefined =>
        resolveOpenSwipeSeriesId(currentSeriesId, seriesId, shouldOpen),
    );
  };

  const handleHomeScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const offsetY: number = event.nativeEvent.contentOffset.y;

    if (!isHeaderCollapsed && offsetY >= homeHeaderCollapseOffset) {
      setIsHeaderCollapsed(true);
      return;
    }

    if (isHeaderCollapsed && offsetY <= homeHeaderExpandOffset) {
      setIsHeaderCollapsed(false);
    }
  };

  // homeContentState gives the asynchronous loading state priority over the initial empty array.
  const homeContentState: HomeContentState = getHomeContentState(
    isInitialSeriesLoading,
    series.length,
  );

  return (
    <View style={styles.flexOne}>
      <PlatformBlurTargetView
        blurTargetRef={blurTargetRef}
        style={styles.flexOne}
      >
        <Animated.ScrollView
          contentContainerStyle={[styles.screenContent, homeContentInsets]}
          onScroll={handleHomeScroll}
          onScrollBeginDrag={() => {
            if (openSwipeSeriesId) {
              setOpenSwipeSeriesId(undefined);
            }
          }}
          scrollEventThrottle={16}
        >
          <Animated.View
            style={{
              opacity: largeTitleOpacity,
              transform: [
                { translateY: largeTitleTranslateY },
                { scale: largeTitleScale },
              ],
            }}
          >
            <HomeHeader styles={styles} />
          </Animated.View>
          {errorMessage ? (
            <BubbleStatus
              colors={colors}
              tone="error"
              title="Could not load series"
              message={errorMessage}
              variant="row"
              style={styles.homeErrorStatus}
            />
          ) : null}
          {homeContentState === 'loading' ? (
            <HomeSeriesSkeleton colors={colors} />
          ) : (
            <>
              <CreateHero
                colors={colors}
                hasSeries={homeContentState === 'ready'}
                styles={styles}
                onCreateSeries={() => void openCreateSeries()}
              />
              {homeContentState === 'ready' ? (
                <SeriesList
                  colors={colors}
                  hasOpenSwipe={openSwipeSeriesId !== undefined}
                  openSwipeSeriesId={openSwipeSeriesId}
                  series={series}
                  styles={styles}
                  onDeleteSeries={requestDeleteSeries}
                  onOpenSeries={onOpenSeries}
                  onOpenSwipeSeriesChange={changeOpenSwipeSeries}
                />
              ) : null}
            </>
          )}
        </Animated.ScrollView>
      </PlatformBlurTargetView>
      <CollapsingTitleEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        colors={colors}
        isDark={isDark}
        materialOpacity={materialTransition}
        transitionProgress={titleTransition}
        title="Context-English"
        topInset={insets.top}
      />
      <CreateSeriesModal
        colors={colors}
        form={form}
        canUndoGeneration={generationUndoForm !== undefined}
        actionError={formActionError}
        isGeneratingSetup={isGeneratingSetup}
        isDark={isDark}
        isSaving={isSaving}
        isVisible={isCreateOpen}
        errors={formErrors}
        styles={styles}
        onChangeForm={(nextForm) => {
          setGenerationUndoForm(undefined);
          setForm(nextForm);
          setFormErrors((currentErrors) =>
            Object.keys(currentErrors).length > 0
              ? validateSeriesSetupForm(nextForm)
              : {},
          );
        }}
        onClose={() => {
          setForm(createEmptySeriesSetupForm());
          setGenerationUndoForm(undefined);
          setFormErrors({});
          setFormActionError(undefined);
          setIsCreateOpen(false);
        }}
        onGenerate={requestSetupGeneration}
        onUndoGeneration={() => {
          if (generationUndoForm) {
            setForm(generationUndoForm);
            setGenerationUndoForm(undefined);
          }
        }}
        onSubmit={submitSeries}
      />
    </View>
  );
}

// HomeHeader owns the app title and status information.
function HomeHeader({
  styles,
}: Pick<HomeScreenProps, 'styles'>): ReactElement {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeTitleBlock}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.largeTitle, styles.homeTitle]}
        >
          Context-English
        </Text>
        <View style={styles.homeTitleAccent} />
      </View>
    </View>
  );
}

// CreateHero provides the main series-first action surface.
function CreateHero({
  colors,
  hasSeries,
  styles,
  onCreateSeries,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly hasSeries: boolean;
  readonly styles: AppStyles;
  readonly onCreateSeries: () => void;
}): ReactElement {
  return (
    <BubbleSurface
      colors={colors}
      style={[
        styles.heroSurface,
        hasSeries ? styles.heroSurfaceCompact : styles.heroSurfaceEmpty,
      ]}
      tone={hasSeries ? 'neutral' : 'primary'}
      variant={hasSeries ? 'list' : 'hero'}
    >
      <View style={styles.heroContent}>
        <View style={[styles.flex, styles.heroCopy]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
            style={[
              styles.heroTitle,
              !hasSeries && styles.heroTitleOnAccent,
            ]}
          >
            Create a story
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.heroText,
              !hasSeries && styles.heroTextOnAccent,
            ]}
          >
            {hasSeries
              ? 'Pick a premise, characters, and level.'
              : 'No saved series yet. Create one to begin.'}
          </Text>
        </View>
        <BubbleButton
          colors={colors}
          contentStyle={styles.heroButtonContent}
          onPress={onCreateSeries}
          style={styles.heroButton}
          variant={hasSeries ? 'primary' : 'inverted'}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={[
              styles.heroButtonText,
              !hasSeries && styles.heroButtonTextOnAccent,
            ]}
          >
            New Series
          </Text>
        </BubbleButton>
      </View>
    </BubbleSurface>
  );
}

// SeriesList renders saved local series using Bubble cards.
function SeriesList({
  colors,
  hasOpenSwipe,
  openSwipeSeriesId,
  series,
  styles,
  onDeleteSeries,
  onOpenSeries,
  onOpenSwipeSeriesChange,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly hasOpenSwipe: boolean;
  readonly openSwipeSeriesId: string | undefined;
  readonly series: readonly Series[];
  readonly styles: AppStyles;
  readonly onDeleteSeries: (series: Series, onCancel?: () => void) => void;
  readonly onOpenSeries: (seriesId: string) => void;
  readonly onOpenSwipeSeriesChange: (
    seriesId: string,
    shouldOpen: boolean,
  ) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>MY SERIES</Text>
      <View style={styles.seriesListGrid}>
        {series.map((item) => (
          <SwipeableSeriesCard
            colors={colors}
            genreLabel={genreLabels[item.genre]}
            hasOpenSwipe={hasOpenSwipe}
            isDeleting={false}
            isOpen={item.id === openSwipeSeriesId}
            key={item.id}
            series={item}
            onOpenChange={(shouldOpen: boolean): void =>
              onOpenSwipeSeriesChange(item.id, shouldOpen)
            }
            onOpenSeries={onOpenSeries}
            onRequestDelete={(onCancel: () => void): void =>
              onDeleteSeries(item, onCancel)
            }
          />
        ))}
      </View>
    </>
  );
}

// CreateSeriesModal renders the full local series setup form.
function CreateSeriesModal({
  actionError,
  canUndoGeneration,
  colors,
  errors,
  form,
  isGeneratingSetup,
  isDark,
  isSaving,
  isVisible,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onSubmit,
  onUndoGeneration,
}: {
  // actionError reports save or generation failures inside the open modal.
  readonly actionError: string | undefined;
  // canUndoGeneration reveals one in-memory rollback after a successful AI result.
  readonly canUndoGeneration: boolean;
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // errors are the visible validation messages for current form values.
  readonly errors: SeriesSetupFormErrors;
  // form is the controlled create-series state.
  readonly form: SeriesSetupFormState;
  // isGeneratingSetup disables duplicate AI setup generation.
  readonly isGeneratingSetup: boolean;
  // isDark selects the matching shared blur tint.
  readonly isDark: boolean;
  // isSaving disables duplicate local writes.
  readonly isSaving: boolean;
  // isVisible controls the native modal presentation.
  readonly isVisible: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeForm updates one or more form fields.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onClose dismisses the form without saving.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onSubmit saves an incomplete local draft or creates a complete series.
  readonly onSubmit: () => void;
  // onUndoGeneration restores the exact form snapshot from before the latest AI result.
  readonly onUndoGeneration: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset: number = insets.top;
  const bottomInset: number = insets.bottom;
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  // modalBlurTargetRef preserves the shared edge-effect source contract inside the setup modal.
  const modalBlurTargetRef: RefObject<View | null> = useRef<View>(null);
  // modalContentInsets keeps initial and final form content clear of the shared edge material.
  const modalContentInsets: ViewStyle = {
    paddingTop: topInset + 96,
    paddingBottom: bottomInset + screenEdgeDepths.modalBottom + 16,
  };
  // modalHeaderPosition floats actions above the shared top material without an opaque slab.
  const modalHeaderPosition: ViewStyle = {
    position: 'absolute',
    top: topInset,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  };

  // isBusy blocks setup controls while a save or AI setup generation runs.
  const isBusy = isSaving || isGeneratingSetup;
  // isComplete switches the single header action between draft save and creation.
  const isComplete: boolean =
    Object.keys(validateSeriesSetupForm(form)).length === 0;
  // generationActionLabel reflects the selected strategy and available creative context.
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
          blurTargetRef={modalBlurTargetRef}
          style={styles.flexOne}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.modalContent, modalContentInsets]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="always"
          >
            <View style={styles.setupSectionCard}>
              <CefrLevelSelector
                isDark={isDark}
                selectedLevel={form.cefrLevel}
                styles={styles}
                onSelect={(cefrLevel) => updateForm({ cefrLevel })}
              />
              <SeriesSetupChoiceGroup
                isDark={isDark}
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
                isWrapped
                label="Tone"
                options={storyToneOptions}
                selected={form.tone}
                styles={styles}
                onSelect={(tone) => updateForm({ tone })}
              />
              <SeriesSetupChoiceGroup
                isDark={isDark}
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
                styles={styles}
                onChange={(creativeBrief) => updateForm({ creativeBrief })}
                onFocus={scrollToField}
                onLayout={registerFieldOffset}
              />
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
                  accessibilityHint="Restores the draft from before the latest AI result"
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
              <View style={styles.setupDraftHeader}>
                <Text style={styles.setupDraftTitle}>Series draft</Text>
                <Text style={styles.formHelperText}>
                  AI suggestions stay editable. Your idea and story anchors stay fixed.
                </Text>
              </View>
              <SeriesSetupTextField
                colors={colors}
                {...(errors.title ? { error: errors.title } : {})}
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
                  fieldId="userRole"
                  helper="Required. This role becomes read-only after the first episode."
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
            {isBusy ? (
              <BubbleStatus
                colors={colors}
                tone="loading"
                title={isSaving ? 'Saving series...' : 'Generating setup...'}
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
          </ScrollView>
        </PlatformBlurTargetView>
        <ScreenEdgeEffects
          blurTarget={modalBlurTargetRef}
          bottomInset={bottomInset}
          bottomVariant="modal"
          colors={colors}
          isDark={isDark}
          materialOpacity={1}
          topInset={topInset}
        />
        <View style={[styles.modalHeader, modalHeaderPosition]}>
          <BackIconButton
            accessibilityHint="Closes series creation"
            accessibilityLabel="Back from series creation"
            colors={colors}
            onPress={onClose}
          />
          <View style={styles.modalActions}>
            <BubbleButton
              colors={colors}
              contentStyle={styles.modalSecondaryAction}
              disabled={isBusy}
              onPress={onSubmit}
              variant="secondary"
            >
              <Text style={styles.modalSecondaryActionText}>
                {isComplete ? 'Create' : 'Save draft'}
              </Text>
            </BubbleButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
