import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  type PanResponderInstance,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  BubbleSurface,
  BubbleButton,
  BubblePill,
  BubbleStatus,
  JellyPressable,
} from '../shared';
import { useAppTheme } from '../theme';
import {
  lightColors,
  darkColors,
  type AppColors,
} from '@presentation/theme';

import {
  cefrLevels,
  characterProfileNames,
  createCharacterProfileId,
  learningGenres,
  normalizeCharacterProfiles,
  seriesParticipationModes,
  type CefrLevel,
  type LearningGenre,
  type Series,
  type SeriesCharacterProfile,
  type SeriesParticipationMode,
} from '@domain/index';
import type { GenerateSeriesSetupDraftRequest } from '@application/ports';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';

// HomeScreenProps carries the shared themed style sheet into the home dashboard.
type HomeScreenProps = {
  // styles is the app-level StyleSheet contract generated from current theme colors.
  readonly styles: AppStyles;
  // onOpenSeries opens the unified Story Words and reader flow for one story.
  readonly onOpenSeries: (seriesId: string) => void;
  // onRequestDeleteSeries opens the native-like confirmation sheet for one story.
  readonly onRequestDeleteSeries: (series: Series) => void;
};

// SeriesFormState stores the controlled local create-series sheet fields.
type SeriesFormState = {
  // title is the required visible series name.
  readonly title: string;
  // genre is the approved MVP story category.
  readonly genre: LearningGenre;
  // cefrLevel is the target grammar level for future episodes.
  readonly cefrLevel: CefrLevel;
  // tone is the short mood descriptor for future generation.
  readonly tone: string;
  // premise is the required initial story setup.
  readonly premise: string;
  // participationMode controls whether the learner directs events or roleplays.
  readonly participationMode: SeriesParticipationMode;
  // characterProfiles store pinned dialogue names and AI-facing descriptions.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
  // userRole is the learner's optional role inside the story.
  readonly userRole: string;
};

// SeriesFormErrors stores visible validation messages by field.
type SeriesFormErrors = Partial<
  Record<keyof SeriesFormState | 'mainCharacters', string>
>;

// storyToneOptions limits tone to safe generation presets.
const storyToneOptions = [
  'Warm and curious',
  'Calm detective',
  'Light adventure',
  'Everyday realistic',
  'Cinematic mystery',
] as const;

// genreLabels maps domain genre values to compact labels for the home screen.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'short-fiction': 'Short Fiction',
  'travel-leisure': 'Travel',
  'work-it': 'Work & IT',
};

// participationModeLabels keeps the setup mode wording compact in mobile controls.
const participationModeLabels: Record<SeriesParticipationMode, string> = {
  director: 'Producer',
  character: 'Character',
};

// emptySeriesForm is the initial create-series sheet state.
const emptySeriesForm: SeriesFormState = {
  title: '',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: storyToneOptions[0],
  premise: '',
  participationMode: 'director',
  characterProfiles: [],
  userRole: '',
};

// swipeOpenOffset is the resting reveal distance for the destructive bubble.
const swipeOpenOffset = -84;
// swipeOpenThreshold is the deliberate half-swipe distance that snaps open.
const swipeOpenThreshold = -58;
// closeSwipeTapSlop is the max finger drift still treated as a closing tap.
const closeSwipeTapSlop = 8;

// TouchPoint stores absolute screen coordinates for tap-vs-drag detection.
type TouchPoint = {
  // x is the absolute horizontal finger position.
  readonly x: number;
  // y is the absolute vertical finger position.
  readonly y: number;
};

