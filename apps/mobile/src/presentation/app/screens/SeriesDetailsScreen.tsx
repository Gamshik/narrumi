import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useFocusEffect } from 'expo-router';
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
import {
  BubbleButton,
  BubbleStatus,
  BubbleSurface,
  JellyPressable,
} from '../shared';
import { useAppTheme } from '../theme';
import { lightColors, darkColors } from '@presentation/theme';
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
import type { GenerateSeriesSetupDraftRequest } from '@application/ports';

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
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const [state, setState] = useState<SeriesDetailsState>();
  const [setupForm, setSetupForm] = useState<SeriesSetupFormState>();
  const [setupErrors, setSetupErrors] = useState<SeriesSetupFormErrors>({});
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
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
          <JellyPressable onPress={onBack} style={styles.smallPrimaryButton}>
            <Text style={styles.smallPrimaryButtonText}>Back</Text>
          </JellyPressable>
        </View>
        <BubbleStatus colors={colors} tone="error" title={errorMessage} variant="row" />
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.screenContent}>
        <BubbleStatus colors={colors} tone="loading" title="Loading series..." variant="row" />
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
        <JellyPressable onPress={onBack} style={styles.smallPrimaryButton}>
          <Text style={styles.smallPrimaryButtonText}>Back</Text>
        </JellyPressable>
        <JellyPressable
          onPress={() => setIsSetupOpen(true)}
          style={[
            styles.secondarySmallButton,
            !canEditSetup && styles.disabledControl,
          ]}
        >
          <Text style={styles.secondarySmallButtonText}>
            {canEditSetup ? 'Setup' : 'View Setup'}
          </Text>
        </JellyPressable>
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

      <JellyPressable
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
      </JellyPressable>

      {state.memory?.lastEpisodeSummary || state.memory?.unresolvedCliffhanger ? (
        <BubbleSurface colors={colors} tone="neutral" variant="card" style={styles.settingsCard}>
          <Text style={styles.actionTitle}>Series Memory</Text>
          <Text style={styles.secondaryText}>
            {state.memory.lastEpisodeSummary ?? state.memory.unresolvedCliffhanger}
          </Text>
        </BubbleSurface>
      ) : null}

      {state.episodes.length > 0 ? (
        <JellyPressable
          onPress={() => onReadSeries(state.series.id)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Read Full Series</Text>
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
          colors={colors}
          canEdit={canEditSetup}
          errors={setupErrors}
          form={setupForm}
          isGenerating={isGeneratingSetup}
          isSaving={isSavingSetup}
          isVisible={isSetupOpen}
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
          onSave={saveSetup}
        />
      ) : null}
    </ScrollView>
  );
}

