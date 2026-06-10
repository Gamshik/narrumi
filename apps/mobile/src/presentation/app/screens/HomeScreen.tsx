import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cefrLevels,
  learningGenres,
  type CefrLevel,
  type LearningGenre,
  type Series,
} from '@domain/index';
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
  // mainCharacters is a comma-separated form value converted on submit.
  readonly mainCharacters: string;
  // userRole is the learner's optional role inside the story.
  readonly userRole: string;
};

// SeriesFormErrors stores visible validation messages by field.
type SeriesFormErrors = Partial<Record<keyof SeriesFormState, string>>;

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

// emptySeriesForm is the initial create-series sheet state.
const emptySeriesForm: SeriesFormState = {
  title: '',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: storyToneOptions[0],
  premise: '',
  mainCharacters: '',
  userRole: '',
};

// HomeScreen renders the series-first dashboard and local create-series flow.
export function HomeScreen({
  onOpenSeries,
  styles,
}: HomeScreenProps): ReactElement {
  const [series, setSeries] = useState<readonly Series[]>([]);
  const [form, setForm] = useState<SeriesFormState>(emptySeriesForm);
  const [formErrors, setFormErrors] = useState<SeriesFormErrors>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingSeriesId, setDeletingSeriesId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
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
        ...form,
        mainCharacters: form.mainCharacters.split(','),
        ...(form.userRole.trim() ? { userRole: form.userRole } : {}),
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
        <HomeHeader
          styles={styles}
          onCreateSeries={() => setIsCreateOpen(true)}
        />
        {errorMessage ? (
          <View style={styles.stateMessage}>
            <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
          </View>
        ) : null}
        <ContinueBanner
          firstSeriesId={series[0]?.id}
          styles={styles}
          onCreateSeries={() => setIsCreateOpen(true)}
          onOpenSeries={onOpenSeries}
        />
        <SeriesList
          deletingSeriesId={deletingSeriesId}
          series={series}
          styles={styles}
          onCreateSeries={() => setIsCreateOpen(true)}
          onDeleteSeries={requestDeleteSeries}
          onOpenSeries={onOpenSeries}
        />
      </ScrollView>
      <CreateSeriesModal
        form={form}
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
          setFormErrors({});
          setIsCreateOpen(false);
        }}
        onSubmit={submitSeries}
      />
    </>
  );
}

// HomeHeader owns the app title and primary create action.
function HomeHeader({
  styles,
  onCreateSeries,
}: Pick<HomeScreenProps, 'styles'> & {
  // onCreateSeries opens the local-first create-series sheet.
  readonly onCreateSeries: () => void;
}): ReactElement {
  return (
    <View style={styles.homeHeader}>
      <View>
        <Text style={styles.appCategory}>AI SERIES</Text>
        <Text style={styles.largeTitle}>Context-English</Text>
      </View>
      <Pressable
        onPress={onCreateSeries}
        style={({ pressed }) => [styles.roundActionButton, pressed && styles.pressed]}
      >
        <Text style={styles.roundActionText}>+</Text>
      </Pressable>
    </View>
  );
}

// ContinueBanner provides the main series-first action surface.
function ContinueBanner({
  firstSeriesId,
  styles,
  onCreateSeries,
  onOpenSeries,
}: {
  // firstSeriesId selects the most recent local story when one exists.
  readonly firstSeriesId: string | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onCreateSeries opens the local create form.
  readonly onCreateSeries: () => void;
  // onOpenSeries starts the unified AI episode flow for an existing story.
  readonly onOpenSeries: (seriesId: string) => void;
}): ReactElement {
  const hasSeries = firstSeriesId !== undefined;

  return (
    <View style={styles.continueBanner}>
      <Text style={styles.continueTag}>PERSONAL SERIES</Text>
      <Text style={styles.continueTitle}>
        {hasSeries ? 'Continue your next episode' : 'Create your first story'}
      </Text>
      <Text style={styles.continueText}>
        Open a story, choose Story Words, generate an AI episode, and complete
        the current arc.
      </Text>
      <Pressable
        onPress={hasSeries ? () => onOpenSeries(firstSeriesId) : onCreateSeries}
        style={({ pressed }) => [styles.bannerButton, pressed && styles.pressed]}
      >
        <Text style={styles.bannerButtonText}>
          {hasSeries ? 'Create Episode' : 'New Series'}
        </Text>
      </Pressable>
    </View>
  );
}

// SeriesList renders saved local series without fake episode history.
function SeriesList({
  deletingSeriesId,
  series,
  styles,
  onCreateSeries,
  onDeleteSeries,
  onOpenSeries,
}: {
  // deletingSeriesId disables the destructive control during the active local write.
  readonly deletingSeriesId: string | undefined;
  // series are local-first personal story containers.
  readonly series: readonly Series[];
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onCreateSeries opens the local create form for the empty state.
  readonly onCreateSeries: () => void;
  // onDeleteSeries asks the user to confirm removing a story and its children.
  readonly onDeleteSeries: (series: Series) => void;
  // onOpenSeries starts the AI episode flow for a local series.
  readonly onOpenSeries: (seriesId: string) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>MY SERIES</Text>
      {series.length === 0 ? (
        <Pressable
          onPress={onCreateSeries}
          style={({ pressed }) => [styles.emptySeriesPanel, pressed && styles.pressed]}
        >
          <Text style={styles.actionTitle}>No saved series yet</Text>
          <Text style={styles.secondaryText}>
            Add a title, genre, level, tone, premise, characters, and your role.
          </Text>
        </Pressable>
      ) : (
        <View style={styles.seriesList}>
          {series.map((item) => (
            <SeriesRow
              isDeleting={item.id === deletingSeriesId}
              key={item.id}
              series={item}
              styles={styles}
              onDeleteSeries={onDeleteSeries}
              onOpenSeries={onOpenSeries}
            />
          ))}
        </View>
      )}
    </>
  );
}

