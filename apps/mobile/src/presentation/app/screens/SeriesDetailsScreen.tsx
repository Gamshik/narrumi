import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useFocusEffect } from 'expo-router';
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
  characterProfileNames,
  createCharacterProfileId,
  learningGenres,
  normalizeCharacterProfiles,
  seriesParticipationModes,
  type CefrLevel,
  type Episode,
  type LearningGenre,
  type Series,
  type SeriesCharacterProfile,
  type SeriesMemory,
  type SeriesParticipationMode,
} from '@domain/index';
import type {
  GenerateSeriesSetupDraftRequest,
  SeriesSetupDraft,
  SeriesSetupTextField,
} from '@application/ports';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';

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
  readonly onOpenEpisode: (episodeId: string) => void;
  // onContinueEpisode reopens an unfinished episode in editable mode to resume it.
  readonly onContinueEpisode: (episodeId: string) => void;
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

// SeriesSetupFormState stores editable setup values before the first episode.
type SeriesSetupFormState = {
  // title is the visible series name.
  readonly title: string;
  // genre is the selected broad story category.
  readonly genre: LearningGenre;
  // cefrLevel controls grammar and vocabulary complexity.
  readonly cefrLevel: CefrLevel;
  // tone stores the selected story mood.
  readonly tone: string;
  // premise stores the bounded starting idea.
  readonly premise: string;
  // participationMode decides whether answers direct events or roleplay the learner.
  readonly participationMode: SeriesParticipationMode;
  // characterProfiles store pinned dialogue names and AI-facing descriptions.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
  // userRole stores the learner role for character mode.
  readonly userRole: string;
};

// SeriesSetupFormErrors stores visible validation messages by setup field.
type SeriesSetupFormErrors = Partial<
  Record<keyof SeriesSetupFormState | 'mainCharacters', string>
>;

// storyToneOptions matches the bounded setup tones from series creation.
const storyToneOptions = [
  'Warm and curious',
  'Calm detective',
  'Light adventure',
  'Everyday realistic',
  'Cinematic mystery',
] as const;

// genreLabels maps domain genre values to compact labels for setup controls.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'short-fiction': 'Short Fiction',
  'travel-leisure': 'Travel',
  'work-it': 'Work & IT',
};

