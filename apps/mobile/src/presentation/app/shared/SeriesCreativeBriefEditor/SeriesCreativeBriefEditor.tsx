import { useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Text, TextInput, View } from 'react-native';

import type {
  SeriesCreativeBrief,
  SeriesDraftStrategy,
} from '@domain/index';
import type { AppColors } from '@presentation/theme';

import type { AppStyles } from '../../types';
import { JellyPressable } from '../JellyPressable';
import { SeriesSetupChoiceGroup } from '../SeriesSetupChoiceGroup';
import {
  createSeriesCreativeBriefEditorStyles,
  type SeriesCreativeBriefEditorStyles,
} from './SeriesCreativeBriefEditor.styles';
import { resolveCreativeBriefFieldOffset } from './creativeBriefFieldOffset';
import { describeDraftStrategy } from './draftStrategyDescription';

// CastSizeChoice is the presentation value for an optional bounded cast preference.
type CastSizeChoice = 'auto' | '1' | '2' | '3' | '4';

// CreativeBriefTextField identifies the editable text anchors owned by the learner.
type CreativeBriefTextField = Exclude<
  keyof SeriesCreativeBrief,
  'draftStrategy' | 'preferredCastSize'
>;

// SeriesCreativeBriefEditorProps defines the user-authored story seed surface.
export type SeriesCreativeBriefEditorProps = {
  // brief contains exact learner-authored anchors that AI must preserve.
  readonly brief: SeriesCreativeBrief;
  // colors supplies the semantic light or dark palette.
  readonly colors: AppColors;
  // completedCharacterCount lets strategy copy explain when Fill gaps cannot reduce the cast.
  readonly completedCharacterCount: number;
  // isDark selects the matching shared choice material.
  readonly isDark: boolean;
  // isEditable locks the brief after the first episode exists.
  readonly isEditable?: boolean;
  // styles is the app-level form style contract used by shared choice groups.
  readonly styles: AppStyles;
  // onChange publishes the complete updated creative brief.
  readonly onChange: (brief: SeriesCreativeBrief) => void;
  // onFocus lets a keyboard-aware parent reveal the focused field.
  readonly onFocus?: (fieldId: string) => void;
  // onLayout lets a keyboard-aware parent remember field positions.
  readonly onLayout?: (fieldId: string, offsetY: number) => void;
};

// draftStrategyOptions expose concrete permissions instead of abstract AI creativity levels.
const draftStrategyOptions = ['fill-missing', 'refine', 'rebuild'] as const;

// draftStrategyLabels keep the three update scopes scannable on mobile.
const draftStrategyLabels: Record<SeriesDraftStrategy, string> = {
  'fill-missing': 'Fill gaps',
  refine: 'Refine draft',
  rebuild: 'Rebuild',
};

// castSizeOptions lets the learner stay lightweight or request a small recurring cast.
const castSizeOptions = ['auto', '1', '2', '3', '4'] as const;

// castSizeLabels keeps the automatic option human-readable.
const castSizeLabels: Record<CastSizeChoice, string> = {
  auto: 'AI chooses',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
};