// HomeScreen renders the series-first dashboard and local create-series flow.
export function HomeScreen({
  onOpenSeries,
  onRequestDeleteSeries,
  styles,
}: HomeScreenProps): ReactElement {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const [series, setSeries] = useState<readonly Series[]>([]);
  const [form, setForm] = useState<SeriesFormState>(emptySeriesForm);
  const [formErrors, setFormErrors] = useState<SeriesFormErrors>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSeriesSwipeActive, setIsSeriesSwipeActive] = useState(false);
  const [openSwipeSeriesId, setOpenSwipeSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const closeSwipeTouchStartRef = useRef<TouchPoint | undefined>(undefined);
  const isDeleteActionTouchRef = useRef(false);

  const loadSeries = useCallback(async (): Promise<void> => {
    try {
      const result = await localAppServices.listSeries.execute();

      setSeries(result.series);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Local series could not be loaded.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSeries();

      return (): void => {
        setOpenSwipeSeriesId(undefined);
        setIsSeriesSwipeActive(false);
        closeSwipeTouchStartRef.current = undefined;
        isDeleteActionTouchRef.current = false;
      };
    }, [loadSeries]),
  );

  const submitSeries = async (): Promise<void> => {
    const validationErrors = validateSeriesForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);

      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await localAppServices.createSeries.execute({
        title: form.title,
        genre: form.genre,
        cefrLevel: form.cefrLevel,
        tone: form.tone,
        premise: form.premise,
        participationMode: form.participationMode,
        mainCharacters: characterProfileNames(form.characterProfiles),
        characterProfiles: form.characterProfiles,
        ...(form.participationMode === 'character' && form.userRole.trim()
          ? { userRole: form.userRole }
          : {}),
      });
      setForm(emptySeriesForm);
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
          message,
        );
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSetupDraft = async (): Promise<void> => {
    setIsGeneratingSetup(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.generateSeriesSetupDraft.execute(
        buildSetupDraftRequest(form),
      );

      setForm({
        ...form,
        title: result.draft.title,
        premise: result.draft.premise,
        characterProfiles: result.draft.characterProfiles,
        userRole:
          form.participationMode === 'character'
            ? result.draft.userRole ?? form.userRole
            : '',
      });
      setFormErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.';

      setErrorMessage(message);
    } finally {
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

  const recordCloseSwipeTouchStart = (
    pageX: number,
    pageY: number,
  ): void => {
    closeSwipeTouchStartRef.current = { x: pageX, y: pageY };
  };

  const closeOpenSwipeAfterTap = (
    pageX: number,
    pageY: number,
  ): void => {
    const startPoint = closeSwipeTouchStartRef.current;

    closeSwipeTouchStartRef.current = undefined;

    if (isDeleteActionTouchRef.current) {
      return;
    }

    if (!openSwipeSeriesId || !startPoint) {
      return;
    }

    const movedX = Math.abs(pageX - startPoint.x);
    const movedY = Math.abs(pageY - startPoint.y);

    if (movedX <= closeSwipeTapSlop && movedY <= closeSwipeTapSlop) {
      setOpenSwipeSeriesId(undefined);
    }
  };

  const markDeleteActionTouch = (): void => {
    isDeleteActionTouchRef.current = true;
  };

  const releaseDeleteActionTouch = (): void => {
    setTimeout((): void => {
      isDeleteActionTouchRef.current = false;
    }, 120);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        onTouchEnd={(event) => {
          closeOpenSwipeAfterTap(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
        }}
        onTouchStart={(event) => {
          recordCloseSwipeTouchStart(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          );
        }}
        scrollEnabled={!isSeriesSwipeActive}
      >
        <HomeHeader styles={styles} />
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
        <CreateHero
          colors={colors}
          hasSeries={series.length > 0}
          styles={styles}
          onCreateSeries={() => {
            if (openSwipeSeriesId) {
              setOpenSwipeSeriesId(undefined);
              return;
            }

            setIsCreateOpen(true);
          }}
        />
        {series.length > 0 ? (
          <SeriesList
            colors={colors}
            hasOpenSwipe={openSwipeSeriesId !== undefined}
            openSwipeSeriesId={openSwipeSeriesId}
            series={series}
            styles={styles}
            onDeleteSeries={requestDeleteSeries}
            onDeleteActionTouchEnd={releaseDeleteActionTouch}
            onDeleteActionTouchStart={markDeleteActionTouch}
            onOpenSeries={onOpenSeries}
            onOpenSwipeSeriesChange={setOpenSwipeSeriesId}
            onSwipeActiveChange={setIsSeriesSwipeActive}
          />
        ) : null}
      </ScrollView>
      <CreateSeriesModal
        colors={colors}
        form={form}
        isGeneratingSetup={isGeneratingSetup}
        isSaving={isSaving}
        isVisible={isCreateOpen}
        errors={formErrors}
        styles={styles}
        onChangeForm={(nextForm) => {
          setForm(nextForm);
          setFormErrors((currentErrors) =>
            Object.keys(currentErrors).length > 0
              ? validateSeriesForm(nextForm)
              : {},
          );
        }}
        onClose={() => {
          setForm(emptySeriesForm);
          setFormErrors({});
          setIsCreateOpen(false);
        }}
        onGenerate={generateSetupDraft}
        onSubmit={submitSeries}
      />
    </>
  );
}

// HomeHeader owns the app title and status information.
function HomeHeader({
  styles,
}: Pick<HomeScreenProps, 'styles'>): ReactElement {
  return (
    <View style={styles.homeHeader}>
      <View>
        <Text style={styles.largeTitle}>Context-English</Text>
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
    <View style={styles.heroSurface}>
      <View style={styles.heroContent}>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Create a story</Text>
          <Text style={styles.heroText}>
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
          variant="primary"
        >
          <Text style={styles.heroButtonText}>New Series</Text>
        </BubbleButton>
      </View>
    </View>
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
  onDeleteActionTouchEnd,
  onDeleteActionTouchStart,
  onOpenSeries,
  onOpenSwipeSeriesChange,
  onSwipeActiveChange,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly hasOpenSwipe: boolean;
  readonly openSwipeSeriesId: string | undefined;
  readonly series: readonly Series[];
  readonly styles: AppStyles;
  readonly onDeleteSeries: (series: Series, onCancel?: () => void) => void;
  readonly onDeleteActionTouchEnd: () => void;
  readonly onDeleteActionTouchStart: () => void;
  readonly onOpenSeries: (seriesId: string) => void;
  readonly onOpenSwipeSeriesChange: (seriesId: string | undefined) => void;
  readonly onSwipeActiveChange: (isActive: boolean) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>MY SERIES</Text>
      <View style={styles.seriesListGrid}>
        {series.map((item) => (
          <SeriesCard
            colors={colors}
            hasOpenSwipe={hasOpenSwipe}
            isDeleting={false}
            isSwipeOpen={item.id === openSwipeSeriesId}
            key={item.id}
            series={item}
            styles={styles}
            onDeleteSeries={onDeleteSeries}
            onDeleteActionTouchEnd={onDeleteActionTouchEnd}
            onDeleteActionTouchStart={onDeleteActionTouchStart}
            onOpenSeries={onOpenSeries}
            onOpenSwipeSeriesChange={onOpenSwipeSeriesChange}
            onSwipeActiveChange={onSwipeActiveChange}
          />
        ))}
      </View>
    </>
  );
}

// SwipeToDeleteWrapper exposes one fixed delete reveal position behind a card.
function SwipeToDeleteWrapper({
  children,
  colors,
  isDeleting,
  isOpen,
  onOpenChange,
  onDeleteActionTouchEnd,
  onDeleteActionTouchStart,
  onRequestDelete,
  onSwipeActiveChange,
}: {
  readonly children: ReactElement;
  readonly colors: AppColors;
  readonly isDeleting: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onDeleteActionTouchEnd: () => void;
  readonly onDeleteActionTouchStart: () => void;
  readonly onRequestDelete: (onCancel: () => void) => void;
  readonly onSwipeActiveChange: (isActive: boolean) => void;
}): ReactElement {
  const [pan] = useState(() => new Animated.ValueXY());
  const [isActionLaneVisible, setIsActionLaneVisible] = useState(isOpen);
  const isOpenRef = useRef(false);
  const startTranslateXRef = useRef(0);

  // isOpenRef mirrors React state for PanResponder callbacks created once.
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setIsActionLaneVisible(true);
    }
  }, [isOpen]);

  // finishSwipe marks the swipe gesture inactive after release or cancellation.
  const finishSwipe = useCallback((): void => {
    onSwipeActiveChange(false);
  }, [onSwipeActiveChange]);

  // animateTo settles the card with one shared spring profile.
  const animateTo = useCallback((x: number, onComplete?: () => void): void => {
    Animated.spring(pan, {
      toValue: { x, y: 0 },
      useNativeDriver: true,
      speed: 20,
      bounciness: 9,
    }).start(({ finished }): void => {
      if (finished) {
        onComplete?.();
      }
    });
  }, [pan]);

  useEffect((): void => {
    if (!isOpen) {
      animateTo(0, () => setIsActionLaneVisible(false));
    }
  }, [animateTo, isOpen]);

  // closeSwipe returns the card to its resting position after a cancelled delete.
  const closeSwipe = useCallback((): void => {
    onOpenChange(false);
    animateTo(0, () => setIsActionLaneVisible(false));
  }, [animateTo, onOpenChange]);

  // requestDelete keeps destructive action behind explicit user approval.
  const requestDelete = useCallback((): void => {
    onRequestDelete(closeSwipe);
  }, [closeSwipe, onRequestDelete]);

  const [panResponder, setPanResponder] = useState<PanResponderInstance>();

  useEffect((): void => {
    setPanResponder(PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.65;
        const isMeaningfulMove = Math.abs(gestureState.dx) > 10;
        // Open cards only capture rightward drags because there is no far-delete state.
        const isAllowedDirection = isOpenRef.current
          ? gestureState.dx > 0
          : gestureState.dx < 0;

        return isHorizontalSwipe && isMeaningfulMove && isAllowedDirection;
      },
      // Capture only deliberate horizontal movement so vertical list scrolling stays free.
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.65;
        const isMeaningfulMove = Math.abs(gestureState.dx) > 10;
        // Open cards only capture rightward drags because there is no far-delete state.
        const isAllowedDirection = isOpenRef.current
          ? gestureState.dx > 0
          : gestureState.dx < 0;

        return isHorizontalSwipe && isMeaningfulMove && isAllowedDirection;
      },
      // When PanResponder captures, freeze the current snap point as the drag origin.
      onPanResponderGrant: () => {
        setIsActionLaneVisible(true);
        onSwipeActiveChange(true);
        pan.stopAnimation();
        startTranslateXRef.current = isOpenRef.current ? swipeOpenOffset : 0;
        pan.setValue({ x: startTranslateXRef.current, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextX = Math.min(
          0,
          Math.max(
            swipeOpenOffset,
            startTranslateXRef.current + gestureState.dx,
          ),
        );

        pan.setValue({ x: nextX, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        const releaseX = Math.min(
          0,
          Math.max(
            swipeOpenOffset,
            startTranslateXRef.current + gestureState.dx,
          ),
        );

        finishSwipe();

        if (releaseX < swipeOpenThreshold) {
          onOpenChange(true);
          animateTo(swipeOpenOffset);
          return;
        }

        onOpenChange(false);
        animateTo(0, () => setIsActionLaneVisible(false));
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        // Interruptions close the action lane so list scrolling recovers predictably.
        finishSwipe();
        onOpenChange(false);
        animateTo(0, () => setIsActionLaneVisible(false));
      },
    }));
  }, [
    animateTo,
    finishSwipe,
    onOpenChange,
    onSwipeActiveChange,
    pan,
  ]);

  // translateX keeps the card between its resting point and the single delete reveal.
  const translateX = pan.x.interpolate({
    inputRange: [swipeOpenOffset, 0],
    outputRange: [swipeOpenOffset, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ position: 'relative', borderRadius: 24, overflow: 'hidden' }}>
      <View
        pointerEvents={isActionLaneVisible ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: 12,
          opacity: isActionLaneVisible ? 1 : 0,
        }}
      >
        <BubbleButton
          colors={colors}
          disabled={isDeleting}
          onPress={requestDelete}
          onPressIn={onDeleteActionTouchStart}
          onPressOut={onDeleteActionTouchEnd}
          variant="danger"
          contentStyle={{ height: 64, paddingHorizontal: 0, width: 64 }}
        >
          <TrashBubbleIcon color="#ffffff" />
        </BubbleButton>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...(panResponder?.panHandlers ?? {})}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// TrashBubbleIcon draws the destructive action as an in-app SVG glyph.
