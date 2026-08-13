import type { ReactElement } from 'react';
import { Animated, Text, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import type { EpisodeSetupFlowStyles } from '../../EpisodeSetupFlow.styles';
import { useEpisodeGenerationPulse } from './useEpisodeGenerationPulse';

// EpisodeGenerationStatusProps defines the in-place writing feedback surface.
type EpisodeGenerationStatusProps = {
  // colors supplies the three Sorbet progress accents.
  readonly colors: AppColors;
  // styles provides the palette-specific status surface contract.
  readonly styles: EpisodeSetupFlowStyles;
};

// EpisodeGenerationStatus keeps progress visible without shifting footer layout.
export function EpisodeGenerationStatus({
  colors,
  styles,
}: EpisodeGenerationStatusProps): ReactElement {
  // dotPulses provide the reduced-motion-aware writing indicator.
  const dotPulses: readonly Animated.Value[] =
    useEpisodeGenerationPulse(true);
  // dotColors balance the three supporting Sorbet accents.
  const dotColors: readonly [string, string, string] = [
    colors.systemPurple,
    colors.systemPink,
    colors.systemTeal,
  ];

  return (
    <View
      accessibilityLabel="Writing your episode"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.generationSurface}
    >
      <View pointerEvents="none" style={styles.generationSheen} />
      <View
        importantForAccessibility="no-hide-descendants"
        style={styles.generationDots}
      >
        {dotPulses.map(
          (pulse: Animated.Value, index: number): ReactElement => (
            <Animated.View
              key={`episode-generation-dot-${index + 1}`}
              style={[
                styles.generationDot,
                {
                  backgroundColor: dotColors[index] ?? colors.systemPurple,
                  opacity: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.46, 1],
                  }),
                  transform: [
                    {
                      translateY: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -3],
                      }),
                    },
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.82, 1.22],
                      }),
                    },
                  ],
                },
              ]}
            />
          ),
        )}
      </View>
      <Text style={styles.generationText}>Writing your episode...</Text>
    </View>
  );
}
