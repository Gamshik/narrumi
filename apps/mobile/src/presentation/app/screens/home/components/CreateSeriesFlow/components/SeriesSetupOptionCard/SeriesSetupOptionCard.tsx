import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { JellyPressable } from '../../../../../../shared';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';

// SeriesSetupOptionCardProps defines one large single-choice option inside a setup card.
export type SeriesSetupOptionCardProps = {
  // icon is a compact platform-stable text glyph.
  readonly icon: string;
  // isSelected controls radio semantics and selected Sorbet depth.
  readonly isSelected: boolean;
  // label is the concise learner-facing option name.
  readonly label: string;
  // styles provides the active theme's quest-card style contract.
  readonly styles: CreateSeriesFlowStyles;
  // onPress publishes the selected domain value through the owning card.
  readonly onPress: () => void;
};

// SeriesSetupOptionCard renders one accessible radio-like choice with explanatory copy.
export function SeriesSetupOptionCard({
  icon,
  isSelected,
  label,
  styles,
  onPress,
}: SeriesSetupOptionCardProps): ReactElement {
  return (
    <JellyPressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
      ]}
    >
      <View style={styles.optionIcon}>
        <Text style={styles.optionIconText}>{icon}</Text>
      </View>
      <Text style={styles.optionTitle}>{label}</Text>
      <View
        style={[
          styles.optionRadio,
          isSelected && styles.optionRadioSelected,
        ]}
      />
    </JellyPressable>
  );
}