// SeriesRow displays one saved local series and its generation gate.
function SeriesRow({
  isDeleting,
  series,
  styles,
  onDeleteSeries,
  onOpenSeries,
}: {
  // isDeleting prevents duplicate destructive writes for this row.
  readonly isDeleting: boolean;
  // series is the saved local series record to summarize.
  readonly series: Series;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onDeleteSeries triggers the user-facing destructive confirmation.
  readonly onDeleteSeries: (series: Series) => void;
  // onOpenSeries starts the unified AI flow for this series.
  readonly onOpenSeries: (seriesId: string) => void;
}): ReactElement {
  return (
    <View style={styles.seriesRow}>
      <View style={styles.flex}>
        <View style={styles.wordHeading}>
          <Text style={styles.actionTitle}>{series.title}</Text>
          <Text style={styles.seriesMeta}>{series.cefrLevel}</Text>
        </View>
        <Text style={styles.secondaryText}>
          {genreLabels[series.genre]} · {series.tone}
        </Text>
        <Text style={styles.seriesPremise} numberOfLines={2}>
          {series.premise}
        </Text>
      </View>
      <View style={styles.rowActionStack}>
        <Pressable
          onPress={() => onOpenSeries(series.id)}
          style={({ pressed }) => [styles.smallPrimaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallPrimaryButtonText}>Story</Text>
        </Pressable>
        <Pressable
          disabled={isDeleting}
          onPress={() => onDeleteSeries(series)}
          style={({ pressed }) => [
            styles.destructiveIconButton,
            pressed && styles.pressed,
            isDeleting && styles.disabledControl,
          ]}
        >
          <Text style={styles.destructiveIconText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

// CreateSeriesModal renders the full local series setup form.
function CreateSeriesModal({
  errors,
  form,
  isSaving,
  isVisible,
  styles,
  onChangeForm,
  onClose,
  onSubmit,
}: {
  // errors are the visible validation messages for current form values.
  readonly errors: SeriesFormErrors;
  // form is the controlled create-series state.
  readonly form: SeriesFormState;
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
  // onSubmit persists the series locally.
  readonly onSubmit: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 62);
  const bottomInset = Math.max(insets.bottom, 18);

  const updateForm = (patch: Partial<SeriesFormState>): void => {
    onChangeForm({ ...form, ...patch });
  };

  return (
    <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalScreen, { paddingTop: topInset }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalTextButton}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>New Series</Text>
          <Pressable
            disabled={isSaving}
            onPress={onSubmit}
            style={styles.modalTextButton}
          >
            <Text style={[styles.modalSave, isSaving && styles.disabledControl]}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.modalContent,
            { paddingBottom: bottomInset + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <FormField
            {...(errors.title ? { error: errors.title } : {})}
            label="Title"
            placeholder="Orbit Letters"
            styles={styles}
            value={form.title}
            onChangeText={(title) => updateForm({ title })}
          />
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
          <FormField
            helper="Optional. The AI can infer the opening setup later."
            isMultiline
            label="Premise"
            placeholder="A learner receives strange English notes from a future city."
            styles={styles}
            value={form.premise}
            onChangeText={(premise) => updateForm({ premise })}
          />
          <FormField
            helper="Optional. Add names separated by commas if you already have them."
            label="Main Characters"
            placeholder="Mira, Alex"
            styles={styles}
            value={form.mainCharacters}
            onChangeText={(mainCharacters) => updateForm({ mainCharacters })}
          />
          <FormField
            helper="Optional. Leave blank if the AI should choose your role."
            label="Your Role"
            placeholder="New analyst"
            styles={styles}
            value={form.userRole}
            onChangeText={(userRole) => updateForm({ userRole })}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// FormField renders one native text input row in the create-series sheet.
function FormField({
  error,
  helper,
  isMultiline = false,
  label,
  placeholder,
  styles,
  value,
  onChangeText,
}: {
  // error is the visible validation message for this field.
  readonly error?: string;
  // helper explains optional fields without blocking submission.
  readonly helper?: string;
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
  // onChangeText updates the controlled value.
  readonly onChangeText: (value: string) => void;
}): ReactElement {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        multiline={isMultiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholder.color}
        style={[styles.formInput, isMultiline && styles.formTextArea]}
        textAlignVertical={isMultiline ? 'top' : 'center'}
        value={value}
      />
      {error ? <Text style={styles.formErrorText}>{error}</Text> : null}
      {!error && helper ? (
        <Text style={styles.formHelperText}>{helper}</Text>
      ) : null}
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
          <Pressable
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
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// validateSeriesForm keeps local creation errors visible before persistence.
function validateSeriesForm(form: SeriesFormState): SeriesFormErrors {
  const errors: SeriesFormErrors = {};

  if (form.title.trim().length === 0) {
    errors.title = 'Enter a series title.';
  }

  return errors;
}