// participationModeLabels keeps the locked series setup readable in details.
const participationModeLabels: Record<Series['participationMode'], string> = {
  director: 'Producer mode',
  character: 'Character mode',
};

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
  const [state, setState] = useState<SeriesDetailsState>();
  const [setupForm, setSetupForm] = useState<SeriesSetupFormState>();
  const [setupErrors, setSetupErrors] = useState<SeriesSetupFormErrors>({});
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  // regeneratingField holds the single setup field currently being regenerated, or undefined when idle.
  const [regeneratingField, setRegeneratingField] = useState<SeriesSetupTextField>();
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadDetails = useCallback(async (): Promise<void> => {
    try {
      const details = await localAppServices.loadSeriesDetails.execute({ seriesId });

      setState(details);
      setSetupForm(createSetupForm(details.series));
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

    const validationErrors = validateSetupForm(setupForm);

    if (Object.keys(validationErrors).length > 0) {
      setSetupErrors(validationErrors);

      return;
    }

    setIsSavingSetup(true);
    setErrorMessage(undefined);

    try {
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
        ...(setupForm.participationMode === 'character' &&
        setupForm.userRole.trim()
          ? { userRole: setupForm.userRole }
          : {}),
      });
      setIsSetupOpen(false);
      setSetupErrors({});
      await loadDetails();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Series setup could not be saved.',
      );
    } finally {
      setIsSavingSetup(false);
    }
  };

  const generateSetup = async (): Promise<void> => {
    if (!setupForm) {
      return;
    }

    setIsGeneratingSetup(true);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.generateSeriesSetupDraft.execute(
        buildSetupDraftRequest(setupForm),
      );

      setSetupForm({
        ...setupForm,
        title: result.draft.title,
        premise: result.draft.premise,
        characterProfiles: result.draft.characterProfiles,
        userRole:
          setupForm.participationMode === 'character'
            ? result.draft.userRole ?? setupForm.userRole
            : '',
      });
      setSetupErrors({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Series setup could not be generated.',
      );
    } finally {
      setIsGeneratingSetup(false);
    }
  };

  // regenerateSetupField replaces a single AI-fillable setup field while keeping every other field unchanged.
  const regenerateSetupField = async (
    field: SeriesSetupTextField,
  ): Promise<void> => {
    if (!setupForm) {
      return;
    }

    setRegeneratingField(field);
    setErrorMessage(undefined);

    try {
      const result = await localAppServices.generateSeriesSetupDraft.execute({
        ...buildSetupDraftRequest(setupForm),
        regenerateField: field,
      });

      const nextForm = applyRegeneratedField(setupForm, field, result.draft);

      setSetupForm(nextForm);
      // Recompute errors only if some were already visible so the refreshed field clears its message.
      setSetupErrors((currentErrors) =>
        Object.keys(currentErrors).length > 0
          ? validateSetupForm(nextForm)
          : currentErrors,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Series field could not be regenerated.',
      );
    } finally {
      setRegeneratingField(undefined);
    }
  };

  // cancelSetup closes the setup sheet without persisting, discarding unsaved edits
  // and AI generations so the form reopens with the last saved series values.
  const cancelSetup = (): void => {
    setSetupErrors({});
    setIsSetupOpen(false);

    if (state) {
      // Revert in-memory edits; persistence only happens through Save.
      setSetupForm(createSetupForm(state.series));
    }
  };

  if (errorMessage) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.homeHeader}>
          <Pressable onPress={onBack} style={styles.smallPrimaryButton}>
            <Text style={styles.smallPrimaryButtonText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>Loading series...</Text>
        </View>
      </View>
    );
  }

  const latestEpisode = state.episodes.at(-1);
  const hasEpisodeInProgress =
    latestEpisode !== undefined && !latestEpisode.isComplete;
  const nextEpisodeNumber = state.episodes.length + 1;

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Pressable onPress={onBack} style={styles.smallPrimaryButton}>
          <Text style={styles.smallPrimaryButtonText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsSetupOpen(true)}
          style={styles.secondarySmallButton}
        >
          <Text style={styles.secondarySmallButtonText}>Setup</Text>
        </Pressable>
      </View>

      <View style={styles.seriesDetailsHeader}>
        <Text style={styles.readerBadge}>{state.series.genre}</Text>
        <Text style={styles.largeTitle}>{state.series.title}</Text>
        <Text style={styles.sectionLabel}>
          {participationModeLabels[state.series.participationMode]}
          {state.series.userRole ? ` - ${state.series.userRole}` : ''}
        </Text>
        <Text style={styles.secondaryText}>{state.series.premise}</Text>
      </View>

      <Pressable
        onPress={() => {
          if (latestEpisode && !latestEpisode.isComplete) {
            onContinueEpisode(latestEpisode.id);

            return;
          }

          onPrepareEpisode(state.series.id);
        }}
        style={({ pressed }) => [
          styles.continueBanner,
          styles.seriesPrepareBanner,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.continueTag}>
          {hasEpisodeInProgress ? 'CONTINUE EPISODE' : 'PREPARE NEXT'}
        </Text>
        <Text style={styles.continueTitle}>
          Episode{' '}
          {hasEpisodeInProgress
            ? (latestEpisode?.orderIndex ?? nextEpisodeNumber)
            : nextEpisodeNumber}
        </Text>
        <Text style={styles.continueText}>
          {hasEpisodeInProgress
            ? 'Return to the latest decision and finish this episode arc.'
            : 'Choose Story Words and generate the next AI episode.'}
        </Text>
        <Text style={styles.bannerButtonText}>
          {hasEpisodeInProgress ? 'Continue Reading' : 'Start Setup'}
        </Text>
      </Pressable>

      <View style={styles.settingsCard}>
        <Text style={styles.actionTitle}>Series Memory</Text>
        <Text style={styles.secondaryText}>
          {state.memory?.lastEpisodeSummary ??
            state.memory?.unresolvedCliffhanger ??
            'No generated episode memory yet.'}
        </Text>
      </View>

      {state.episodes.length > 0 ? (
        <Pressable
          onPress={() => onReadSeries(state.series.id)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Read Full Series</Text>
        </Pressable>
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
        <View style={styles.seriesList}>
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
          canEdit={canEditSetup}
          errors={setupErrors}
          form={setupForm}
          isGenerating={isGeneratingSetup}
          isSaving={isSavingSetup}
          isVisible={isSetupOpen}
          regeneratingField={regeneratingField}
          styles={styles}
          onChangeForm={(nextForm) => {
            setSetupForm(nextForm);
            setSetupErrors((currentErrors) =>
              Object.keys(currentErrors).length > 0
                ? validateSetupForm(nextForm)
                : {},
            );
          }}
          onClose={cancelSetup}
          onGenerate={generateSetup}
          onRegenerateField={regenerateSetupField}
          onSave={saveSetup}
        />
      ) : null}
    </ScrollView>
  );
}