// SeriesSetupModal shows the locked or editable setup contract for one series.
function SeriesSetupModal({
  colors,
  canEdit,
  errors,
  form,
  isGenerating,
  isSaving,
  isVisible,
  styles,
  onChangeForm,
  onClose,
  onGenerate,
  onSave,
}: {
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
}): ReactElement {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 62);
  const bottomInset = Math.max(insets.bottom, 18);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  // isBusy blocks setup controls while a save or AI setup generation runs.
  const isBusy = isSaving || isGenerating;
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
          <JellyPressable onPress={onClose} style={styles.modalTextButton}>
            <Text style={styles.modalCancel}>Close</Text>
          </JellyPressable>
          <Text style={styles.modalTitle}>Series Setup</Text>
          <JellyPressable
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
          <SetupChoiceGroup
            colors={colors}
            isDisabled={!canEdit}
            label="CEFR Level"
            options={cefrLevels}
            selected={form.cefrLevel}
            styles={styles}
            onSelect={(cefrLevel) => updateForm({ cefrLevel })}
          />
          <SetupChoiceGroup
            colors={colors}
            isDisabled={!canEdit}
            label="Genre"
            options={learningGenres}
            selected={form.genre}
            styles={styles}
            labels={genreLabels}
            onSelect={(genre) => updateForm({ genre })}
          />
          <SetupChoiceGroup
            colors={colors}
            isDisabled={!canEdit}
            label="Tone"
            options={storyToneOptions}
            selected={form.tone}
            styles={styles}
            onSelect={(tone) => updateForm({ tone })}
          />
          <SetupChoiceGroup
            colors={colors}
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
            colors={colors}
            {...(errors.premise ? { error: errors.premise } : {})}
            {...(canEdit
              ? {
                  helper:
                    'Required. Use Generate if you want the AI to fill it.',
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
            colors={colors}
            {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
            {...(canEdit
              ? {
                  helper:
                    'Required. Speaker names stay fixed in dialogue; descriptions guide the AI.',
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
            colors={colors}
            isEditable={canEdit}
            profiles={form.characterProfiles}
            styles={styles}
            onChange={(characterProfiles) => updateForm({ characterProfiles })}
          />
          {form.participationMode === 'character' ? (
            <SetupFormField
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
            colors={colors}
            {...(errors.title ? { error: errors.title } : {})}
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
            <>
              {isBusy ? (
                <BubbleStatus
                  colors={colors}
                  tone="loading"
                  title={isSaving ? 'Saving setup...' : 'Generating setup...'}
                  variant="row"
                />
              ) : null}
              <BubbleButton
                colors={colors}
                disabled={isBusy}
                onPress={onGenerate}
                style={styles.primaryButton}
                variant="primary"
              >
                <Text style={styles.primaryButtonText}>Generate</Text>
              </BubbleButton>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// SetupFormField renders one editable or read-only setup text field.
function SetupFormField({
  colors,
  error,
  fieldId,
  helper,
  isEditable,
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
  // helper explains required generation behavior for editable fields.
  readonly helper?: string;
  // isEditable disables input after the first episode.
  readonly isEditable: boolean;
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
  isEditable,
  profiles,
  styles,
  onChange,
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
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
        <BubbleSurface
          key={profile.id}
          colors={colors}
          tone="neutral"
          variant="card"
          style={styles.characterCard}
        >
          <View style={styles.formLabelRow}>
            <Text style={styles.sectionLabel}>Dialogue name</Text>
            {isEditable ? (
              <JellyPressable
                onPress={() => removeProfile(index)}
                style={({ pressed }) => [
                  styles.fieldActionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.fieldActionText}>Remove</Text>
              </JellyPressable>
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
        </BubbleSurface>
      ))}
      {isEditable ? (
        <JellyPressable
          onPress={addProfile}
          style={({ pressed }) => [
            styles.secondarySmallButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondarySmallButtonText}>Add Character</Text>
        </JellyPressable>
      ) : null}
    </View>
  );
}

// SetupChoiceGroup renders bounded setup options with read-only support.
function SetupChoiceGroup<T extends string>({
  colors,
  isDisabled,
  label,
  labels,
  options,
  selected,
  styles,
  onSelect,
}: {
  // colors is the current theme tokens.
  readonly colors: typeof lightColors | typeof darkColors;
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
          <JellyPressable
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
          </JellyPressable>
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
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;

  return (
    <BubbleSurface colors={colors} tone="neutral" variant="card" style={styles.episodeCard}>
      <JellyPressable
        onPress={() => onOpenEpisode(episode.id)}
        style={({ pressed }) => [styles.episodeCardContent, pressed && styles.pressed]}
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
      </JellyPressable>
      <View style={styles.episodeCardActions}>
        <JellyPressable
          onPress={() => onOpenEpisode(episode.id)}
          style={({ pressed }) => [
            styles.smallPrimaryButton,
            styles.flex,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.smallPrimaryButtonText}>Read</Text>
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
          <Text style={styles.destructiveIconText}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Text>
        </JellyPressable>
      </View>
    </BubbleSurface>
  );
}
