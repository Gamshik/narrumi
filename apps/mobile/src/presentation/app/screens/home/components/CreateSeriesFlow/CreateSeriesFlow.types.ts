import type { SeriesSetupGenerationTarget } from '@application/ports';
import type {
  SeriesSetupFormErrors,
  SeriesSetupFormState,
} from '../../../seriesSetupForm';
import type { AppStyles } from '../../../../types';
import type { AppColors } from '@presentation/theme';

// CreateSeriesFlowProps defines the complete presentation contract for the create-series modal.
export type CreateSeriesFlowProps = {
  // actionError reports save or generation failures without moving the learner to another card.
  readonly actionError: string | undefined;
  // colors provides the active semantic light or dark palette.
  readonly colors: AppColors;
  // errors contains parent-owned validation messages for final setup fields.
  readonly errors: SeriesSetupFormErrors;
  // form is the controlled setup value shared with application use cases.
  readonly form: SeriesSetupFormState;
  // isDark selects dark-theme geometry for shared choice controls.
  readonly isDark: boolean;
  // isGeneratingSetup blocks duplicate AI setup requests.
  readonly isGeneratingSetup: boolean;
  // isOnline tells whether the server-backed AI action is currently available.
  readonly isOnline: boolean;
  // isSaving blocks duplicate local draft or series writes.
  readonly isSaving: boolean;
  // isVisible controls the native modal presentation.
  readonly isVisible: boolean;
  // styles is the shared app StyleSheet required by existing setup fields.
  readonly styles: AppStyles;
  // onChangeForm publishes a complete controlled form after any learner edit.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onClose dismisses the flow without writing the current in-memory form.
  readonly onClose: () => void;
  // onGenerate replaces only the field owned by the current card through the AI boundary.
  readonly onGenerate: (
    target: SeriesSetupGenerationTarget,
  ) => Promise<boolean>;
  // onSaveDraft persists the current form locally and closes the flow.
  readonly onSaveDraft: () => Promise<void>;
  // onSubmit creates the complete locally persisted series from all four cards.
  readonly onSubmit: () => Promise<void>;
};