// SeriesSetupModal shows the locked or editable setup contract for one series.
function SeriesSetupModal({
  canEdit,
  errors,
  form,
  isGenerating,
  isSaving,
  isVisible,
  regeneratingField,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onRegenerateField,
  onSave,
}: {
  // canEdit is true only before the first generated episode exists.
  readonly canEdit: boolean;
  // errors are validation messages for editable setup fields.
  readonly errors: SeriesSetupFormErrors;
  // form stores the visible setup values.
  readonly form: SeriesSetupFormState;
  // isGenerating disables duplicate AI setup generation.
  readonly isGenerating: boolean;
  // isSaving disables duplicate local writes.
  readonly isSaving: boolean;
  // isVisible controls the native modal presentation.
  readonly isVisible: boolean;
  // regeneratingField is the field currently regenerating, or undefined when idle.
  readonly regeneratingField: SeriesSetupTextField | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeForm updates one or more setup fields.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onClose dismisses the setup sheet.
  readonly onClose: () => void;
  // onGenerate fills missing setup text through the AI boundary.
  readonly onGenerate: () => void;
  // onRegenerateField replaces a single AI-fillable field through the AI boundary.
  readonly onRegenerateField: (field: SeriesSetupTextField) => void;
  // onSave persists editable setup changes.
  readonly onSave: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 62);
  const bottomInset = Math.max(insets.bottom, 18);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  // isBusy blocks every setup control while a save, full generation, or single-field regeneration runs.
  const isBusy = isSaving || isGenerating || regeneratingField !== undefined;
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

  return (
    <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={[styles.modalScreen, { paddingTop: topInset }]}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalTextButton}>
            <Text style={styles.modalCancel}>Close</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Series Setup</Text>
          <Pressable
            disabled={!canEdit || isBusy}
            onPress={onSave}
            style={styles.modalTextButton}
          >
            <Text
              style={[
                styles.modalSave,
                (!canEdit || isBusy) && styles.disabledControl,
              ]}
            >
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
          <SetupChoiceGroup
            isDisabled={!canEdit}
            label="CEFR Level"
            options={cefrLevels}
            selected={form.cefrLevel}
            styles={styles}
            onSelect={(cefrLevel) => updateForm({ cefrLevel })}
          />
          <SetupChoiceGroup
            isDisabled={!canEdit}
            label="Genre"
            options={learningGenres}
            selected={form.genre}
            styles={styles}
            labels={genreLabels}
            onSelect={(genre) => updateForm({ genre })}
          />
          <SetupChoiceGroup
            isDisabled={!canEdit}
            label="Tone"
            options={storyToneOptions}
            selected={form.tone}
            styles={styles}
            onSelect={(tone) => updateForm({ tone })}
          />
          <SetupChoiceGroup
            isDisabled={!canEdit}
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
          <SetupFormField
            {...(errors.premise ? { error: errors.premise } : {})}
            {...(canEdit
              ? {
                  helper:
                    'Required. Use Generate if you want the AI to fill it.',
                  isBusy,
                  isRegenerating: regeneratingField === 'premise',
                  onRegenerate: () => onRegenerateField('premise'),
                }
              : {})}
            isEditable={canEdit}
            fieldId="premise"
            isMultiline
            label="Premise"
            placeholder="A learner receives strange English notes from a future city."
            styles={styles}
            value={form.premise}
            onFocus={scrollToField}
            onLayout={registerFieldOffset}
            onChangeText={(premise) => updateForm({ premise })}
          />
          <SetupFormField
            {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
            {...(canEdit
              ? {
                helper:
                    'Required. Speaker names stay fixed in dialogue; descriptions guide the AI.',
                  isBusy,
                  isRegenerating: regeneratingField === 'mainCharacters',
                  onRegenerate: () => onRegenerateField('mainCharacters'),
                }
              : {})}
            isEditable={canEdit}
            fieldId="characterProfiles"
            label="Main Characters"
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
          <CharacterProfilesEditor
            isEditable={canEdit}
            profiles={form.characterProfiles}
            styles={styles}
            onChange={(characterProfiles) => updateForm({ characterProfiles })}
          />
          {form.participationMode === 'character' ? (
            <SetupFormField
              {...(errors.userRole ? { error: errors.userRole } : {})}
              {...(canEdit
                ? {
                    helper:
                      'Required. This role becomes read-only after the first episode.',
                    isBusy,
                    isRegenerating: regeneratingField === 'userRole',
                    onRegenerate: () => onRegenerateField('userRole'),
                  }
                : {})}
              isEditable={canEdit}
              fieldId="userRole"
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
          {/* Title is placed last so it follows the story decided above (premise, */}
          {/* characters, learner role). This matches the AI generation order, where */}
          {/* each field is built from the selected constraints and the fields before it. */}
          <SetupFormField
            {...(errors.title ? { error: errors.title } : {})}
            {...(canEdit
              ? {
                  isBusy,
                  isRegenerating: regeneratingField === 'title',
                  onRegenerate: () => onRegenerateField('title'),
                }
              : {})}
            isEditable={canEdit}
            fieldId="title"
            label="Title"
            placeholder="Orbit Letters"
            styles={styles}
            value={form.title}
            onFocus={scrollToField}
            onLayout={registerFieldOffset}
            onChangeText={(title) => updateForm({ title })}
          />
          {canEdit ? (
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
                {isGenerating ? 'Generating...' : 'Generate'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.stateMessage}>
              <Text style={styles.stateMessageTitle}>
                Setup is read-only after the first episode.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// SetupFormField renders one editable or read-only setup text field.
function SetupFormField({
  error,
  fieldId,
  helper,
  isBusy = false,
  isEditable,
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
  // helper explains required generation behavior for editable fields.
  readonly helper?: string;
  // isBusy disables the regenerate action while any setup AI or save work runs.
  readonly isBusy?: boolean;
  // isEditable disables input after the first episode.
  readonly isEditable: boolean;
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
        editable={isEditable}
        multiline={isMultiline || isCompactMultiline}
        onChangeText={onChangeText}
        onFocus={() => onFocus(fieldId)}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholder.color}
        style={[
          styles.formInput,
          isMultiline && styles.formTextArea,
          isCompactMultiline && styles.formCompactTextArea,
          !isEditable && styles.disabledControl,
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

// CharacterProfilesEditor renders pinned speaker names with separate AI descriptions.
function CharacterProfilesEditor({
  isEditable,
  profiles,
  styles,
  onChange,
}: {
  // isEditable disables profile changes after the first generated episode.
  readonly isEditable: boolean;
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
    <View style={styles.formGroup}>
      {profiles.map((profile, index) => (
        <View key={profile.id} style={styles.formGroup}>
          <View style={styles.formLabelRow}>
            <Text style={styles.sectionLabel}>Dialogue name</Text>
            {isEditable ? (
              <Pressable
                onPress={() => removeProfile(index)}
                style={({ pressed }) => [
                  styles.fieldRegenerateButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.fieldRegenerateText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            editable={isEditable}
            onChangeText={(name) => updateProfile(index, { name })}
            placeholder="Corbin"
            placeholderTextColor={styles.placeholder.color}
            style={[styles.formInput, !isEditable && styles.disabledControl]}
            value={profile.name}
          />
          <Text style={styles.sectionLabel}>Description</Text>
          <TextInput
            editable={isEditable}
            multiline
            onChangeText={(description) => updateProfile(index, { description })}
            placeholder="A careful detective who notices small contradictions."
            placeholderTextColor={styles.placeholder.color}
            style={[
              styles.formInput,
              styles.formCompactTextArea,
              !isEditable && styles.disabledControl,
            ]}
            textAlignVertical="top"
            value={profile.description}
          />
        </View>
      ))}
      {isEditable ? (
        <Pressable
          onPress={addProfile}
          style={({ pressed }) => [
            styles.secondarySmallButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondarySmallButtonText}>Add Character</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// SetupChoiceGroup renders bounded setup options with read-only support.
function SetupChoiceGroup<T extends string>({
  isDisabled,
  label,
  labels,
  options,
  selected,
  styles,
  onSelect,
}: {
  // isDisabled prevents changes after the first episode.
  readonly isDisabled: boolean;
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
            disabled={isDisabled}
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.goalChoice,
              option === selected && styles.activeGoalChoice,
              pressed && styles.pressed,
              isDisabled && option !== selected && styles.disabledControl,
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

// createSetupForm maps the saved series into modal form values.
function createSetupForm(series: Series): SeriesSetupFormState {
  return {
    title: series.title,
    genre: series.genre,
    cefrLevel: series.cefrLevel,
    tone: series.tone,
    premise: series.premise,
    participationMode: series.participationMode,
    characterProfiles: series.characterProfiles,
    userRole: series.userRole ?? '',
  };
}

// buildSetupDraftRequest maps the current setup form into the AI request without optional empties.
// Selected list options are always sent; optional text is included only when the learner filled it.
function buildSetupDraftRequest(
  form: SeriesSetupFormState,
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

// applyRegeneratedField writes only the regenerated field back into the form and leaves the rest intact.
function applyRegeneratedField(
  form: SeriesSetupFormState,
  field: SeriesSetupTextField,
  draft: SeriesSetupDraft,
): SeriesSetupFormState {
  switch (field) {
    case 'title':
      return { ...form, title: draft.title };
    case 'premise':
      return { ...form, premise: draft.premise };
    case 'mainCharacters':
      return { ...form, characterProfiles: draft.characterProfiles };
    case 'userRole':
      // userRole only exists in character mode; keep the previous value when the AI omits it.
      return { ...form, userRole: draft.userRole ?? form.userRole };
  }
}

// validateSetupForm keeps local setup errors visible before persistence.
function validateSetupForm(form: SeriesSetupFormState): SeriesSetupFormErrors {
  const errors: SeriesSetupFormErrors = {};

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
  readonly onOpenEpisode: (episodeId: string) => void;
}): ReactElement {
  return (
    <View style={styles.seriesRow}>
      <View style={styles.flex}>
        <Pressable
          onPress={() => onOpenEpisode(episode.id)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={styles.actionTitle}>
            Episode {episode.orderIndex}: {episode.title ?? 'Untitled'}
          </Text>
          <Text style={styles.secondaryText} numberOfLines={2}>
            {episode.summaryUpdate}
          </Text>
          <Text style={styles.sectionLabel}>
            {episode.isComplete
              ? `${episode.interactions.length} DECISIONS - COMPLETE`
              : `${episode.interactions.length} DECISIONS - IN PROGRESS`}
          </Text>
        </Pressable>
      </View>
      <View style={styles.rowActionStack}>
        <Pressable
          onPress={() => onOpenEpisode(episode.id)}
          style={({ pressed }) => [styles.smallPrimaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallPrimaryButtonText}>Read</Text>
        </Pressable>
        <Pressable
          disabled={isDeleting}
          onPress={() => onDeleteEpisode(episode)}
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
