import { useRef } from 'react';
import type { ReactElement } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { SeriesSetupTextField } from '../../../../../../shared';
import type { AppStyles } from '../../../../../../types';
import {
  markSetupFieldUserAuthored,
  type SeriesSetupFormErrors,
  type SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import { GenerateWithAiAction } from '../../components/GenerateWithAiAction';
import type { SeriesSetupFieldFocusHandler } from '../../seriesSetupFocus';

// IdeaStepProps defines the required story-idea card contract.
type IdeaStepProps = {
  // colors provides semantic input and button colors.
  readonly colors: AppColors;
  // errors contains the parent-owned premise validation message.
  readonly errors: SeriesSetupFormErrors;
  // form contains the visible story idea and every later setup value.
  readonly form: SeriesSetupFormState;
  // isBusy prevents edits from racing an active save or generation request.
  readonly isBusy: boolean;
  // isEditable locks the idea after the first episode.
  readonly isEditable: boolean;
  // isGenerating selects the in-place idea progress state.
  readonly isGenerating: boolean;
  // isOnline tells whether AI idea generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing fixed-height setup input contract.
  readonly sharedStyles: AppStyles;
  // onChangeForm publishes the complete controlled form after typing.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFieldFocus reveals the measured idea field above the keyboard.
  readonly onFieldFocus: SeriesSetupFieldFocusHandler;
  // onGenerate replaces only the idea field through the AI boundary.
  readonly onGenerate: () => void;
};

// IdeaStep lets the learner write one premise or generate one editable suggestion.
export function IdeaStep({
  colors,
  errors,
  form,
  isBusy,
  isEditable,
  isGenerating,
  isOnline,
  sharedStyles,
  onChangeForm,
  onFieldFocus,
  onGenerate,
}: IdeaStepProps): ReactElement {
  // fieldOffsetRef stores the idea field's position inside the active card body.
  const fieldOffsetRef = useRef<number>(0);

  return (
    <>
      <SeriesSetupTextField
        colors={colors}
        {...(errors.premise ? { error: errors.premise } : {})}
        isEditable={isEditable && !isBusy}
        isMultiline
        label="Story idea"
        maxLength={1000}
        placeholder="A night-shift worker receives messages from a pilot who vanished ten years ago."
        styles={sharedStyles}
        value={form.premise}
        onFocus={(_target: number): void => {
          onFieldFocus(fieldOffsetRef.current);
        }}
        onLayout={(event: LayoutChangeEvent): void => {
          fieldOffsetRef.current = event.nativeEvent.layout.y;
        }}
        onChangeText={(premise: string): void =>
          onChangeForm(
            markSetupFieldUserAuthored({ ...form, premise }, 'premise'),
          )
        }
      />
      {isEditable ? (
        <GenerateWithAiAction
          colors={colors}
          isBusy={isBusy}
          isGenerating={isGenerating}
          isOnline={isOnline}
          loadingLabel="Creating an idea…"
          onGenerate={onGenerate}
        />
      ) : null}
    </>
  );
}
