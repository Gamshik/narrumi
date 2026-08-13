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
  // isEditable locks the title after the first episode.
  readonly isEditable: boolean;
  // isGenerating selects the in-place title progress state.
  readonly isGenerating: boolean;
  // isOnline tells whether AI title generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing setup input contract.
  readonly sharedStyles: AppStyles;
  // onChangeForm publishes the complete controlled form after typing.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFieldFocus reveals the measured title field above the keyboard.
  readonly onFieldFocus: SeriesSetupFieldFocusHandler;
  // onGenerate replaces only the title through the AI boundary.
  readonly onGenerate: () => void;
};

// TitleStep lets the learner name the ready series manually or through AI.
export function TitleStep({
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
}: TitleStepProps): ReactElement {
  // fieldOffsetRef stores the title field's position inside the active card body.
  const fieldOffsetRef = useRef<number>(0);

  return (
    <>
      <SeriesSetupTextField
        colors={colors}
        {...(errors.title ? { error: errors.title } : {})}
        isEditable={isEditable && !isBusy}
        label="Series title"
        maxLength={160}
        placeholder="Orbit Letters"
        styles={sharedStyles}
        value={form.title}
        onFocus={(_target: number): void => {
          onFieldFocus(fieldOffsetRef.current);
        }}
        onLayout={(event: LayoutChangeEvent): void => {
          fieldOffsetRef.current = event.nativeEvent.layout.y;
        }}
        onChangeText={(title: string): void =>
          onChangeForm(
            markSetupFieldUserAuthored({ ...form, title }, 'title'),
          )
        }
      />
      {isEditable ? (
        <GenerateWithAiAction
          colors={colors}
          isBusy={isBusy}
          isGenerating={isGenerating}
          isOnline={isOnline}
          loadingLabel="Naming your series…"
          onGenerate={onGenerate}
        />
      ) : null}
    </>
  );
}