// SeriesCreativeBriefEditor renders one dominant idea field with optional progressive anchors.
export function SeriesCreativeBriefEditor({
  brief,
  colors,
  completedCharacterCount,
  isDark,
  isEditable = true,
  styles,
  onChange,
  onFocus,
  onLayout,
}: SeriesCreativeBriefEditorProps): ReactElement {
  // hasSavedDetails reveals persisted anchors immediately when reopening a setup.
  const hasSavedDetails: boolean = hasCreativeBriefDetails(brief);
  const [isExpanded, setIsExpanded] = useState<boolean>(
    !isEditable || hasSavedDetails,
  );
  // sectionOffsetRef stores the editor position in the setup card coordinate space.
  const sectionOffsetRef = useRef<number>(0);
  // detailsOffsetRef stores the optional anchors group position inside the editor.
  const detailsOffsetRef = useRef<number>(0);
  // fieldOffsetsRef preserves child coordinates until every parent layout is available.
  const fieldOffsetsRef = useRef<
    Record<string, { readonly fieldOffsetY: number; readonly isInDetails: boolean }>
  >({});
  // editorStyles memoizes the palette-specific component styles.
  const editorStyles: SeriesCreativeBriefEditorStyles = useMemo(
    () => createSeriesCreativeBriefEditorStyles(colors),
    [colors],
  );
  // selectedCastSize maps the optional numeric contract into choice-group strings.
  const selectedCastSize: CastSizeChoice = brief.preferredCastSize
    ? String(brief.preferredCastSize) as CastSizeChoice
    : 'auto';

  // updateTextField changes one exact learner-authored anchor without touching the rest.
  const updateTextField = (
    field: CreativeBriefTextField,
    value: string,
  ): void => {
    onChange({ ...brief, [field]: value });
  };

  // updateCastSize removes the optional property when the learner delegates cast size to AI.
  const updateCastSize = (choice: CastSizeChoice): void => {
    if (choice === 'auto') {
      const { preferredCastSize: _ignored, ...briefWithoutCastSize } = brief;

      onChange(briefWithoutCastSize);
      return;
    }

    onChange({
      ...brief,
      preferredCastSize: Number(choice) as 1 | 2 | 3 | 4,
    });
  };

  // publishFieldOffset converts one nested child position into the parent's scroll coordinates.
  const publishFieldOffset = (
    fieldId: string,
    fieldOffsetY: number,
    isInDetails: boolean,
  ): void => {
    fieldOffsetsRef.current[fieldId] = { fieldOffsetY, isInDetails };
    onLayout?.(
      fieldId,
      resolveCreativeBriefFieldOffset({
        sectionOffsetY: sectionOffsetRef.current,
        groupOffsetY: isInDetails ? detailsOffsetRef.current : 0,
        fieldOffsetY,
      }),
    );
  };

  // publishStoredOffsets refreshes child positions when a parent layout arrives later.
  const publishStoredOffsets = (): void => {
    Object.entries(fieldOffsetsRef.current).forEach(
      ([fieldId, fieldLayout]): void => {
        onLayout?.(
          fieldId,
          resolveCreativeBriefFieldOffset({
            sectionOffsetY: sectionOffsetRef.current,
            groupOffsetY: fieldLayout.isInDetails
              ? detailsOffsetRef.current
              : 0,
            fieldOffsetY: fieldLayout.fieldOffsetY,
          }),
        );
      },
    );
  };

  return (
    <View
      onLayout={(event) => {
        sectionOffsetRef.current = event.nativeEvent.layout.y;
        publishStoredOffsets();
      }}
      style={editorStyles.section}
    >
      <View style={editorStyles.headingBlock}>
        <Text style={editorStyles.heading}>YOUR IDEA</Text>
        <Text style={editorStyles.helper}>
          Start with an image, a character, or one unfinished thought. Your words
          stay unchanged.
        </Text>
      </View>
      <BriefTextField
        editorStyles={editorStyles}
        fieldId="creativeBrief.idea"
        isEditable={isEditable}
        isIdea
        label="What are you imagining?"
        maxLength={1000}
        placeholderColor={colors.labelTertiary}
        placeholder="A new airport worker receives messages from a pilot who vanished ten years ago."
        value={brief.idea}
        onChangeText={(value) => updateTextField('idea', value)}
        onFocus={onFocus}
        onLayout={(fieldId, offsetY) =>
          publishFieldOffset(fieldId, offsetY, false)
        }
      />

      <JellyPressable
        accessibilityHint="Shows optional controls for world, backstory, and story direction"
        accessibilityLabel={isExpanded ? 'Hide story anchors' : 'Add story anchors'}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={editorStyles.disclosure}
      >
        <Text style={editorStyles.disclosureText}>
          {isExpanded ? 'Hide story anchors' : '＋ Add story anchors'}
        </Text>
        <Text style={editorStyles.disclosureIcon}>{isExpanded ? '−' : '›'}</Text>
      </JellyPressable>

      {isExpanded ? (
        <View
          onLayout={(event) => {
            detailsOffsetRef.current = event.nativeEvent.layout.y;
            publishStoredOffsets();
          }}
          style={editorStyles.details}
        >
          <BriefTextField
            editorStyles={editorStyles}
            fieldId="creativeBrief.worldAndSetting"
            isEditable={isEditable}
            label="World and setting"
            maxLength={400}
            placeholderColor={colors.labelTertiary}
            placeholder="A small airport in northern Europe, present day"
            value={brief.worldAndSetting}
            onChangeText={(value) => updateTextField('worldAndSetting', value)}
            onFocus={onFocus}
            onLayout={(fieldId, offsetY) =>
              publishFieldOffset(fieldId, offsetY, true)
            }
          />
          <BriefTextField
            editorStyles={editorStyles}
            fieldId="creativeBrief.backstory"
            isEditable={isEditable}
            isMultiline
            label="What happened before?"
            maxLength={600}
            placeholderColor={colors.labelTertiary}
            placeholder="The airport closed one runway after an unexplained accident."
            value={brief.backstory}
            onChangeText={(value) => updateTextField('backstory', value)}
            onFocus={onFocus}
            onLayout={(fieldId, offsetY) =>
              publishFieldOffset(fieldId, offsetY, true)
            }
          />
          <BriefTextField
            editorStyles={editorStyles}
            fieldId="creativeBrief.storyDriver"
            isEditable={isEditable}
            isMultiline
            label="Goal or central problem"
            maxLength={500}
            placeholderColor={colors.labelTertiary}
            placeholder="Find out who is sending the messages without losing the new job."
            value={brief.storyDriver}
            onChangeText={(value) => updateTextField('storyDriver', value)}
            onFocus={onFocus}
            onLayout={(fieldId, offsetY) =>
              publishFieldOffset(fieldId, offsetY, true)
            }
          />
          <SeriesSetupChoiceGroup
            isDark={isDark}
            isDisabled={!isEditable}
            isWrapped
            label="Main cast size"
            labels={castSizeLabels}
            options={castSizeOptions}
            selected={selectedCastSize}
            styles={styles}
            onSelect={updateCastSize}
          />
          <BriefTextField
            editorStyles={editorStyles}
            fieldId="creativeBrief.mustInclude"
            isEditable={isEditable}
            label="Important to include"
            maxLength={300}
            placeholderColor={colors.labelTertiary}
            placeholder="A damaged radio and a difficult friendship"
            value={brief.mustInclude}
            onChangeText={(value) => updateTextField('mustInclude', value)}
            onFocus={onFocus}
            onLayout={(fieldId, offsetY) =>
              publishFieldOffset(fieldId, offsetY, true)
            }
          />
          <BriefTextField
            editorStyles={editorStyles}
            fieldId="creativeBrief.avoid"
            isEditable={isEditable}
            label="Please avoid"
            maxLength={300}
            placeholderColor={colors.labelTertiary}
            placeholder="No horror or romance"
            value={brief.avoid}
            onChangeText={(value) => updateTextField('avoid', value)}
            onFocus={onFocus}
            onLayout={(fieldId, offsetY) =>
              publishFieldOffset(fieldId, offsetY, true)
            }
          />
        </View>
      ) : null}

      <View style={editorStyles.freedomBlock}>
        <SeriesSetupChoiceGroup
          isDark={isDark}
          isDisabled={!isEditable}
          isWrapped
          label="How should AI work?"
          labels={draftStrategyLabels}
          options={draftStrategyOptions}
          selected={brief.draftStrategy}
          styles={styles}
          onSelect={(draftStrategy) => onChange({ ...brief, draftStrategy })}
        />
        <Text style={editorStyles.helper}>
          {describeDraftStrategy(
            brief.draftStrategy,
            brief.preferredCastSize,
            completedCharacterCount,
          )}
        </Text>
      </View>
    </View>
  );
}

