import { useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Text, TextInput, View, type LayoutChangeEvent } from 'react-native';

import {
  createCharacterProfileId,
  type SeriesCharacterProfile,
} from '@domain/index';
import type { AppColors } from '@presentation/theme';

import { BubbleButton } from '../BubbleButton';
import { BubbleStatus } from '../BubbleStatus';
import { JellyPressable } from '../JellyPressable';
import type { KeyboardFocusTargetHandler } from '../KeyboardAwareScroll';
import {
  createCharacterProfilesEditorStyles,
  type CharacterProfilesEditorStyles,
} from './CharacterProfilesEditor.styles';

// MaximumCharacterCount mirrors the bounded setup-validation contract.
const MAXIMUM_CHARACTER_COUNT: number = 8;

// CharacterProfilesEditorProps describes the presentation-only cast editor contract.
export type CharacterProfilesEditorProps = {
  // colors provides the current semantic light or dark theme tokens.
  readonly colors: AppColors;
  // profiles contains the editable, stable character rows.
  readonly profiles: readonly SeriesCharacterProfile[];
  // onChange publishes the complete updated character list.
  readonly onChange: (profiles: readonly SeriesCharacterProfile[]) => void;
  // error displays the parent form validation result without duplicating validation rules.
  readonly error?: string;
  // isEditable locks profile changes after the series setup becomes immutable.
  readonly isEditable?: boolean;
  // onFocus lets a keyboard-aware parent reveal the exact input that activates.
  readonly onFocus?: KeyboardFocusTargetHandler;
  // onFieldFocus reports a repeated row's measured position to Cast-specific scrolling.
  readonly onFieldFocus?: CharacterFieldFocusHandler;
  // onLayout lets a keyboard-aware parent remember this editor's vertical offset.
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  // onAddedProfileLayout reveals the newly rendered row inside the parent scroll view.
  readonly onAddedProfileLayout?: (offsetY: number) => void;
};

// This callback reports a focused character row's vertical position inside the editor.
export type CharacterFieldFocusHandler = (offsetY: number) => void;

