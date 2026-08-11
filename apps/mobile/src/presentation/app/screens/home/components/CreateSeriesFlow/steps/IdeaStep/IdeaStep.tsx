import type { ReactElement } from 'react';

import type { AppColors } from '@presentation/theme';

import { SeriesSetupTextField } from '../../../../../../shared';
import type { AppStyles } from '../../../../../../types';
import {
  markSetupFieldUserAuthored,
  type SeriesSetupFormErrors,
  type SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import { GenerateWithAiAction } from '../../components/GenerateWithAiAction';

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
  // isOnline tells whether AI idea generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing fixed-height setup input contract.
  readonly sharedStyles: AppStyles;
  // styles provides the active flow's action styling.
  readonly styles: CreateSeriesFlowStyles;
  // onChangeForm publishes the complete controlled form after typing.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFocus asks the card to reveal the native input above the keyboard.
  readonly onFocus: (target: number) => void;
  // onGenerate replaces only the idea field through the AI boundary.
  readonly onGenerate: () => void;
};

// IdeaStep lets the learner write one premise or generate one editable suggestion.
export function IdeaStep({
  colors,
  errors,
  form,
  isBusy,
  isOnline,
  sharedStyles,
  styles,
  onChangeForm,
  onFocus,
  onGenerate,
}: IdeaStepProps): ReactElement {
  return (
    <>
      <SeriesSetupTextField
        colors={colors}
        {...(errors.premise ? { error: errors.premise } : {})}
        isEditable={!isBusy}
        isMultiline
        label="Story idea"
        maxLength={1000}
        placeholder="A night-shift worker receives messages from a pilot who vanished ten years ago."
        styles={sharedStyles}
        value={form.premise}
        onFocus={onFocus}
        onChangeText={(premise: string): void =>
          onChangeForm(
            markSetupFieldUserAuthored({ ...form, premise }, 'premise'),
          )
        }
      />
      <GenerateWithAiAction
        colors={colors}
        isBusy={isBusy}
        isOnline={isOnline}
        styles={styles}
        onGenerate={onGenerate}
      />
    </>
  );
}
