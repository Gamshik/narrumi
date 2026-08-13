import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { JellyPressable } from '@presentation/app/shared';
import type { LevelFilter } from '@presentation/app/types';
import type { AppColors } from '@presentation/theme';

import {
  createDictionaryLevelFilterPopoverStyles,
  type DictionaryLevelFilterPopoverStyles,
} from './DictionaryLevelFilterPopover.styles';

// LevelOptionDefinition supplies concise proficiency context for one CEFR filter.
type LevelOptionDefinition = {
  // description translates the short code without adding a separate legend.
  readonly description: string;
  // level is applied immediately when the option is pressed.
  readonly level: LevelFilter;
};

// levelOptions follows normal CEFR reading order after the full-catalog option.
const levelOptions: readonly LevelOptionDefinition[] = [
  { level: 'ALL', description: 'Full local catalog' },
  { level: 'A1', description: 'Beginner' },
  { level: 'A2', description: 'Elementary' },
  { level: 'B1', description: 'Intermediate' },
  { level: 'B2', description: 'Upper intermediate' },
  { level: 'C1', description: 'Advanced' },
  { level: 'C2', description: 'Proficient' },
] as const;

// DictionaryLevelFilterPopoverProps keeps filter state in the screen and owns contextual presentation only.
type DictionaryLevelFilterPopoverProps = {
  // colors supplies the live Sorbet material and CEFR accents.
  readonly colors: AppColors;
  // isDark selects the platform blur tint behind the popover.
  readonly isDark: boolean;
  // level marks the selected option.
  readonly level: LevelFilter;
  // visible controls whether the contextual overlay participates in layout and input.
  readonly visible: boolean;
  // onChangeLevel applies one selected constraint.
  readonly onChangeLevel: (level: LevelFilter) => void;
  // onClose dismisses from selection, outside press, close control, or Android Back.
  readonly onClose: () => void;
};

// LevelOptionProps describes one immediate-apply item in the compact popover grid.
type LevelOptionProps = {
  readonly colors: AppColors;
  readonly definition: LevelOptionDefinition;
  readonly isSelected: boolean;
  readonly onPress: () => void;
  readonly styles: DictionaryLevelFilterPopoverStyles;
};

// DictionaryLevelFilterPopover opens beside its trigger instead of moving context to the screen bottom.
export function DictionaryLevelFilterPopover({
  colors,
  isDark,
  level,
  visible,
  onChangeLevel,
  onClose,
}: DictionaryLevelFilterPopoverProps): ReactElement {
  // styles changes only with the active semantic palette.
  const styles: DictionaryLevelFilterPopoverStyles = useMemo(
    (): DictionaryLevelFilterPopoverStyles =>
      createDictionaryLevelFilterPopoverStyles(colors),
    [colors],
  );
  // progress drives a short anchored reveal from the filter-button side.
  const [progress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // materialColors keep the Android panel opaque enough to hide moving dictionary rows beneath it.
  const materialColors: readonly [string, string] =
    Platform.OS === 'android'
      ? [colors.backgroundTertiary, colors.backgroundSecondary]
      : [colors.bubbleSurfaceRaised, colors.bubbleSurface];

  useEffect((): (() => void) | undefined => {
    if (!visible) {
      progress.setValue(0);
      return undefined;
    }

    const frameId: number = requestAnimationFrame((): void => {
      Animated.spring(progress, {
        bounciness: 3,
        speed: 28,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });

    return (): void => cancelAnimationFrame(frameId);
  }, [progress, visible]);

  useEffect((): (() => void) | undefined => {
    if (!visible) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      (): boolean => {
        onClose();
        return true;
      },
    );

    return (): void => subscription.remove();
  }, [onClose, visible]);

  // panelMotion makes the palette appear to unfold from the nearby filter control.
  const panelMotion: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: progress,
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  // handleLevelPress avoids a redundant Apply action and returns directly to browsing.
  const handleLevelPress = (nextLevel: LevelFilter): void => {
    onChangeLevel(nextLevel);
    onClose();
  };

  if (!visible) {
    return <></>;
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Close level filter"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.scrim}
      />
      <Animated.View style={[styles.panel, panelMotion]}>
        {Platform.OS !== 'android' ? (
          <BlurView
            intensity={30}
            pointerEvents="none"
            style={styles.material}
            tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
          />
        ) : null}
        <LinearGradient
          colors={materialColors}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.material}
        />
        <View pointerEvents="none" style={styles.panelGlow} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>CEFR level</Text>
              <Text style={styles.subtitle}>Filter the catalog in one tap</Text>
            </View>
            <JellyPressable
              accessibilityLabel="Close level filter"
              accessibilityRole="button"
              containerStyle={styles.closeButtonContainer}
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </JellyPressable>
          </View>

          <View accessibilityRole="radiogroup" style={styles.grid}>
            {levelOptions.map((definition): ReactElement => (
              <LevelOption
                colors={colors}
                definition={definition}
                isSelected={definition.level === level}
                key={definition.level}
                onPress={() => handleLevelPress(definition.level)}
                styles={styles}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// LevelOption renders one quiet bubble and uses color only as a compact scanning signal.
function LevelOption({
  colors,
  definition,
  isSelected,
  onPress,
  styles,
}: LevelOptionProps): ReactElement {
  // isAll gives the complete catalog a clear full-width first choice.
  const isAll: boolean = definition.level === 'ALL';
  // levelColor mirrors the narrow accent rail used on vocabulary rows.
  const levelColor: string = getLevelColor(colors, definition.level);
  // optionLabel expands the storage value into natural product copy.
  const optionLabel: string = isAll ? 'All levels' : definition.level;

  return (
    <JellyPressable
      accessibilityLabel={`${optionLabel}, ${definition.description}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      containerStyle={[
        styles.optionContainer,
        isAll && styles.allOptionContainer,
      ]}
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: isSelected
            ? colors.pillSelectedSurface
            : colors.bubbleSurfaceMuted,
          borderColor: isSelected ? colors.systemPurple : colors.pillBorder,
        },
      ]}
    >
      {isSelected ? (
        <LinearGradient
          colors={[colors.badgeAccentSurface, colors.pillSelectedSurface]}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.optionFill}
        />
      ) : null}
      <View style={[styles.optionDot, { backgroundColor: levelColor }]} />
      <Text
        style={[
          styles.optionCode,
          { color: isSelected ? colors.systemBlue : colors.labelPrimary },
        ]}
      >
        {optionLabel}
      </Text>
      <Text
        style={[
          styles.optionDescription,
          { color: colors.labelSecondary },
        ]}
      >
        {definition.description}
      </Text>
    </JellyPressable>
  );
}

// getLevelColor maps CEFR progression to the established dictionary accent system.
function getLevelColor(colors: AppColors, level: LevelFilter): string {
  switch (level) {
    case 'ALL':
      return colors.systemBlue;
    case 'A1':
      return colors.systemGreen;
    case 'A2':
      return colors.systemTeal;
    case 'B1':
      return colors.systemOrange;
    case 'B2':
      return colors.systemPurple;
    case 'C1':
      return colors.systemPink;
    case 'C2':
      return colors.systemBlue;
  }
}
