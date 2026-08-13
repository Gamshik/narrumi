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
  createNewSeriesSetupDraftId,
  newSeriesSetupDraftId,
  type LocalSeriesSetupDraft,
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
  resolveOpenSwipeRowId,
} from './home/components/SwipeableSeriesCard';
import { HomeLibrary } from './home/components/HomeLibrary';
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
  // onRequestDeleteDraft opens confirmation for one unfinished local setup.
  readonly onRequestDeleteDraft: (draft: LocalSeriesSetupDraft) => void;
};

// homeHeaderCollapseOffset starts the autonomous title transition after a deliberate upward scroll.
const homeHeaderCollapseOffset: number = 38;
// homeHeaderExpandOffset adds hysteresis so tiny scroll changes cannot toggle the header repeatedly.
const homeHeaderExpandOffset: number = 12;
// homeTitleTransitionDuration keeps the two-stage title swap quick and independent from static materials.
const homeTitleTransitionDuration: number = 220;
// homeMaterialTransitionDuration softly fades static blur and tint without directional effects.
const homeMaterialTransitionDuration: number = 180;

// SeriesSetupOpenRequest separates a fresh draft id from an explicitly selected saved draft.
type SeriesSetupOpenRequest =
  | { readonly mode: 'create' }
  | { readonly draftId: string; readonly mode: 'resume' };

