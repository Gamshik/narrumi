import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BubbleSurface,
  BubbleButton,
  BubblePill,
  BubbleStatus,
  JellyPressable,
} from '../shared';
import { useAppTheme } from '../theme';
import { lightColors, darkColors } from '@presentation/theme';

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

// HomeScreen renders the series-first dashboard and local create-series flow.
export function HomeScreen({
  onOpenSeries,
  styles,
}: HomeScreenProps): ReactElement {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const [series, setSeries] = useState<readonly Series[]>([]);
  const [form, setForm] = useState<SeriesFormState>(emptySeriesForm);
  const [formErrors, setFormErrors] = useState<SeriesFormErrors>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingSeriesId, setDeletingSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadSeries = useCallback(async (): Promise<void> => {
    try {
      const result = await localAppServices.listSeries.execute();

      setSeries(result.series);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Local series could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

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

  const requestDeleteSeries = (seriesToDelete: Series): void => {
    Alert.alert(
      'Delete series?',
      `This removes "${seriesToDelete.title}" and its saved episodes from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteSeries(seriesToDelete.id);
          },
        },
      ],
    );
  };

  const deleteSeries = async (seriesId: string): Promise<void> => {
    setDeletingSeriesId(seriesId);
    setErrorMessage(undefined);

    try {
      await localAppServices.deleteSeries.execute({ seriesId });
      await loadSeries();
    } catch {
      setErrorMessage('Series could not be deleted.');
    } finally {
      setDeletingSeriesId(undefined);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.screenContent}>
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
          onCreateSeries={() => setIsCreateOpen(true)}
        />
        {series.length > 0 ? (
          <SeriesList
            colors={colors}
            deletingSeriesId={deletingSeriesId}
            series={series}
            styles={styles}
            onDeleteSeries={requestDeleteSeries}
            onOpenSeries={onOpenSeries}
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
        <Text style={styles.appCategory}>AI SERIES</Text>
        <Text style={styles.largeTitle}>Context-English</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>G</Text>
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
      style={styles.heroSurface}
      tone="primary"
      variant="hero"
    >
      <View style={styles.heroContent}>
        <BubblePill colors={colors} tone="primary" style={styles.heroTag}>
          <Text style={styles.heroTagText}>AI SERIES</Text>
        </BubblePill>
        <Text style={styles.heroTitle}>Create a story</Text>
        <Text style={styles.heroText}>
          {hasSeries
            ? 'Pick a premise, characters, and level.'
            : 'No saved series yet. Create one to begin.'}
        </Text>
        <BubbleButton
          colors={colors}
          onPress={onCreateSeries}
          style={styles.heroButton}
          variant="primary"
        >
          <Text style={styles.heroButtonText}>New Series</Text>
        </BubbleButton>
      </View>
    </BubbleSurface>
  );
}

// SeriesList renders saved local series using Bubble cards.
function SeriesList({
  colors,
  deletingSeriesId,
  series,
  styles,
  onDeleteSeries,
  onOpenSeries,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly deletingSeriesId: string | undefined;
  readonly series: readonly Series[];
  readonly styles: AppStyles;
  readonly onDeleteSeries: (series: Series) => void;
  readonly onOpenSeries: (seriesId: string) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>MY SERIES</Text>
      <View style={styles.seriesListGrid}>
        {series.map((item) => (
          <SeriesCard
            colors={colors}
            isDeleting={item.id === deletingSeriesId}
            key={item.id}
            series={item}
            styles={styles}
            onDeleteSeries={onDeleteSeries}
            onOpenSeries={onOpenSeries}
          />
        ))}
      </View>
    </>
  );
}

// SeriesCard displays one saved local series and its generation gate.
function SeriesCard({
  colors,
  isDeleting,
  series,
  styles,
  onDeleteSeries,
  onOpenSeries,
}: {
  readonly colors: typeof lightColors | typeof darkColors;
  readonly isDeleting: boolean;
  readonly series: Series;
  readonly styles: AppStyles;
  readonly onDeleteSeries: (series: Series) => void;
  readonly onOpenSeries: (seriesId: string) => void;
}): ReactElement {
  return (
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
      <View style={styles.seriesCardFooter}>
        <BubbleButton
          colors={colors}
          disabled={isDeleting}
          onPress={() => onOpenSeries(series.id)}
          style={styles.seriesCardPrimaryButton}
          variant="primary"
        >
          <Text style={styles.seriesCardPrimaryButtonText}>Continue</Text>
        </BubbleButton>
        {isDeleting ? (
          <BubbleStatus
            colors={colors}
            title="Deleting..."
            tone="loading"
            variant="compact"
          />
        ) : (
          <BubbleButton
            colors={colors}
            disabled={isDeleting}
            onPress={() => onDeleteSeries(series)}
            style={styles.seriesCardDeleteButton}
            variant="ghost"
          >
            <Text style={styles.seriesCardDeleteButtonText}>Delete</Text>
          </BubbleButton>
        )}
      </View>
    </BubbleSurface>
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
          <JellyPressable onPress={onClose} style={styles.modalTextButton}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </JellyPressable>
          <Text style={styles.modalTitle}>New Series</Text>
          <JellyPressable
            disabled={isBusy}
            onPress={onSubmit}
            style={styles.modalTextButton}
          >
            <Text style={[styles.modalSave, isBusy && styles.disabledControl]}>
              Save
            </Text>
          </JellyPressable>
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
              label="Genre"
              options={learningGenres}
              selected={form.genre}
              styles={styles}
              labels={genreLabels}
              onSelect={(genre) => updateForm({ genre })}
            />
            <ChoiceGroup
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
            <View style={styles.setupGenerateRow}>
              <View style={styles.flex}>
                <Text style={styles.actionTitle}>Setup draft</Text>
                <Text style={styles.secondaryText}>
                  Fill title, premise, and characters.
                </Text>
              </View>
              <BubbleButton
                colors={colors}
                disabled={isBusy}
                onPress={onGenerate}
                style={styles.setupGenerateButton}
                variant="primary"
              >
                <Text style={styles.setupGenerateButtonText}>
                  {isGeneratingSetup ? 'Generating...' : 'Generate'}
                </Text>
              </BubbleButton>
            </View>
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
  // onSelect updates the selected typed value.
  readonly onSelect: (value: T) => void;
}): ReactElement {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <JellyPressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.goalChoice,
              option === selected && styles.activeGoalChoice,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.goalChoiceText,
                option === selected && styles.activeGoalChoiceText,
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