// CharacterProfilesEditor renders a compact cast section inside the existing setup form.
export function CharacterProfilesEditor({
  colors,
  error,
  isEditable = true,
  profiles,
  onChange,
  onFocus,
  onFieldFocus,
  onLayout,
  onAddedProfileLayout,
}: CharacterProfilesEditorProps): ReactElement {
  // focusedField identifies the input that receives the stronger focus outline.
  const [focusedField, setFocusedField] = useState<string | null>(null);
  // pendingProfileId identifies the newly added row until its layout is measured.
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  // listOffsetRef stores the character-list origin inside the editor section.
  const listOffsetRef = useRef<number>(0);
  // rowOffsetsRef stores each repeated row's measured position inside the character list.
  const rowOffsetsRef = useRef<Record<string, number>>({});
  // styles memoizes the current palette-specific StyleSheet.
  const styles: CharacterProfilesEditorStyles = useMemo(
    () => createCharacterProfilesEditorStyles(colors),
    [colors],
  );
  // hasReachedLimit keeps the add action aligned with server-side validation.
  const hasReachedLimit: boolean = profiles.length >= MAXIMUM_CHARACTER_COUNT;

  // updateProfile changes one controlled row without mutating the parent value.
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

  // addProfile appends an empty row with a collision-free local identifier.
  const addProfile = (): void => {
    if (hasReachedLimit) {
      return;
    }

    let candidateIndex: number = profiles.length;
    let id: string = createCharacterProfileId('', candidateIndex);

    while (profiles.some((profile) => profile.id === id)) {
      candidateIndex += 1;
      id = createCharacterProfileId('', candidateIndex);
    }

    setPendingProfileId(id);
    onChange([...profiles, { id, name: '', description: '' }]);
  };

  // removeProfile removes only the selected row and preserves all remaining ids.
  const removeProfile = (index: number): void => {
    onChange(profiles.filter((_profile, profileIndex) => profileIndex !== index));
  };

  // focusField gives visual focus feedback and notifies the keyboard-aware screen.
  const focusField = (
    fieldId: string,
    target: number,
    profileId: string,
  ): void => {
    setFocusedField(fieldId);
    onFocus?.(target);
    onFieldFocus?.(
      listOffsetRef.current + (rowOffsetsRef.current[profileId] ?? 0),
    );
  };

  // This handler records a row before using the same layout for add-row and focus behavior.
  const handleRowLayout = (profileId: string, rowOffsetY: number): void => {
    rowOffsetsRef.current[profileId] = rowOffsetY;
    revealPendingProfile(profileId, rowOffsetY);
  };

  // revealPendingProfile reports the new row position after React Native completes layout.
  const revealPendingProfile = (
    profileId: string,
    rowOffsetY: number,
  ): void => {
    if (profileId !== pendingProfileId) {
      return;
    }

    setPendingProfileId(null);
    setTimeout((): void => {
      onAddedProfileLayout?.(listOffsetRef.current + rowOffsetY);
    }, 0);
  };

  return (
    <View onLayout={onLayout} style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>CHARACTERS</Text>
        <Text
          accessibilityLabel={`${profiles.length} of ${MAXIMUM_CHARACTER_COUNT} characters added`}
          style={styles.count}
        >
          {profiles.length}/{MAXIMUM_CHARACTER_COUNT}
        </Text>
      </View>
      {profiles.length > 0 ? (
        <View
          onLayout={(event) => {
            listOffsetRef.current = event.nativeEvent.layout.y;
          }}
          style={styles.list}
        >
          {profiles.map((profile, index) => {
            // Field ids keep focus styling local to the active character input.
            const nameFieldId: string = `${profile.id}:name`;
            const descriptionFieldId: string = `${profile.id}:description`;

            return (
              <View
                key={profile.id}
                onLayout={(event: LayoutChangeEvent): void => {
                  handleRowLayout(profile.id, event.nativeEvent.layout.y);
                }}
                style={styles.row}
              >
                <View style={styles.nameRow}>
                  <TextInput
                    accessibilityLabel={`Character ${index + 1} name`}
                    autoCapitalize="words"
                    editable={isEditable}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(name) => updateProfile(index, { name })}
                    onFocus={(event): void =>
                      focusField(
                        nameFieldId,
                        event.nativeEvent.target,
                        profile.id,
                      )
                    }
                    placeholder="Character name"
                    placeholderTextColor={colors.labelTertiary}
                    style={[
                      styles.input,
                      focusedField === nameFieldId && styles.inputFocused,
                      !isEditable && styles.disabled,
                    ]}
                    textAlignVertical="center"
                    value={profile.name}
                  />
                  {isEditable ? (
                    <JellyPressable
                      accessibilityLabel={`Remove character ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => removeProfile(index)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </JellyPressable>
                  ) : null}
                </View>
                <TextInput
                  accessibilityLabel={`Character ${index + 1} note`}
                  editable={isEditable}
                  multiline
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(description) =>
                    updateProfile(index, { description })
                  }
                  onFocus={(event): void =>
                    focusField(
                      descriptionFieldId,
                      event.nativeEvent.target,
                      profile.id,
                    )
                  }
                  placeholder="Role or personality (optional)"
                  placeholderTextColor={colors.labelTertiary}
                  scrollEnabled
                  style={[
                    styles.input,
                    styles.descriptionInput,
                    focusedField === descriptionFieldId && styles.inputFocused,
                    !isEditable && styles.disabled,
                  ]}
                  textAlignVertical="top"
                  value={profile.description}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <BubbleStatus
          accessibilityRole="alert"
          colors={colors}
          title={error}
          tone="error"
          variant="compact"
        />
      ) : null}

      {isEditable ? (
        <BubbleButton
          accessibilityHint="Adds another character form"
          colors={colors}
          contentStyle={styles.addButton}
          disabled={hasReachedLimit}
          onPress={addProfile}
          variant="secondary"
        >
          <Text style={styles.addButtonText}>
            {hasReachedLimit ? 'Character limit reached' : '＋ Add character'}
          </Text>
        </BubbleButton>
      ) : null}
    </View>
  );
}