// HomeScreen renders the series-first dashboard and local create-series flow.
export function HomeScreen({
  onOpenSeries,
  onRequestDeleteDraft,
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
  // series contains completed personal stories loaded from local-first persistence.
  const [series, setSeries] = useState<readonly Series[]>([]);
  // setupDrafts contains every independent unfinished new-series form stored locally.
  const [setupDrafts, setSetupDrafts] = useState<
    readonly LocalSeriesSetupDraft[]
  >([]);
  // isInitialLibraryLoading distinguishes unresolved local data from a settled empty library.
  const [isInitialLibraryLoading, setIsInitialLibraryLoading] =
    useState<boolean>(true);
  const [form, setForm] = useState<SeriesSetupFormState>(
    createEmptySeriesSetupForm,
  );
  const [formErrors, setFormErrors] = useState<SeriesSetupFormErrors>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // activeSetupDraftId identifies the fresh or resumed draft owned by the open modal.
  const [activeSetupDraftId, setActiveSetupDraftId] =
    useState<string>(newSeriesSetupDraftId);
  // openSwipeItemId keeps only one completed-series or draft delete lane visible.
  const [openSwipeItemId, setOpenSwipeItemId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  // generatingSetupTarget identifies the only card whose AI request is active.
  const [generatingSetupTarget, setGeneratingSetupTarget] =
    useState<SeriesSetupGenerationTarget>();
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

  // loadHomeLibrary resolves completed series and the local setup draft in one loading cycle.
  const loadHomeLibrary = useCallback(async (): Promise<void> => {
    try {
      const [seriesResult, draftResult] = await Promise.all([
        localAppServices.listSeries.execute(),
        localAppServices.listSeriesSetupDrafts.execute(),
      ]);

      setSeries(seriesResult.series);
      setSetupDrafts(draftResult.drafts);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Your local series and drafts could not be loaded.');
    } finally {
      setIsInitialLibraryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomeLibrary();

      return (): void => {
        setOpenSwipeItemId(undefined);
      };
    }, [loadHomeLibrary]),
  );

  const submitSeries = async (): Promise<void> => {
    const validationErrors = validateSeriesSetupForm(form);
    const isComplete: boolean = Object.keys(validationErrors).length === 0;
    // localDraft is persisted before readiness validation or online moderation.
    const localDraft: LocalSeriesSetupDraft = createLocalSeriesSetupDraft(
      form,
      activeSetupDraftId,
      new Date().toISOString(),
    );
    let isDraftSaved: boolean = false;

    setIsSaving(true);
    setFormActionError(undefined);

    try {
      await localAppServices.saveSeriesSetupDraft.execute(localDraft);
      isDraftSaved = true;
      setSetupDrafts(
        (currentDrafts: readonly LocalSeriesSetupDraft[]): readonly LocalSeriesSetupDraft[] => [
          localDraft,
          ...currentDrafts.filter(
            (draft: LocalSeriesSetupDraft): boolean =>
              draft.draftId !== localDraft.draftId,
          ),
        ],
      );

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
        .execute({ draftId: activeSetupDraftId })
        .catch(() => undefined);
      setSetupDrafts(
        (currentDrafts: readonly LocalSeriesSetupDraft[]): readonly LocalSeriesSetupDraft[] =>
          currentDrafts.filter(
            (draft: LocalSeriesSetupDraft): boolean =>
              draft.draftId !== activeSetupDraftId,
          ),
      );
      setForm(createEmptySeriesSetupForm());
      setFormErrors({});
      setIsCreateOpen(false);
      await loadHomeLibrary();
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
    // localDraft is the exact resumable snapshot displayed in Continue setup.
    const localDraft: LocalSeriesSetupDraft = createLocalSeriesSetupDraft(
      form,
      activeSetupDraftId,
      new Date().toISOString(),
    );

    setIsSaving(true);
    setFormActionError(undefined);

    try {
      await localAppServices.saveSeriesSetupDraft.execute(
        localDraft,
      );
      setSetupDrafts(
        (currentDrafts: readonly LocalSeriesSetupDraft[]): readonly LocalSeriesSetupDraft[] => [
          localDraft,
          ...currentDrafts.filter(
            (draft: LocalSeriesSetupDraft): boolean =>
              draft.draftId !== localDraft.draftId,
          ),
        ],
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

  // openSeriesSetup opens either a clean form or the draft selected from its Home row.
  const openSeriesSetup = async (
    request: SeriesSetupOpenRequest,
  ): Promise<void> => {
    if (openSwipeItemId) {
      setOpenSwipeItemId(undefined);
      return;
    }

    setFormActionError(undefined);
    // networkState is the latest presentation snapshot for the online-only AI card.
    const networkState: ConnectivityState = await localAppServices.networkStatus
      .getCurrentState()
      .catch(() => ({ isOnline: false }));

    setIsOnline(networkState.isOnline);

    if (request.mode === 'create') {
      // openedAt seeds both the new id and the first eventual local snapshot timestamp.
      const openedAt: string = new Date().toISOString();

      setActiveSetupDraftId(
        createNewSeriesSetupDraftId(openedAt, Math.random()),
      );
      setForm(createEmptySeriesSetupForm());
      setFormErrors({});
      setIsCreateOpen(true);
      return;
    }

    setActiveSetupDraftId(request.draftId);

    try {
      const result = await localAppServices.loadSeriesSetupDraft.execute({
        draftId: request.draftId,
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
    setGeneratingSetupTarget(target);
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
      setGeneratingSetupTarget(undefined);
    }
  };

  const requestDeleteSeries = (
    seriesToDelete: Series,
    onCancel?: () => void,
  ): void => {
    onRequestDeleteSeries(seriesToDelete);
    onCancel?.();
    setOpenSwipeItemId(undefined);
  };

  // requestDeleteDraft routes one local snapshot through the same confirmation pattern.
  const requestDeleteDraft = (
    draftToDelete: LocalSeriesSetupDraft,
    onCancel?: () => void,
  ): void => {
    onRequestDeleteDraft(draftToDelete);
    onCancel?.();
    setOpenSwipeItemId(undefined);
  };

  // changeOpenSwipeItem keeps a late close animation from clearing a newer row.
  const changeOpenSwipeItem = (
    itemId: string,
    shouldOpen: boolean,
  ): void => {
    setOpenSwipeItemId(
      (
        // currentItemId is the latest owner after any overlapping row animation.
        currentItemId: string | undefined,
      ): string | undefined =>
        resolveOpenSwipeRowId(currentItemId, itemId, shouldOpen),
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
    isInitialLibraryLoading,
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
            if (openSwipeItemId) {
              setOpenSwipeItemId(undefined);
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
            <HomeLibrary
              colors={colors}
              drafts={setupDrafts}
              hasOpenSwipe={openSwipeItemId !== undefined}
              openSwipeItemId={openSwipeItemId}
              series={series}
              onCreateSeries={() => void openSeriesSetup({ mode: 'create' })}
              onDeleteDraft={requestDeleteDraft}
              onDeleteSeries={requestDeleteSeries}
              onOpenSeries={onOpenSeries}
              onOpenSwipeItemChange={changeOpenSwipeItem}
              onResumeDraft={(draftId: string): void =>
                void openSeriesSetup({ draftId, mode: 'resume' })
              }
            />
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
        generatingSetupTarget={generatingSetupTarget}
        isDark={isDark}
        isOnline={isOnline}
        isSaving={isSaving}
        isVisible={isCreateOpen}
        errors={formErrors}
        styles={styles}
        variant="create"
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
