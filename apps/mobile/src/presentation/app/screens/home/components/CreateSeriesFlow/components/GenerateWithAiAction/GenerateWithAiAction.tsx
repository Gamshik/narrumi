import { useMemo, type ReactElement } from 'react';
import { Animated, Text, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { BubbleButton } from '../../../../../../shared';

import {
  createGenerateWithAiActionStyles,
  type GenerateWithAiActionStyles,
} from './GenerateWithAiAction.styles';
import { useAiGenerationPulse } from './useAiGenerationPulse';

// GenerateWithAiActionProps defines the shared online-only action on creative cards.
type GenerateWithAiActionProps = {
  // colors provides the active Sorbet button palette.
  readonly colors: AppColors;
  // isBusy prevents duplicate requests and conflicting field edits.
  readonly isBusy: boolean;
  // isGenerating replaces the action with the in-place progress state.
  readonly isGenerating: boolean;
  // isOnline explains why generation may be unavailable.
  readonly isOnline: boolean;
  // loadingLabel describes the result being created on the focused card.
  readonly loadingLabel: string;
  // onGenerate requests a replacement for only the current card.
  readonly onGenerate: () => void;
};

// GenerateWithAiAction keeps all three AI buttons visually and behaviorally consistent.
export function GenerateWithAiAction({
  colors,
  isBusy,
  isGenerating,
  isOnline,
  loadingLabel,
  onGenerate,
}: GenerateWithAiActionProps): ReactElement {
  // styles memoizes the active light or dark Sorbet palette.
  const styles: GenerateWithAiActionStyles = useMemo(
    (): GenerateWithAiActionStyles =>
      createGenerateWithAiActionStyles(colors),
    [colors],
  );
  // dotPulses provide the reduced-motion-aware candy-dot animation values.
  const dotPulses: readonly Animated.Value[] =
    useAiGenerationPulse(isGenerating);

  if (isGenerating) {
    // dotColors balance the three supporting Sorbet accents in one quiet signal.
    const dotColors: readonly string[] = [
      colors.systemPurple,
      colors.systemPink,
      colors.systemTeal,
    ];

    return (
      <View
        accessibilityLabel={loadingLabel}
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={styles.loadingSurface}
      >
        <View pointerEvents="none" style={styles.loadingSheen} />
        <View
          importantForAccessibility="no-hide-descendants"
          style={styles.loadingDots}
        >
          {dotPulses.map(
            (pulse: Animated.Value, index: number): ReactElement => (
              <Animated.View
                key={`generation-dot-${index + 1}`}
                style={[
                  styles.loadingDot,
                  { backgroundColor: dotColors[index] },
                  {
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
        <Text style={styles.loadingText}>{loadingLabel}</Text>
      </View>
    );
  }

  return (
    <BubbleButton
      accessibilityHint="Replaces only this card with an AI suggestion"
      colors={colors}
      contentStyle={styles.button}
      disabled={isBusy || !isOnline}
      onPress={onGenerate}
      variant="secondary"
    >
      <Text style={styles.buttonText}>
        {isOnline ? '✦ Generate by AI' : 'Available when online'}
      </Text>
    </BubbleButton>
  );
}
