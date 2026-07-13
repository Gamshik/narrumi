import type { ReactElement } from 'react';
import { Text, type StyleProp, type ViewStyle } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { JellyPressable } from '../JellyPressable';
import { backIconButtonStyles } from './BackIconButton.styles';

// BackIconButtonProps defines the shared visual and accessibility contract for backward navigation.
type BackIconButtonProps = {
  // accessibilityHint explains the destination when the surrounding context is insufficient.
  readonly accessibilityHint?: string;
  // accessibilityLabel names the specific Back or Exit action for assistive technology.
  readonly accessibilityLabel: string;
  // colors supplies the active Sorbet surface and accent palette.
  readonly colors: AppColors;
  // onPress performs the caller-owned backward navigation.
  readonly onPress: () => void;
  // style positions the fixed-size container without changing the shared button geometry.
  readonly style?: StyleProp<ViewStyle>;
};

// BackIconButton renders the canonical circular Back and Exit affordance.
export function BackIconButton({
  accessibilityHint,
  accessibilityLabel,
  colors,
  onPress,
  style,
}: BackIconButtonProps): ReactElement {
  return (
    <JellyPressable
      {...(accessibilityHint ? { accessibilityHint } : {})}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      containerStyle={[backIconButtonStyles.container, style]}
      onPress={onPress}
      style={[
        backIconButtonStyles.button,
        {
          backgroundColor: colors.bubbleSurface,
          borderColor: colors.bubbleBorder,
        },
      ]}
    >
      <Text
        style={[
          backIconButtonStyles.icon,
          { color: colors.systemBlue },
        ]}
      >
        ←
      </Text>
    </JellyPressable>
  );
}
