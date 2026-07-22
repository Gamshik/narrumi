import type { ReactElement } from 'react';
import { Text, TextInput, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import type { AppStyles } from '../../types';
import { BubbleStatus } from '../BubbleStatus';
import type { KeyboardFocusTargetHandler } from '../KeyboardAwareScroll';

// SeriesSetupTextFieldProps defines one editable or locked final setup field.
export type SeriesSetupTextFieldProps = {
  // colors supplies semantic colors for validation feedback.
  readonly colors: AppColors;
  // error is the visible local validation result.
  readonly error?: string;
  // helper explains a field-specific product rule.
  readonly helper?: string;
  // isAiSuggested distinguishes replaceable AI text from learner-owned text.
  readonly isAiSuggested?: boolean;
  // isCompactMultiline gives short narrative values extra touch height.
  readonly isCompactMultiline?: boolean;
  // isEditable locks setup values after the first episode.
  readonly isEditable?: boolean;
  // isMultiline gives the premise enough writing space.
  readonly isMultiline?: boolean;
  // label names the field in the final series draft.
  readonly label: string;
  // maxLength bounds the field before it reaches a trust boundary.
  readonly maxLength?: number;
  // placeholder demonstrates a concise valid value.
  readonly placeholder: string;
  // styles is the shared app form style contract.
  readonly styles: AppStyles;
  // value is the current exact setup text.
  readonly value: string;
  // onChangeText publishes learner edits and lets the parent update provenance.
  readonly onChangeText: (value: string) => void;
  // onFocus lets the parent reveal the exact native keyboard target.
  readonly onFocus: KeyboardFocusTargetHandler;
};

// SeriesSetupTextField renders a shared setup input with unobtrusive AI provenance.
export function SeriesSetupTextField({
  colors,
  error,
  helper,
  isAiSuggested = false,
  isCompactMultiline = false,
  isEditable = true,
  isMultiline = false,
  label,
  maxLength,
  placeholder,
  styles,
  value,
  onChangeText,
  onFocus,
}: SeriesSetupTextFieldProps): ReactElement {
  // usesMultilineLayout keeps narrative fields top-aligned.
  const usesMultilineLayout: boolean = isMultiline || isCompactMultiline;

  return (
    <View style={styles.formGroup}>
      <View style={styles.formLabelRow}>
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
        {isAiSuggested ? (
          <Text style={styles.setupAiSourceLabel}>AI SUGGESTION · EDITABLE</Text>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        editable={isEditable}
        maxLength={maxLength}
        multiline={usesMultilineLayout}
        onChangeText={onChangeText}
        onFocus={(event) => onFocus(event.nativeEvent.target)}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholder.color}
        scrollEnabled={usesMultilineLayout}
        style={[
          styles.formInput,
          isMultiline && styles.formTextArea,
          isCompactMultiline && styles.formCompactTextArea,
          !isEditable && styles.setupReadOnlyInput,
        ]}
        textAlignVertical={usesMultilineLayout ? 'top' : 'center'}
        value={value}
      />
      {error ? (
        <BubbleStatus
          colors={colors}
          tone="error"
          title={error}
          variant="compact"
        />
      ) : null}
      {!error && helper ? (
        <Text style={styles.formHelperText}>{helper}</Text>
      ) : null}
    </View>
  );
}
