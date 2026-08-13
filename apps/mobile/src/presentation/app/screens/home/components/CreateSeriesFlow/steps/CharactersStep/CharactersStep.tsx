import { useRef } from 'react';
import type { ReactElement } from 'react';
import type { LayoutChangeEvent } from 'react-native';

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
import { GenerateWithAiAction } from '../../components/GenerateWithAiAction';
import type { SeriesSetupFieldFocusHandler } from '../../seriesSetupFocus';

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
  // isEditable locks the cast after the first episode.
  readonly isEditable: boolean;
  // isGenerating selects the in-place cast progress state.
  readonly isGenerating: boolean;
  // isOnline tells whether AI cast generation is currently available.
  readonly isOnline: boolean;
  // sharedStyles provides the existing setup input contract.
  readonly sharedStyles: AppStyles;
  // onChangeForm publishes the complete controlled form after an edit.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onFieldFocus reveals any measured Cast field above the keyboard.
  readonly onFieldFocus: SeriesSetupFieldFocusHandler;
  // onGenerate replaces only the cast and Character-mode identity through AI.
  readonly onGenerate: () => void;
};

// CharactersStep supports a manual cast or one editable AI-generated cast.
export function CharactersStep({
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
}: CharactersStepProps): ReactElement {
  // editorOffsetRef locates the reusable editor inside the setup card body.
  const editorOffsetRef = useRef<number>(0);
  // learnerRoleOffsetRef locates the optional learner identity below the repeated rows.
  const learnerRoleOffsetRef = useRef<number>(0);

  return (
    <>
      <CharacterProfilesEditor
        colors={colors}
        {...(errors.mainCharacters ? { error: errors.mainCharacters } : {})}
        isEditable={isEditable && !isBusy}
        profiles={form.characterProfiles}
        onFieldFocus={(rowOffsetY: number): void => {
          onFieldFocus(editorOffsetRef.current + rowOffsetY);
        }}
        onLayout={(event: LayoutChangeEvent): void => {
          editorOffsetRef.current = event.nativeEvent.layout.y;
        }}
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
          isEditable={isEditable && !isBusy}
          label="Your character"
          maxLength={160}
          placeholder="Maya"
          styles={sharedStyles}
          value={form.userRole}
          onFocus={(_target: number): void => {
            onFieldFocus(learnerRoleOffsetRef.current);
          }}
          onLayout={(event: LayoutChangeEvent): void => {
            learnerRoleOffsetRef.current = event.nativeEvent.layout.y;
          }}
          onChangeText={(userRole: string): void =>
            onChangeForm(
              markSetupFieldUserAuthored({ ...form, userRole }, 'userRole'),
            )
          }
        />
      ) : null}
      {isEditable ? (
        <GenerateWithAiAction
          colors={colors}
          isBusy={isBusy}
          isGenerating={isGenerating}
          isOnline={isOnline}
          loadingLabel="Creating your cast…"
          onGenerate={onGenerate}
        />
      ) : null}
    </>
  );
}
