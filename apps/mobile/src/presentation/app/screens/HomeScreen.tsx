import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { BlurTargetView } from 'expo-blur';
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
  TextInput,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackIconButton,
  BubbleSurface,
  BubbleButton,
  BubbleStatus,
  CollapsingTitleEdgeEffects,
  JellyPressable,
  ScreenEdgeEffects,
  screenEdgeDepths,
} from '../shared';
import { useAppTheme } from '../theme';
import {
  lightColors,
  darkColors,
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
  const [form, setForm] = useState<SeriesFormState>(emptySeriesForm);
  const [formErrors, setFormErrors] = useState<SeriesFormErrors>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openSwipeSeriesId, setOpenSwipeSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  // blurTargetRef identifies the Home scroll surface for Expo's current Android blur API.
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
      <BlurTargetView ref={blurTargetRef} style={styles.flexOne}>
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
                onCreateSeries={() => {
                  if (openSwipeSeriesId) {
                    setOpenSwipeSeriesId(undefined);
                    return;
                  }

                  setIsCreateOpen(true);
                }}
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
      </BlurTargetView>
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
        isGeneratingSetup={isGeneratingSetup}
        isDark={isDark}
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
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
  // errors are the visible validation messages for current form values.
  readonly errors: SeriesFormErrors;
  // form is the controlled create-series state.
  readonly form: SeriesFormState;
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
  readonly onChangeForm: (form: SeriesFormState) => void;
  // onClose dismisses the form without saving.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onSubmit persists the series locally.
  readonly onSubmit: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset: number = insets.top;
  const bottomInset: number = insets.bottom;
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  // modalBlurTargetRef identifies the create-series scroll content for Android blur.
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
        style={styles.modalScreen}
      >
        <BlurTargetView ref={modalBlurTargetRef} style={styles.flexOne}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.modalContent, modalContentInsets]}
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
        </BlurTargetView>
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
