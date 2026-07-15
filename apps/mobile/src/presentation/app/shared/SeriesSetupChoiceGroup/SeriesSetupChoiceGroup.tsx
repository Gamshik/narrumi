import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { AppStyles } from '../../types';
import { JellyPressable } from '../JellyPressable';
import { seriesSetupChoiceGroupStyles } from './SeriesSetupChoiceGroup.styles';

// SeriesSetupChoiceGroupProps defines a typed option group shared by create and edit forms.
export type SeriesSetupChoiceGroupProps<T extends string> = {
  // isDark applies the restrained raised selection material for dark surfaces.
  readonly isDark: boolean;
  // isDisabled preserves the selected value while preventing edits to locked series.
  readonly isDisabled?: boolean;
  // isWrapped lets longer choices flow into balanced rows.
  readonly isWrapped?: boolean;
  // label names the option group for the setup form.
  readonly label: string;
  // labels optionally maps domain values to user-facing text.
  readonly labels?: Partial<Record<T, string>>;
  // options are the complete allowed values for this group.
  readonly options: readonly T[];
  // selected is the active typed value when the owning flow has resolved one.
  readonly selected: T | undefined;
  // styles supplies the active light or dark Sorbet theme contract.
  readonly styles: AppStyles;
  // onSelect publishes the next typed value to the owning form.
  readonly onSelect: (value: T) => void;
};

// SeriesSetupChoiceGroup renders one consistent selector material across setup fields.
export function SeriesSetupChoiceGroup<T extends string>({
  isDark,
  isDisabled = false,
  isWrapped = false,
  label,
  labels,
  options,
  selected,
  styles,
  onSelect,
}: SeriesSetupChoiceGroupProps<T>): ReactElement {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={isWrapped ? styles.choiceRowWrapped : styles.choiceRowSingle}>
        {options.map((option) => {
          const isSelected: boolean = option === selected;

          return (
            <JellyPressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled: isDisabled }}
              disabled={isDisabled}
              key={option}
              onPress={() => onSelect(option)}
              containerStyle={
                isWrapped
                  ? styles.goalChoiceWrappedContainer
                  : styles.goalChoiceSingleContainer
              }
              style={({ pressed }) => [
                isWrapped ? styles.goalChoiceWrapped : styles.goalChoiceSingle,
                isDark && seriesSetupChoiceGroupStyles.darkOptionGeometry,
                isSelected &&
                  (isWrapped
                    ? styles.activeGoalChoiceWrapped
                    : styles.activeGoalChoice),
                isSelected && seriesSetupChoiceGroupStyles.selectedDepth,
                !isDark &&
                  isSelected &&
                  seriesSetupChoiceGroupStyles.lightSelected,
                isDark &&
                  isSelected &&
                  seriesSetupChoiceGroupStyles.darkSelected,
                pressed && styles.pressed,
                isDisabled && !isSelected && styles.disabledControl,
              ]}
            >
              <Text
                style={[
                  isWrapped
                    ? styles.goalChoiceTextWrapped
                    : styles.goalChoiceText,
                  isSelected &&
                    (isWrapped
                      ? styles.activeGoalChoiceTextWrapped
                      : styles.activeGoalChoiceText),
                  isDark &&
                    isSelected &&
                    seriesSetupChoiceGroupStyles.darkSelectedText,
                ]}
              >
                {labels?.[option] ?? option}
              </Text>
            </JellyPressable>
          );
        })}
      </View>
    </View>
  );
}
