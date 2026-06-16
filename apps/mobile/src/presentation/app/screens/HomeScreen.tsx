import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  seriesParticipationModes,
  type CefrLevel,
  type LearningGenre,
  type Series,
  type SeriesParticipationMode,
} from '@domain/index';
import type {
  GenerateSeriesSetupDraftRequest,
  SeriesSetupDraft,
  SeriesSetupTextField,
} from '@application/ports';
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
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  // regeneratingField holds the single field currently being regenerated, or undefined when idle.
  const [regeneratingField, setRegeneratingField] = useState<SeriesSetupTextField>();
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
        mainCharacters: parseCharacterList(form.mainCharacters),
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
        mainCharacters: result.draft.mainCharacters.join(', '),
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

  // regenerateField replaces a single AI-fillable field while keeping every other field unchanged.
  const regenerateField = async (field: SeriesSetupTextField): Promise<void> => {
    setRegeneratingField(field);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.generateSeriesSetupDraft.execute({
        ...buildSetupDraftRequest(form),
        regenerateField: field,
      });

      const nextForm = applyRegeneratedField(form, field, result.draft);

      setForm(nextForm);
      // Recompute errors only if some were already visible so the refreshed field clears its message.
      setFormErrors((currentErrors) =>
        Object.keys(currentErrors).length > 0
          ? validateSeriesForm(nextForm)
          : currentErrors,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Series field could not be regenerated.';

      setErrorMessage(message);
    } finally {
      setRegeneratingField(undefined);
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
        isGeneratingSetup={isGeneratingSetup}
        isSaving={isSaving}
        isVisible={isCreateOpen}
        regeneratingField={regeneratingField}
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
        onRegenerateField={regenerateField}
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
            Add or generate a complete setup before saving a series.
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
          {genreLabels[series.genre]} · {series.tone} ·{' '}
          {participationModeLabels[series.participationMode]}
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
  isGeneratingSetup,
  isSaving,
  isVisible,
  regeneratingField,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onRegenerateField,
  onSubmit,
}: {
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
  // regeneratingField is the field currently regenerating, or undefined when idle.
  readonly regeneratingField: SeriesSetupTextField | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeForm updates one or more form fields.
  readonly onChangeForm: (form: SeriesFormState) => void;
  // onClose dismisses the form without saving.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onRegenerateField replaces a single AI-fillable field through the AI boundary.
  readonly onRegenerateField: (field: SeriesSetupTextField) => void;
  // onSubmit persists the series locally.
  readonly onSubmit: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 62);
  const bottomInset = Math.max(insets.bottom, 18);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});

  // isBusy blocks every setup control while a save, full generation, or single-field regeneration runs.
  const isBusy = isSaving || isGeneratingSetup || regeneratingField !== undefined;

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
          <Pressable onPress={onClose} style={styles.modalTextButton}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>New Series</Text>
          <Pressable
            disabled={isBusy}
            onPress={onSubmit}
            style={styles.modalTextButton}
          >
            <Text style={[styles.modalSave, isBusy && styles.disabledControl]}>
              Save
            </Text>
          </Pressable>
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
          <FormField
            {...(errors.premise ? { error: errors.premise } : {})}
            fieldId="premise"
            helper="Required. Use Generate if you want the AI to fill it."
            isBusy={isBusy}
            isMultiline
            isRegenerating={regeneratingField === 'premise'}
            label="Premise"
            placeholder="A learner receives strange English notes from a future city."
            styles={styles}
            value={form.premise}
            onFocus={scrollToField}
            onLayout={registerFieldOffset}
            onChangeText={(premise) => updateForm({ premise })}
            onRegenerate={() => onRegenerateField('premise')}
          />
          <FormField
            {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
            fieldId="mainCharacters"
            helper="Required. Add names separated by commas or use Generate."
            isBusy={isBusy}
            isCompactMultiline
            isRegenerating={regeneratingField === 'mainCharacters'}
            label="Characters"
            placeholder="Mira, Alex"
            styles={styles}
            value={form.mainCharacters}
            onFocus={scrollToField}
            onLayout={registerFieldOffset}
            onChangeText={(mainCharacters) => updateForm({ mainCharacters })}
            onRegenerate={() => onRegenerateField('mainCharacters')}
          />
          {form.participationMode === 'character' ? (
            <FormField
              {...(errors.userRole ? { error: errors.userRole } : {})}
              fieldId="userRole"
              helper="Required. This role becomes read-only after the first episode."
              isBusy={isBusy}
              isCompactMultiline
              isRegenerating={regeneratingField === 'userRole'}
              label="Your Role"
              placeholder="New analyst"
              styles={styles}
              value={form.userRole}
              onFocus={scrollToField}
              onLayout={registerFieldOffset}
              onChangeText={(userRole) => updateForm({ userRole })}
              onRegenerate={() => onRegenerateField('userRole')}
            />
          ) : null}
          {/* Title is placed last so it follows the story decided above (premise, */}
          {/* characters, learner role). This matches the AI generation order, where */}
          {/* each field is built from the selected constraints and the fields before it. */}
          <FormField
            {...(errors.title ? { error: errors.title } : {})}
            fieldId="title"
            isBusy={isBusy}
            isRegenerating={regeneratingField === 'title'}
            label="Title"
            placeholder="Orbit Letters"
            styles={styles}
            value={form.title}
            onFocus={scrollToField}
            onLayout={registerFieldOffset}
            onChangeText={(title) => updateForm({ title })}
            onRegenerate={() => onRegenerateField('title')}
          />
          <Pressable
            disabled={isBusy}
            onPress={onGenerate}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isBusy && styles.disabledControl,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isGeneratingSetup ? 'Generating...' : 'Generate'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// FormField renders one native text input row in the create-series sheet.
function FormField({
  error,
  fieldId,
  helper,
  isBusy = false,
  isCompactMultiline = false,
  isMultiline = false,
  isRegenerating = false,
  label,
  placeholder,
  styles,
  value,
  onFocus,
  onLayout,
  onChangeText,
  onRegenerate,
}: {
  // error is the visible validation message for this field.
  readonly error?: string;
  // fieldId identifies the field for keyboard-aware autoscroll.
  readonly fieldId: string;
  // helper explains optional fields without blocking submission.
  readonly helper?: string;
  // isBusy disables the regenerate action while any setup AI or save work runs.
  readonly isBusy?: boolean;
  // isCompactMultiline gives short multi-line fields more touch and reading space.
  readonly isCompactMultiline?: boolean;
  // isMultiline selects paragraph input behavior for premise text.
  readonly isMultiline?: boolean;
  // isRegenerating marks this field as the one currently being regenerated.
  readonly isRegenerating?: boolean;
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
  // onRegenerate, when set, exposes a single-field AI regeneration action in the label row.
  readonly onRegenerate?: () => void;
}): ReactElement {
  // hasValue switches the AI action between filling an empty field and replacing an existing one.
  const hasValue = value.trim().length > 0;
  // actionLabel reads "Generate" for an empty field and "Regenerate" once it holds a value.
  const actionLabel = isRegenerating
    ? hasValue
      ? 'Regenerating...'
      : 'Generating...'
    : hasValue
      ? 'Regenerate'
      : 'Generate';

  return (
    <View
      onLayout={(event) => onLayout(fieldId, event.nativeEvent.layout.y)}
      style={styles.formGroup}
    >
      <View style={styles.formLabelRow}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {onRegenerate ? (
          <Pressable
            disabled={isBusy}
            onPress={onRegenerate}
            style={({ pressed }) => [
              styles.fieldRegenerateButton,
              pressed && styles.pressed,
              isBusy && styles.disabledControl,
            ]}
          >
            <Text style={styles.fieldRegenerateText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
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
    mainCharacters: parseCharacterList(form.mainCharacters),
    ...(form.participationMode === 'character' && form.userRole.trim()
      ? { userRole: form.userRole }
      : {}),
  };
}

// applyRegeneratedField writes only the regenerated field back into the form and leaves the rest intact.
function applyRegeneratedField(
  form: SeriesFormState,
  field: SeriesSetupTextField,
  draft: SeriesSetupDraft,
): SeriesFormState {
  switch (field) {
    case 'title':
      return { ...form, title: draft.title };
    case 'premise':
      return { ...form, premise: draft.premise };
    case 'mainCharacters':
      return { ...form, mainCharacters: draft.mainCharacters.join(', ') };
    case 'userRole':
      // userRole only exists in character mode; keep the previous value when the AI omits it.
      return { ...form, userRole: draft.userRole ?? form.userRole };
  }
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

  if (parseCharacterList(form.mainCharacters).length === 0) {
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

// parseCharacterList converts the comma-separated setup field to trimmed names.
function parseCharacterList(value: string): readonly string[] {
  return value
    .split(',')
    .map((character) => character.trim())
    .filter((character) => character.length > 0);
}
