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

// TitleStepProps defines the final required title card contract.
type TitleStepProps = {
  // colors provides semantic input and button colors.
  readonly colors: AppColors;
  // errors contains the parent-owned title validation message.
  readonly errors: SeriesSetupFormErrors;
  // form contains the editable final title and earlier story context.
  readonly form: SeriesSetupFormState;
  // isBusy prevents edits from racing an active save or generation request.
  readonly isBusy: boolean;
  // isOnline tells whether AI title generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing setup input contract.
  readonly sharedStyles: AppStyles;
  // styles provides the active flow's action styling.
  readonly styles: CreateSeriesFlowStyles;
  // onChangeForm publishes the complete controlled form after typing.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFocus asks the card to reveal the native input above the keyboard.
  readonly onFocus: (target: number) => void;
  // onGenerate replaces only the title through the AI boundary.
  readonly onGenerate: () => void;
};

// TitleStep lets the learner name the ready series manually or through AI.
export function TitleStep({
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
}: TitleStepProps): ReactElement {
  return (
    <>
      <SeriesSetupTextField
        colors={colors}
        {...(errors.title ? { error: errors.title } : {})}
        isEditable={!isBusy}
        label="Series title"
        maxLength={160}
        placeholder="Orbit Letters"
        styles={sharedStyles}
        value={form.title}
        onFocus={onFocus}
        onChangeText={(title: string): void =>
          onChangeForm(
            markSetupFieldUserAuthored({ ...form, title }, 'title'),
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
