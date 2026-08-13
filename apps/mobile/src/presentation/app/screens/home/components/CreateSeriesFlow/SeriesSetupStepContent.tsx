import type { ReactElement } from 'react';

import type { SeriesSetupGenerationTarget } from '@application/ports';
import type { AppColors } from '@presentation/theme';

import type { AppStyles } from '../../../../types';
import type {
  SeriesSetupFormErrors,
  SeriesSetupFormState,
} from '../../../seriesSetupForm';

import type { CreateSeriesFlowStyles } from './CreateSeriesFlow.styles';
import type { SeriesSetupStep } from './seriesSetupFlow';
import type { SeriesSetupFieldFocusHandler } from './seriesSetupFocus';
import { CharactersStep } from './steps/CharactersStep';
import { IdeaStep } from './steps/IdeaStep';
import { ParticipationStep } from './steps/ParticipationStep';
import { TitleStep } from './steps/TitleStep';

// SeriesSetupStepContentProps contains controlled values and actions shared by all cards.
type SeriesSetupStepContentProps = {
  // colors provides semantic colors for custom inputs and shared components.
  readonly colors: AppColors;
  // errors contains validation messages for final required fields.
  readonly errors: SeriesSetupFormErrors;
  // flowStyles provides quest-card-specific Sorbet styling.
  readonly flowStyles: CreateSeriesFlowStyles;
  // form is the complete controlled setup state.
  readonly form: SeriesSetupFormState;
  // isBusy prevents field edits while local persistence or AI work is active.
  readonly isBusy: boolean;
  // isGenerating selects the inline progress state on creative cards.
  readonly isGenerating: boolean;
  // isEditable locks every setup value after the first episode.
  readonly isEditable: boolean;
  // isOnline tells the AI card whether its server action is available.
  readonly isOnline: boolean;
  // sharedStyles provides the app-wide input and label style contract.
  readonly sharedStyles: AppStyles;
  // step selects the focused decision content.
  readonly step: SeriesSetupStep;
  // onChangeForm publishes a complete controlled form after an edit.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFieldFocus reveals a measured setup field without a native handle.
  readonly onFieldFocus: SeriesSetupFieldFocusHandler;
  // onGenerate requests an AI replacement for only the current card.
  readonly onGenerate: (target: SeriesSetupGenerationTarget) => void;
};

// SeriesSetupStepContent delegates each focused responsibility to its own card component.
export function SeriesSetupStepContent({
  colors,
  errors,
  flowStyles,
  form,
  isBusy,
  isEditable,
  isGenerating,
  isOnline,
  sharedStyles,
  step,
  onChangeForm,
  onFieldFocus,
  onGenerate,
}: SeriesSetupStepContentProps): ReactElement {
  if (step === 'participation') {
    return (
      <ParticipationStep
        form={form}
        isEditable={isEditable}
        styles={flowStyles}
        onChangeForm={onChangeForm}
      />
    );
  }

  if (step === 'idea') {
    return (
      <IdeaStep
        colors={colors}
        errors={errors}
        form={form}
        isBusy={isBusy}
        isEditable={isEditable}
        isGenerating={isGenerating}
        isOnline={isOnline}
        sharedStyles={sharedStyles}
        onChangeForm={onChangeForm}
        onFieldFocus={onFieldFocus}
        onGenerate={(): void => onGenerate('premise')}
      />
    );
  }

  if (step === 'characters') {
    return (
      <CharactersStep
        colors={colors}
        errors={errors}
        form={form}
        isBusy={isBusy}
        isEditable={isEditable}
        isGenerating={isGenerating}
        isOnline={isOnline}
        sharedStyles={sharedStyles}
        onChangeForm={onChangeForm}
        onFieldFocus={onFieldFocus}
        onGenerate={(): void => onGenerate('characterProfiles')}
      />
    );
  }

  return (
    <TitleStep
      colors={colors}
      errors={errors}
      form={form}
      isBusy={isBusy}
      isEditable={isEditable}
      isGenerating={isGenerating}
      isOnline={isOnline}
      sharedStyles={sharedStyles}
      onChangeForm={onChangeForm}
      onFieldFocus={onFieldFocus}
      onGenerate={(): void => onGenerate('title')}
    />
  );
}