function TrashBubbleIcon({ color }: { readonly color: string }): ReactElement {
  return (
    <Svg
      accessibilityLabel="Delete"
      height={30}
      viewBox="0 0 32 32"
      width={30}
    >
      <Rect
        fill="none"
        height={16}
        rx={4}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
        width={16}
        x={8}
        y={12}
      />
      <Path
        d="M6 10h20"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.6}
      />
      <Path
        d="M12 10V7.8C12 6.2 13.2 5 14.8 5h2.4C18.8 5 20 6.2 20 7.8V10"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
      <Path
        d="M13 16v7M19 16v7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

// SeriesCard displays one saved local series and its generation gate.
function SeriesCard({
  colors,
  hasOpenSwipe,
  isDeleting,
  isSwipeOpen,
  series,
  styles,
  onDeleteSeries,
  onDeleteActionTouchEnd,
  onDeleteActionTouchStart,
  onOpenSeries,
  onOpenSwipeSeriesChange,
  onSwipeActiveChange,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly hasOpenSwipe: boolean;
  readonly isDeleting: boolean;
  readonly isSwipeOpen: boolean;
  readonly series: Series;
  readonly styles: AppStyles;
  readonly onDeleteSeries: (series: Series, onCancel?: () => void) => void;
  readonly onDeleteActionTouchEnd: () => void;
  readonly onDeleteActionTouchStart: () => void;
  readonly onOpenSeries: (seriesId: string) => void;
  readonly onOpenSwipeSeriesChange: (seriesId: string | undefined) => void;
  readonly onSwipeActiveChange: (isActive: boolean) => void;
}): ReactElement {
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const hadOpenSwipeAtPressStartRef = useRef(false);
  const wasOpenAtPressStartRef = useRef(false);
  const updateSwipeActive = useCallback((isActive: boolean): void => {
    setIsSwipeActive(isActive);
    onSwipeActiveChange(isActive);
  }, [onSwipeActiveChange]);
  const setSwipeOpen = useCallback((shouldOpen: boolean): void => {
    onOpenSwipeSeriesChange(shouldOpen ? series.id : undefined);
  }, [onOpenSwipeSeriesChange, series.id]);

  return (
    <SwipeToDeleteWrapper
      colors={colors}
      isDeleting={isDeleting}
      isOpen={isSwipeOpen}
      onDeleteActionTouchEnd={onDeleteActionTouchEnd}
      onDeleteActionTouchStart={onDeleteActionTouchStart}
      onOpenChange={setSwipeOpen}
      onRequestDelete={(onCancel) => onDeleteSeries(series, onCancel)}
      onSwipeActiveChange={updateSwipeActive}
    >
      <JellyPressable
        disabled={isDeleting || isSwipeActive}
        pressedOpacityTo={1}
        onPressIn={() => {
          hadOpenSwipeAtPressStartRef.current = hasOpenSwipe;
          wasOpenAtPressStartRef.current = isSwipeOpen;
        }}
        onPress={() => {
          if (
            hadOpenSwipeAtPressStartRef.current ||
            wasOpenAtPressStartRef.current ||
            hasOpenSwipe ||
            isSwipeOpen
          ) {
            setSwipeOpen(false);
            return;
          }

          onOpenSeries(series.id);
        }}
      >
        <BubbleSurface colors={colors} style={styles.seriesCard} variant="card">
          <View style={styles.seriesCardHeader}>
            <View style={styles.seriesCardHeaderLeft}>
              <Text numberOfLines={1} style={styles.actionTitle}>
                {series.title}
              </Text>
              <Text numberOfLines={1} style={styles.secondaryText}>
                {genreLabels[series.genre]} · {series.tone}
              </Text>
            </View>
            <BubblePill colors={colors} style={styles.seriesCardBadge} tone="primary">
              <Text style={styles.seriesCardBadgeText}>{series.cefrLevel}</Text>
            </BubblePill>
          </View>
          {isDeleting && (
            <View style={styles.seriesCardFooter}>
              <BubbleStatus
                colors={colors}
                title="Deleting"
                tone="loading"
                variant="compact"
              />
            </View>
          )}
        </BubbleSurface>
      </JellyPressable>
    </SwipeToDeleteWrapper>
  );
}

// CreateSeriesModal renders the full local series setup form.
function CreateSeriesModal({
  colors,
  errors,
  form,
  isGeneratingSetup,
  isSaving,
  isVisible,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onSubmit,
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // errors are the visible validation messages for current form values.
  readonly errors: SeriesFormErrors;
  // form is the controlled create-series state.
  readonly form: SeriesFormState;
  // isGeneratingSetup disables duplicate AI setup generation.
  readonly isGeneratingSetup: boolean;
  // isSaving disables duplicate local writes.
  readonly isSaving: boolean;
  // isVisible controls the native modal presentation.
  readonly isVisible: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeForm updates one or more form fields.
  readonly onChangeForm: (form: SeriesFormState) => void;
  // onClose dismisses the form without saving.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onSubmit persists the series locally.
  readonly onSubmit: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 62);
  const bottomInset = Math.max(insets.bottom, 18);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});

  // isBusy blocks setup controls while a save or AI setup generation runs.
  const isBusy = isSaving || isGeneratingSetup;

  const updateForm = (patch: Partial<SeriesFormState>): void => {
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

  return (
    <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={[styles.modalScreen, { paddingTop: topInset }]}
      >
        <View style={styles.modalHeader}>
          <JellyPressable
            onPress={onClose}
            style={styles.modalIconButton}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Text style={styles.modalIconText}>←</Text>
          </JellyPressable>
          <View style={styles.modalActions}>
            <BubbleButton
              colors={colors}
              contentStyle={styles.modalPrimaryAction}
              disabled={isBusy}
              onPress={onGenerate}
              variant="primary"
            >
              <Text style={styles.modalPrimaryActionText}>Generate</Text>
            </BubbleButton>
            <BubbleButton
              colors={colors}
              contentStyle={styles.modalSecondaryAction}
              disabled={isBusy}
              onPress={onSubmit}
              variant="secondary"
            >
              <Text style={styles.modalSecondaryActionText}>Save</Text>
            </BubbleButton>
          </View>
        </View>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.modalContent,
            { paddingBottom: bottomInset + 12 },
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.setupSectionCard}>
            <ChoiceGroup
              label="CEFR Level"
              options={cefrLevels}
              selected={form.cefrLevel}
              styles={styles}
              onSelect={(cefrLevel) => updateForm({ cefrLevel })}
            />
            <ChoiceGroup
              isWrapped
              label="Genre"
              options={learningGenres}
              selected={form.genre}
              styles={styles}
              labels={genreLabels}
              onSelect={(genre) => updateForm({ genre })}
            />
            <ChoiceGroup
              isWrapped
              label="Tone"
              options={storyToneOptions}
              selected={form.tone}
              styles={styles}
              onSelect={(tone) => updateForm({ tone })}
            />
            <ChoiceGroup
              label="Mode"
              options={seriesParticipationModes}
              selected={form.participationMode}
              styles={styles}
              labels={participationModeLabels}
              onSelect={(participationMode) =>
                updateForm({
                  participationMode,
                  ...(participationMode === 'director' ? { userRole: '' } : {}),
                })
              }
            />

            <FormField
              colors={colors}
              {...(errors.title ? { error: errors.title } : {})}
              fieldId="title"
              label="Title"
              placeholder="Orbit Letters"
              styles={styles}
              value={form.title}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(title) => updateForm({ title })}
            />
            <FormField
              colors={colors}
              {...(errors.premise ? { error: errors.premise } : {})}
              fieldId="premise"
              helper="Required. Use Generate if you want the AI to fill it."
              isMultiline
              label="Premise"
              placeholder="A learner receives strange English notes from a future city."
              styles={styles}
              value={form.premise}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(premise) => updateForm({ premise })}
            />
            <FormField
              colors={colors}
              {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
              fieldId="characterProfiles"
              helper="Required. Speaker names stay fixed in dialogue; descriptions guide the AI."
              label="Characters"
              placeholder="Mira"
              styles={styles}
              value={characterProfileNames(form.characterProfiles).join(', ')}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(mainCharacters) =>
                updateForm({
                  characterProfiles: parseCharacterProfilesFromNames(mainCharacters),
                })
              }
            />
            {form.participationMode === 'character' ? (
              <FormField
                colors={colors}
                {...(errors.userRole ? { error: errors.userRole } : {})}
                fieldId="userRole"
                helper="Required. This role becomes read-only after the first episode."
                isCompactMultiline
                label="Your Role"
                placeholder="New analyst"
                styles={styles}
                value={form.userRole}
                onFocus={scrollToField}
                onLayout={registerFieldOffset}
                onChangeText={(userRole) => updateForm({ userRole })}
              />
            ) : null}
          </View>
          <CharacterProfilesEditor
            colors={colors}
            profiles={form.characterProfiles}
            styles={styles}
            onChange={(characterProfiles) => updateForm({ characterProfiles })}
          />
          {isBusy ? (
            <BubbleStatus
              colors={colors}
              tone="loading"
              title={isSaving ? 'Saving series...' : 'Generating setup...'}
              variant="row"
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// FormField renders one native text input row in the create-series sheet.
function FormField({
  colors,
  error,
  fieldId,
  helper,
  isCompactMultiline = false,
  isMultiline = false,
  label,
  placeholder,
  styles,
  value,
  onFocus,
  onLayout,
  onChangeText,
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // error is the visible validation message for this field.
  readonly error?: string;
  // fieldId identifies the field for keyboard-aware autoscroll.
  readonly fieldId: string;
  // helper explains optional fields without blocking submission.
  readonly helper?: string;
  // isCompactMultiline gives short multi-line fields more touch and reading space.
  readonly isCompactMultiline?: boolean;
  // isMultiline selects paragraph input behavior for premise text.
  readonly isMultiline?: boolean;
  // label is the visible form field title.
  readonly label: string;
  // placeholder is a concrete example, not stored as data.
  readonly placeholder: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // value is the controlled input value.
  readonly value: string;
  // onFocus scrolls the field above the keyboard when editing starts.
  readonly onFocus: (fieldId: string) => void;
  // onLayout registers the field position inside the modal scroll view.
  readonly onLayout: (fieldId: string, offsetY: number) => void;
  // onChangeText updates the controlled value.
  readonly onChangeText: (value: string) => void;
}): ReactElement {
  return (
    <View
      onLayout={(event) => onLayout(fieldId, event.nativeEvent.layout.y)}
      style={styles.formGroup}
    >
      <View style={styles.formLabelRow}>
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      <TextInput
        multiline={isMultiline || isCompactMultiline}
        onChangeText={onChangeText}
        onFocus={() => onFocus(fieldId)}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholder.color}
        style={[
          styles.formInput,
          isMultiline && styles.formTextArea,
          isCompactMultiline && styles.formCompactTextArea,
        ]}
        textAlignVertical={isMultiline || isCompactMultiline ? 'top' : 'center'}
        value={value}
      />
      {error ? (
        <BubbleStatus colors={colors} tone="error" title={error} variant="compact" />
      ) : null}
      {!error && helper ? (
        <Text style={styles.formHelperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

// CharacterProfilesEditor renders pinned speaker names with separate AI descriptions.
function CharacterProfilesEditor({
  colors,
  profiles,
  styles,
  onChange,
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // profiles are the editable character rows for the setup form.
  readonly profiles: readonly SeriesCharacterProfile[];
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChange publishes normalized character rows back to the parent form.
  readonly onChange: (profiles: readonly SeriesCharacterProfile[]) => void;
}): ReactElement {
  const updateProfile = (
    index: number,
    patch: Partial<SeriesCharacterProfile>,
  ): void => {
    onChange(
      profiles.map((profile, profileIndex) =>
        profileIndex === index ? { ...profile, ...patch } : profile,
      ),
    );
  };
  const addProfile = (): void => {
    const nextIndex = profiles.length;
    const name = `Character ${nextIndex + 1}`;

    onChange([
      ...profiles,
      {
        id: createCharacterProfileId(name, nextIndex),
        name,
        description: '',
      },
    ]);
  };
  const removeProfile = (index: number): void => {
    onChange(profiles.filter((_profile, profileIndex) => profileIndex !== index));
  };

  return (
    <View style={styles.characterSectionCard}>
      <Text style={styles.sectionLabel}>CHARACTERS</Text>
      {profiles.map((profile, index) => (
        <BubbleSurface
          key={profile.id}
          colors={colors}
          tone="neutral"
          variant="card"
          style={styles.characterCard}
        >
          <View style={styles.formLabelRow}>
            <TextInput
              onChangeText={(name) => updateProfile(index, { name })}
              placeholder="Corbin"
              placeholderTextColor={styles.placeholder.color}
              style={[styles.formInput, styles.characterNameInput]}
              value={profile.name}
            />
            <JellyPressable
              onPress={() => removeProfile(index)}
              style={({ pressed }) => [
                styles.fieldActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.fieldActionText}>Remove</Text>
            </JellyPressable>
          </View>
          <TextInput
            multiline
            onChangeText={(description) => updateProfile(index, { description })}
            placeholder="A careful detective who notices small contradictions."
            placeholderTextColor={styles.placeholder.color}
            style={[styles.formInput, styles.formCompactTextArea]}
            textAlignVertical="top"
            value={profile.description}
          />
        </BubbleSurface>
      ))}
      <JellyPressable
        onPress={addProfile}
        style={({ pressed }) => [styles.secondarySmallButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondarySmallButtonText}>Add Character</Text>
      </JellyPressable>
    </View>
  );
}

// ChoiceGroup renders a compact segmented group for typed string options.
function ChoiceGroup<T extends string>({
  label,
  labels,
  options,
  selected,
  styles,
  isWrapped,
  onSelect,
}: {
  // label names the option group for the form.
  readonly label: string;
  // labels optionally maps domain values to user-facing text.
  readonly labels?: Partial<Record<T, string>>;
  // options are the allowed typed values.
  readonly options: readonly T[];
  // selected is the currently selected typed value.
  readonly selected: T;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // isWrapped controls whether choices flow in multiple rows of chips.
  readonly isWrapped?: boolean;
  // onSelect updates the selected typed value.
  readonly onSelect: (value: T) => void;
}): ReactElement {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={isWrapped ? styles.choiceRowWrapped : styles.choiceRowSingle}>
        {options.map((option) => (
          <JellyPressable
            key={option}
            onPress={() => onSelect(option)}
            containerStyle={isWrapped ? styles.goalChoiceWrappedContainer : styles.goalChoiceSingleContainer}
            style={({ pressed }) => [
              isWrapped ? styles.goalChoiceWrapped : styles.goalChoiceSingle,
              option === selected && (isWrapped ? styles.activeGoalChoiceWrapped : styles.activeGoalChoice),
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                isWrapped ? styles.goalChoiceTextWrapped : styles.goalChoiceText,
                option === selected && (isWrapped ? styles.activeGoalChoiceTextWrapped : styles.activeGoalChoiceText),
              ]}
            >
              {labels?.[option] ?? option}
            </Text>
          </JellyPressable>
        ))}
      </View>
    </View>
  );
}

// buildSetupDraftRequest maps the current form into the AI setup request without optional empties.
// Selected list options are always sent; optional text is included only when the learner filled it.
function buildSetupDraftRequest(
  form: SeriesFormState,
): GenerateSeriesSetupDraftRequest {
  return {
    genre: form.genre,
    cefrLevel: form.cefrLevel,
    tone: form.tone,
    participationMode: form.participationMode,
    ...(form.title.trim() ? { title: form.title } : {}),
    ...(form.premise.trim() ? { premise: form.premise } : {}),
    mainCharacters: characterProfileNames(form.characterProfiles),
    characterProfiles: form.characterProfiles,
    ...(form.participationMode === 'character' && form.userRole.trim()
      ? { userRole: form.userRole }
      : {}),
  };
}

// validateSeriesForm keeps local creation errors visible before persistence.
function validateSeriesForm(form: SeriesFormState): SeriesFormErrors {
  const errors: SeriesFormErrors = {};

  if (form.title.trim().length === 0) {
    errors.title = 'Enter a series title.';
  }

  if (form.premise.trim().length === 0) {
    errors.premise = 'Enter a premise or use Generate.';
  }

  if (normalizeCharacterProfiles(form.characterProfiles).length === 0) {
    errors.mainCharacters = 'Enter at least one character or use Generate.';
  }

  if (
    form.participationMode === 'character' &&
    form.userRole.trim().length === 0
  ) {
    errors.userRole = 'Enter your role for character mode.';
  }

  return errors;
}

// parseCharacterProfilesFromNames converts a compact name list into editable profiles.
function parseCharacterProfilesFromNames(
  value: string,
): readonly SeriesCharacterProfile[] {
  return normalizeCharacterProfiles(
    value
      .split(',')
      .map((character) => character.trim())
      .filter((character) => character.length > 0)
      .map((name, index) => ({
        id: createCharacterProfileId(name, index),
        name,
        description: '',
      })),
  );
}
