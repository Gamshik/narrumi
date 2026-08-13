import type { ReactElement } from 'react';
import { View } from 'react-native';

import {
  markSetupFieldUserAuthored,
  type SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import { SeriesSetupOptionCard } from '../../components/SeriesSetupOptionCard';

// ParticipationOption describes one explicit learner role choice.
type ParticipationOption = {
  // icon is a compact text glyph that remains consistent across platforms.
  readonly icon: string;
  // label is the learner-facing role name.
  readonly label: string;
  // value is the domain participation mode.
  readonly value: SeriesSetupFormState['participationMode'];
};

// ParticipationStepProps defines the controlled participation card contract.
type ParticipationStepProps = {
  // form contains the current participation mode and all later setup values.
  readonly form: SeriesSetupFormState;
  // isEditable locks mode selection after the first episode.
  readonly isEditable: boolean;
  // styles provides the active theme's quest-card style contract.
  readonly styles: CreateSeriesFlowStyles;
  // onChangeForm publishes the complete controlled form after selection.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
};

// participationOptions keep the first card focused on the story interaction model.
const participationOptions: readonly ParticipationOption[] = [
  {
    value: 'director',
    label: 'Producer',
    icon: 'P',
  },
  {
    value: 'character',
    label: 'Character',
    icon: 'C',
  },
];

// ParticipationStep selects how the learner influences every episode in the series.
export function ParticipationStep({
  form,
  isEditable,
  styles,
  onChangeForm,
}: ParticipationStepProps): ReactElement {
  return (
    <View style={styles.optionList}>
      {participationOptions.map((option: ParticipationOption) => (
        <SeriesSetupOptionCard
          icon={option.icon}
          isDisabled={!isEditable}
          isSelected={form.participationMode === option.value}
          key={option.value}
          label={option.label}
          styles={styles}
          onPress={(): void => {
            onChangeForm(
              markSetupFieldUserAuthored(
                {
                  ...form,
                  participationMode: option.value,
                  ...(option.value === 'director' ? { userRole: '' } : {}),
                },
                'userRole',
              ),
            );
          }}
        />
      ))}
    </View>
  );
}
