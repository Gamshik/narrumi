import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  BubbleSurface,
  JellyPressable,
} from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import type { EpisodeSetupFlowStyles } from '../../EpisodeSetupFlow.styles';
import {
  canNavigateToEpisodeSetupStep,
  episodeSetupSteps,
  getEpisodeSetupStepIndex,
  type EpisodeSetupStep,
  type EpisodeSetupSummaryItem,
} from '../../episodeSetupSteps';

// EpisodeSetupProgressProps defines reversible navigation and compact remembered answers.
type EpisodeSetupProgressProps = {
  // activeStep is the task currently rendered below the overview.
  readonly activeStep: EpisodeSetupStep;
  // colors supplies the current Sorbet surface palette.
  readonly colors: AppColors;
  // furthestIndex is the last task the learner has reached.
  readonly furthestIndex: number;
  // isNavigationLocked keeps active local or AI work on its owning step.
  readonly isNavigationLocked: boolean;
  // styles provides the palette-specific flow style contract.
  readonly styles: EpisodeSetupFlowStyles;
  // summaryItems are the chosen details that reopen their source task.
  readonly summaryItems: readonly EpisodeSetupSummaryItem[];
  // onSelect requests a previously reached setup task.
  readonly onSelect: (step: EpisodeSetupStep) => void;
};

// EpisodeSetupProgress combines the two-node path with remembered direction chips.
export function EpisodeSetupProgress({
  activeStep,
  colors,
  furthestIndex,
  isNavigationLocked,
  styles,
  summaryItems,
  onSelect,
}: EpisodeSetupProgressProps): ReactElement {
  // activeIndex keeps node styles and the visible count in the same ordering contract.
  const activeIndex: number = getEpisodeSetupStepIndex(activeStep);

  return (
    <BubbleSurface
      colors={colors}
      style={styles.progressSurface}
      variant="list"
    >
      <View style={styles.progressTop}>
        <Text style={styles.progressTitle}>EPISODE SETUP</Text>
        <View style={styles.progressPath}>
          {episodeSetupSteps.map(
            (step: EpisodeSetupStep, index: number): ReactElement => {
              const isActive: boolean = index === activeIndex;
              const isReached: boolean = index <= furthestIndex;
              const isLast: boolean = index === episodeSetupSteps.length - 1;
              const isDisabled: boolean =
                isNavigationLocked ||
                !canNavigateToEpisodeSetupStep(step, furthestIndex);

              return (
                <View
                  key={step}
                  style={[
                    styles.progressItem,
                    isLast && styles.progressItemLast,
                  ]}
                >
                  <JellyPressable
                    accessibilityHint={
                      isDisabled
                        ? 'Complete the scene step first'
                        : 'Opens this episode setup step'
                    }
                    accessibilityLabel={
                      step === 'details' ? 'Episode scene' : 'Story Words'
                    }
                    accessibilityState={{ disabled: isDisabled, selected: isActive }}
                    disabled={isDisabled}
                    onPress={(): void => onSelect(step)}
                    style={styles.progressNodeButton}
                  >
                    <View
                      style={[
                        styles.progressNode,
                        isReached && styles.progressNodeReached,
                        isActive && styles.progressNodeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.progressNodeText,
                          isReached && styles.progressNodeTextReached,
                          isActive && styles.progressNodeTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                  </JellyPressable>
                  {!isLast ? (
                    <View
                      style={[
                        styles.progressConnector,
                        furthestIndex > index &&
                          styles.progressConnectorReached,
                      ]}
                    />
                  ) : null}
                </View>
              );
            },
          )}
        </View>
        <Text style={styles.progressCount}>{activeIndex + 1}/2</Text>
      </View>

      {summaryItems.length > 0 ? (
        <View style={styles.summaryArea}>
          <ScrollView
            contentContainerStyle={styles.summaryRow}
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
          >
            {summaryItems.map(
              (item: EpisodeSetupSummaryItem): ReactElement => (
                <JellyPressable
                  accessibilityHint="Reopens episode scene settings"
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  accessibilityState={{ disabled: isNavigationLocked }}
                  disabled={isNavigationLocked}
                  key={item.label}
                  onPress={(): void => onSelect('details')}
                  style={({ pressed }) => [
                    styles.summaryChip,
                    pressed && styles.summaryChipPressed,
                  ]}
                >
                  <Text style={styles.summaryChipLabel}>{item.label}</Text>
                  <Text numberOfLines={1} style={styles.summaryChipValue}>
                    · {item.value}
                  </Text>
                </JellyPressable>
              ),
            )}
          </ScrollView>
        </View>
      ) : null}
    </BubbleSurface>
  );
}