// BriefTextFieldProps defines one exact user-authored anchor input.
type BriefTextFieldProps = {
  // editorStyles is the palette-specific component style contract.
  readonly editorStyles: SeriesCreativeBriefEditorStyles;
  // fieldId identifies this anchor for keyboard-aware parents.
  readonly fieldId: string;
  // isEditable locks the input after the first episode.
  readonly isEditable: boolean;
  // isIdea gives the primary seed more writing room.
  readonly isIdea?: boolean;
  // isMultiline gives supporting narrative anchors comfortable height.
  readonly isMultiline?: boolean;
  // label names the anchor in plain story language.
  readonly label: string;
  // maxLength bounds untrusted input before the server boundary.
  readonly maxLength: number;
  // placeholder demonstrates the intended level of detail.
  readonly placeholder: string;
  // placeholderColor keeps examples subordinate in both themes.
  readonly placeholderColor: string;
  // value is the exact learner-authored text.
  readonly value: string;
  // onChangeText publishes the next exact anchor text.
  readonly onChangeText: (value: string) => void;
  // onFocus lets the parent reveal the keyboard target.
  readonly onFocus: ((fieldId: string) => void) | undefined;
  // onLayout lets the parent remember the input offset.
  readonly onLayout:
    | ((fieldId: string, offsetY: number) => void)
    | undefined;
};

// BriefTextField renders one bounded creative anchor without adding business rules.
function BriefTextField({
  editorStyles,
  fieldId,
  isEditable,
  isIdea = false,
  isMultiline = false,
  label,
  maxLength,
  placeholder,
  placeholderColor,
  value,
  onChangeText,
  onFocus,
  onLayout,
}: BriefTextFieldProps): ReactElement {
  // usesMultilineLayout keeps the main idea and narrative anchors top-aligned.
  const usesMultilineLayout: boolean = isIdea || isMultiline;

  return (
    <View
      onLayout={(event) => onLayout?.(fieldId, event.nativeEvent.layout.y)}
      style={editorStyles.field}
    >
      <Text style={editorStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={isEditable}
        maxLength={maxLength}
        multiline={usesMultilineLayout}
        onChangeText={onChangeText}
        onFocus={() => onFocus?.(fieldId)}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        scrollEnabled={usesMultilineLayout}
        style={[
          editorStyles.input,
          isIdea && editorStyles.ideaInput,
          isMultiline && editorStyles.multilineInput,
          !isEditable && editorStyles.disabledInput,
        ]}
        textAlignVertical={usesMultilineLayout ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

// hasCreativeBriefDetails decides whether saved optional anchors should open on first render.
function hasCreativeBriefDetails(brief: SeriesCreativeBrief): boolean {
  return Boolean(
    brief.worldAndSetting.trim() ||
      brief.backstory.trim() ||
      brief.storyDriver.trim() ||
      brief.mustInclude.trim() ||
      brief.avoid.trim() ||
      brief.preferredCastSize,
  );
}
