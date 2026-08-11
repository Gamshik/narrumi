import type { ReactElement } from 'react';
import { Text } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { BubbleButton } from '../../../../../../shared';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';

// GenerateWithAiActionProps defines the shared online-only action on creative cards.
type GenerateWithAiActionProps = {
  // colors provides the active Sorbet button palette.
  readonly colors: AppColors;
  // isBusy prevents duplicate requests and conflicting field edits.
  readonly isBusy: boolean;
  // isOnline explains why generation may be unavailable.
  readonly isOnline: boolean;
  // styles provides the current flow's themed action geometry.
  readonly styles: CreateSeriesFlowStyles;
  // onGenerate requests a replacement for only the current card.
  readonly onGenerate: () => void;
};

// GenerateWithAiAction keeps all three AI buttons visually and behaviorally consistent.
export function GenerateWithAiAction({
  colors,
  isBusy,
  isOnline,
  styles,
  onGenerate,
}: GenerateWithAiActionProps): ReactElement {
  return (
    <BubbleButton
      accessibilityHint="Replaces only this card with an AI suggestion"
      colors={colors}
      contentStyle={styles.aiActionButton}
      disabled={isBusy || !isOnline}
      onPress={onGenerate}
      variant="secondary"
    >
      <Text style={styles.aiActionButtonText}>
        {isBusy
          ? 'Generating…'
          : isOnline
            ? '✦ Generate by AI'
            : 'Available when online'}
      </Text>
    </BubbleButton>
  );
}
