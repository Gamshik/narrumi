import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Animated, View } from 'react-native';

import type { CefrLevel, LearningGenre } from '@domain/index';
import type { AppColors } from '@presentation/theme';

import { EpisodeSetupProgress } from './components/EpisodeSetupProgress';
import {
  createEpisodeSetupFlowStyles,
  type EpisodeSetupFlowStyles,
} from './EpisodeSetupFlow.styles';
import {
  getEpisodeSetupSummaryItems,
  type EpisodeSetupStep,
  type EpisodeSetupSummaryItem,
} from './episodeSetupSteps';
import {
  useEpisodeSetupTransition,
  type EpisodeSetupTransition,
} from './useEpisodeSetupTransition';

// EpisodeSetupFlowProps defines the focused two-step presentation shell.
type EpisodeSetupFlowProps = {
  // activeStep selects the task rendered by children.
  readonly activeStep: EpisodeSetupStep;
  // cefrLevel is summarized beneath the setup path from the first step.
  readonly cefrLevel: CefrLevel | undefined;
  // children is the complete content for the active setup task.
  readonly children: ReactNode;
  // colors supplies the active Sorbet palette.
  readonly colors: AppColors;
  // furthestIndex controls which progress nodes may be reopened.
  readonly furthestIndex: number;
  // genre is summarized beneath the setup path from the first step.
  readonly genre: LearningGenre | undefined;
  // isNavigationLocked keeps unresolved Story Word or generation work on its step.
  readonly isNavigationLocked: boolean;
  // onSelectStep requests a previously reached task without mutating its answers.
  readonly onSelectStep: (step: EpisodeSetupStep) => void;
};

// EpisodeSetupFlow renders compact navigation and animates only the focused task.
export function EpisodeSetupFlow({
  activeStep,
  cefrLevel,
  children,
  colors,
  furthestIndex,
  genre,
  isNavigationLocked,
  onSelectStep,
}: EpisodeSetupFlowProps): ReactElement {
  // styles memoizes the palette-specific setup layout.
  const styles: EpisodeSetupFlowStyles = useMemo(
    (): EpisodeSetupFlowStyles => createEpisodeSetupFlowStyles(colors),
    [colors],
  );
  // summaryItems keep the selected episode direction visible throughout setup.
  const summaryItems: readonly EpisodeSetupSummaryItem[] = useMemo(
    (): readonly EpisodeSetupSummaryItem[] =>
      getEpisodeSetupSummaryItems(cefrLevel, genre),
    [cefrLevel, genre],
  );
  // transition gives each task one restrained card-entry beat.
  const transition: EpisodeSetupTransition =
    useEpisodeSetupTransition(activeStep);

  return (
    <View style={styles.flow}>
      <EpisodeSetupProgress
        activeStep={activeStep}
        colors={colors}
        furthestIndex={furthestIndex}
        isNavigationLocked={isNavigationLocked}
        styles={styles}
        summaryItems={summaryItems}
        onSelect={onSelectStep}
      />
      <Animated.View
        style={[
          styles.stepMotion,
          {
            opacity: transition.opacity,
            transform: [
              { translateY: transition.translateY },
              { scale: transition.scale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}
