import type { ReactElement } from 'react';

import type { AppColors } from '@presentation/theme';
import type { SeriesCharacterProfile } from '@domain/index';

import {
  CharacterProfilesEditor,
  SeriesSetupTextField,
} from '../../../../../../shared';
import type { AppStyles } from '../../../../../../types';
import {
  markSetupFieldUserAuthored,
  type SeriesSetupFormErrors,
  type SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import { GenerateWithAiAction } from '../../components/GenerateWithAiAction';

// CharactersStepProps defines the required cast card contract.
type CharactersStepProps = {
  // colors provides semantic colors for shared character controls.
  readonly colors: AppColors;
  // errors contains parent-owned cast and learner-role validation messages.
  readonly errors: SeriesSetupFormErrors;
  // form contains the editable cast and canonical learner identity.
  readonly form: SeriesSetupFormState;
  // isBusy prevents edits from racing an active save or generation request.
  readonly isBusy: boolean;
  // isOnline tells whether AI cast generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing setup input contract.
  readonly sharedStyles: AppStyles;
  // styles provides the active flow's action styling.
  readonly styles: CreateSeriesFlowStyles;
  // onChangeForm publishes the complete controlled form after an edit.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFocus asks the card to reveal the native input above the keyboard.
  readonly onFocus: (target: number) => void;
  // onGenerate replaces only the cast and Character-mode identity through AI.
  readonly onGenerate: () => void;
};

// CharactersStep supports a manual cast or one editable AI-generated cast.
export function CharactersStep({
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
}: CharactersStepProps): ReactElement {
  return (
    <>
      <CharacterProfilesEditor
        colors={colors}
        {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
        isEditable={!isBusy}
        profiles={form.characterProfiles}
        onFocus={onFocus}
        onChange={(
          characterProfiles: readonly SeriesCharacterProfile[],
        ): void =>
          onChangeForm(
            markSetupFieldUserAuthored(
              { ...form, characterProfiles },
              'characterProfiles',
            ),
          )
        }
      />
      {form.participationMode === 'character' ? (
        <SeriesSetupTextField
          colors={colors}
          {...(errors.userRole ? { error: errors.userRole } : {})}
          isCompactMultiline
          isEditable={!isBusy}
          label="Your character"
          maxLength={160}
          placeholder="Maya"
          styles={sharedStyles}
          value={form.userRole}
          onFocus={onFocus}
          onChangeText={(userRole: string): void =>
            onChangeForm(
              markSetupFieldUserAuthored({ ...form, userRole }, 'userRole'),
            )
          }
        />
      ) : null}
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
