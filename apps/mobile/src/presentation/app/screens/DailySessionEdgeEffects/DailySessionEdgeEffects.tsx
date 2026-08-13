import type { ReactElement, RefObject } from 'react';
import { Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import { BackIconButton, ScreenEdgeEffects } from '../../shared';
import { dailySessionEdgeEffectStyles } from './DailySessionEdgeEffects.styles';

// DailySessionEdgeEffectsProps combines shared edge material with setup exit navigation.
type DailySessionEdgeEffectsProps = {
  // blurTarget identifies the source view on platforms where progressive blur sampling is enabled.
  readonly blurTarget: RefObject<View | null>;
  // bottomInset keeps the quiet lower fade continuous through the home indicator.
  readonly bottomInset: number;
  // colors supplies the active Sorbet palette for glass and icon contrast.
  readonly colors: AppColors;
  // isDark selects the matching native blur tint.
  readonly isDark: boolean;
  // onExit returns from episode setup to the owning series.
  readonly onExit: () => void;
  // topInset positions the icon below the device status area.
  readonly topInset: number;
  // title is the single centered setup heading.
  readonly title: string;
};

// DailySessionEdgeEffects renders a fixed create-style header over shared edge material.
export function DailySessionEdgeEffects({
  blurTarget,
  bottomInset,
  colors,
  isDark,
  onExit,
  title,
  topInset,
}: DailySessionEdgeEffectsProps): ReactElement {
  // exitButtonTop aligns the 44-point target inside the strongest glass region.
  const exitButtonTop: number = topInset + 12;

  return (
    <View pointerEvents="box-none" style={dailySessionEdgeEffectStyles.fill}>
      <ScreenEdgeEffects
        blurTarget={blurTarget}
        bottomInset={bottomInset}
        bottomVariant="modal"
        colors={colors}
        isDark={isDark}
        materialOpacity={1}
        topInset={topInset}
        topVariant="compact"
      />
      <View
        pointerEvents="none"
        style={[
          dailySessionEdgeEffectStyles.compactTitleContainer,
          {
            top: exitButtonTop,
          },
        ]}
      >
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            dailySessionEdgeEffectStyles.compactTitle,
            { color: colors.labelPrimary, fontFamily: fontFamilies.display },
          ]}
        >
          {title}
        </Text>
      </View>
      <BackIconButton
        accessibilityHint="Returns to the series screen"
        accessibilityLabel="Exit episode setup"
        colors={colors}
        onPress={onExit}
        style={[
          dailySessionEdgeEffectStyles.exitButton,
          { top: exitButtonTop },
        ]}
      />
    </View>
  );
}
