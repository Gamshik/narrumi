import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
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

import {
  BubbleSurface,
  BubbleButton,
  BubbleStatus,
  CollapsingTitleEdgeEffects,
  PlatformBlurTargetView,
} from '../shared';
import { useAppTheme } from '../theme';
import {
  lightColors,
  darkColors,
} from '@presentation/theme';

import {
  characterProfileNames,
  newSeriesSetupDraftId,
  type Series,
} from '@domain/index';
import type {
  ConnectivityState,
  SeriesSetupGenerationTarget,
} from '@application/ports';
import type {
  GenerateSeriesSetupDraftInput,
  GenerateSeriesSetupDraftResult,
} from '@application/useCases';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import { floatingTabBarMetrics } from '@presentation/theme/layout';
import { HomeSeriesSkeleton } from './home/components/HomeSeriesSkeleton';
import { CreateSeriesFlow } from './home/components/CreateSeriesFlow';
import {
  resolveOpenSwipeSeriesId,
  SwipeableSeriesCard,
} from './home/components/SwipeableSeriesCard';
import {
  getHomeContentState,
  type HomeContentState,
} from './home/homeContentState';
import {
  applyTargetedSeriesSetupDraft,
  buildTargetedSeriesSetupDraftRequest,
} from './seriesSetupDraftRequest';
import {
  createLocalSeriesSetupDraft,
  createEmptySeriesSetupForm,
  createSimpleSeriesSetupFormFromDraft,
  participationModeLabels,
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openSwipeSeriesId, setOpenSwipeSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  // isOnline keeps the setup AI action disabled when the current network snapshot is offline.
  const [isOnline, setIsOnline] = useState<boolean>(false);
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
        setFormErrors({});
        setIsCreateOpen(false);
        return;
      }

      await localAppServices.createSeries.execute({
        title: form.title,
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

  // saveSetupDraft persists every card value locally without creating a ready series.
  const saveSetupDraft = async (): Promise<void> => {
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
      setForm(createEmptySeriesSetupForm());
      setFormErrors({});
      setIsCreateOpen(false);
    } catch (error) {
      const message: string =
        error instanceof Error
          ? error.message
          : 'Your local series draft could not be saved.';

      setFormActionError(message);
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
    // networkState is the latest presentation snapshot for the online-only AI card.
    const networkState: ConnectivityState = await localAppServices.networkStatus
      .getCurrentState()
      .catch(() => ({ isOnline: false }));

    setIsOnline(networkState.isOnline);

    try {
      const result = await localAppServices.loadSeriesSetupDraft.execute({
        draftId: newSeriesSetupDraftId,
      });

      setForm(
        result.draft
          ? createSimpleSeriesSetupFormFromDraft(result.draft)
          : createEmptySeriesSetupForm(),
      );
    } catch {
      setForm(createEmptySeriesSetupForm());
      setFormActionError('Your local draft could not be loaded.');
    }

    setFormErrors({});
    setIsCreateOpen(true);
  };

  // generateSetupField replaces only the visible field owned by the current card.
  const generateSetupField = async (
    target: SeriesSetupGenerationTarget,
  ): Promise<boolean> => {
    if (setupGenerationLockRef.current) {
      return false;
    }

    setupGenerationLockRef.current = true;
    setIsGeneratingSetup(true);
    setFormActionError(undefined);

    try {
      // generationRequest clears only the current card before crossing the AI boundary.
      const generationRequest: GenerateSeriesSetupDraftInput =
        buildTargetedSeriesSetupDraftRequest(form, target);
      // result is a complete validated setup even though presentation applies one target.
      const result: GenerateSeriesSetupDraftResult =
        await localAppServices.generateSeriesSetupDraft.execute(
          generationRequest,
        );
      // generatedForm applies only the requested card even though the gateway validates a full draft.
      const generatedForm: SeriesSetupFormState =
        applyTargetedSeriesSetupDraft(
          form,
          target,
          result.draft,
        );

      setForm(generatedForm);
      setFormErrors((currentErrors: SeriesSetupFormErrors) =>
        Object.keys(currentErrors).length > 0
          ? validateSeriesSetupForm(generatedForm)
          : {},
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.';

      setFormActionError(message);
      return false;
    } finally {
      setupGenerationLockRef.current = false;
      setIsGeneratingSetup(false);
    }
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
      <CreateSeriesFlow
        colors={colors}
        form={form}
        actionError={formActionError}
        isGeneratingSetup={isGeneratingSetup}
        isDark={isDark}
        isOnline={isOnline}
        isSaving={isSaving}
        isVisible={isCreateOpen}
        errors={formErrors}
        styles={styles}
        onChangeForm={(nextForm: SeriesSetupFormState): void => {
          setFormActionError(undefined);
          setForm(nextForm);
          setFormErrors((currentErrors: SeriesSetupFormErrors) =>
            Object.keys(currentErrors).length > 0
              ? validateSeriesSetupForm(nextForm)
              : {},
          );
        }}
        onClose={(): void => {
          setForm(createEmptySeriesSetupForm());
          setFormErrors({});
          setFormActionError(undefined);
          setIsCreateOpen(false);
        }}
        onGenerate={generateSetupField}
        onSaveDraft={saveSetupDraft}
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
            modeLabel={participationModeLabels[item.participationMode]}
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
