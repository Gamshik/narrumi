import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { AppColors } from '@presentation/theme';
import { fontFamilies, radii, shadows } from '@presentation/theme';
import { JellyPressable } from '../JellyPressable/JellyPressable';

export type BubbleSegmentedControlProps = {
  readonly colors: AppColors;
  readonly onValueChange: (value: string, index: number) => void;
  readonly selectedIndex: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly values: readonly string[];
};

export function BubbleSegmentedControl({
  colors,
  onValueChange,
  selectedIndex,
  style,
  values,
}: BubbleSegmentedControlProps): ReactElement {
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundTertiary }, style]}>
      {values.map((value, index) => {
        const isActive = index === selectedIndex;

        return (
          <JellyPressable
            key={value}
            onPress={() => onValueChange(value, index)}
            style={({ pressed }) => [
              styles.segment,
              isActive && [
                styles.activeSegment,
                { backgroundColor: colors.systemBlue, ...shadows.clay },
              ],
              pressed && !isActive && { opacity: 0.6 },
            ]}
            containerStyle={styles.segmentContainer}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isActive ? '#ffffff' : colors.labelSecondary },
                isActive && styles.activeSegmentText,
              ]}
            >
              {value}
            </Text>
          </JellyPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.xl,
  },
  segmentContainer: {
    flex: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    minHeight: 34,
    paddingHorizontal: 8,
  },
  activeSegment: {
    // Provided via style array for colors/shadows
  },
  segmentText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
  },
  activeSegmentText: {
    fontFamily: fontFamilies.bodyBold,
  },
});
