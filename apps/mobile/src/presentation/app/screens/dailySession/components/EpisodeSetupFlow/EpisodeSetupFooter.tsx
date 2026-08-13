import { useMemo, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { BubbleButton } from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import {
  createEpisodeSetupFlowStyles,
  type EpisodeSetupFlowStyles,
} from './EpisodeSetupFlow.styles';
import { EpisodeGenerationStatus } from './components/EpisodeGenerationStatus';
import type { EpisodeSetupStep } from './episodeSetupSteps';

// EpisodeSetupFooterProps defines the fixed actions for the focused preparation task.
type EpisodeSetupFooterProps = {
  // activeStep selects Continue or Back plus Generate actions.
  readonly activeStep: EpisodeSetupStep;
  // bottomInset keeps the footer above the device home indicator.
  readonly bottomInset: number;
  // colors supplies the active Sorbet button palette.
  readonly colors: AppColors;
  // isBusy prevents generation while local Story Word writes are unresolved.
  readonly isBusy: boolean;
  // isGenerating replaces the primary action with visible persistent progress.
  readonly isGenerating: boolean;
  // isOnline explains when AI generation is unavailable.
  readonly isOnline: boolean;
  // onBack returns from Story Words without discarding any selection.
  readonly onBack: () => void;
  // onContinue advances from episode direction to Story Words.
  readonly onContinue: () => void;
  // onGenerate begins the online episode request.
  readonly onGenerate: () => void;
};

// EpisodeSetupFooter keeps the dominant action reachable without extending the form.
export function EpisodeSetupFooter({
  activeStep,
  bottomInset,
  colors,
  isBusy,
  isGenerating,
  isOnline,
  onBack,
  onContinue,
  onGenerate,
}: EpisodeSetupFooterProps): ReactElement {
  // styles memoizes the palette-specific footer and loading materials.
  const styles: EpisodeSetupFlowStyles = useMemo(
    (): EpisodeSetupFlowStyles => createEpisodeSetupFlowStyles(colors),
    [colors],
  );
  // isGenerateDisabled blocks duplicate, offline, or locally inconsistent requests.
  const isGenerateDisabled: boolean = !isOnline || isBusy || isGenerating;

  return (
    <View
      style={[
        styles.footerPosition,
        styles.footerSurface,
        { bottom: bottomInset + 12 },
      ]}
    >
      {activeStep === 'details' ? (
        <BubbleButton
          accessibilityHint="Continues to Story Words"
          colors={colors}
          contentStyle={styles.footerButton}
          onPress={onContinue}
          variant="primary"
        >
          <Text style={styles.footerPrimaryText}>Continue</Text>
        </BubbleButton>
      ) : (
        <View style={styles.footerRow}>
          <BubbleButton
            accessibilityHint="Returns to episode scene settings"
            colors={colors}
            contentStyle={styles.footerButton}
            disabled={isBusy || isGenerating}
            onPress={onBack}
            style={styles.footerBack}
            variant="secondary"
          >
            <Text style={styles.footerBackText}>Back</Text>
          </BubbleButton>

          {isGenerating ? (
            <EpisodeGenerationStatus colors={colors} styles={styles} />
          ) : (
            <BubbleButton
              accessibilityHint={
                isOnline
                  ? 'Creates an episode from the selected level, genre, and Story Words'
                  : 'Episode generation becomes available when the device is online'
              }
              colors={colors}
              contentStyle={styles.footerButton}
              disabled={isGenerateDisabled}
              onPress={onGenerate}
              style={styles.footerPrimary}
              variant="primary"
            >
              <Text style={styles.footerPrimaryText}>
                {isOnline
                  ? isBusy
                    ? 'Updating words...'
                    : 'Generate episode'
                  : 'Available when online'}
              </Text>
            </BubbleButton>
          )}
        </View>
      )}
    </View>
  );
}
