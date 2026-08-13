import type { ReactElement, ReactNode, Ref } from 'react';
import { ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { BubbleSurface } from '../../../../shared';
import type { CreateSeriesFlowStyles } from './CreateSeriesFlow.styles';

// SeriesSetupStepCardProps defines one focused task inside the setup quest.
type SeriesSetupStepCardProps = {
  // body contains the step-specific controls.
  readonly body: ReactNode;
  // colors provides the active Sorbet surface palette.
  readonly colors: AppColors;
  // footer contains the reversible navigation actions.
  readonly footer: ReactNode;
  // image is the compact visual explanation shown below the card title.
  readonly image: ReactNode;
  // onBodyLayout reports the card body's content offset for measured field scrolling.
  readonly onBodyLayout: (event: LayoutChangeEvent) => void;
  // scrollRef lets the flow reveal focused inputs above the keyboard.
  readonly scrollRef: Ref<ScrollView>;
  // styles provides the active theme's quest-card style contract.
  readonly styles: CreateSeriesFlowStyles;
  // title is the single question or goal of the card.
  readonly title: string;
};

// SeriesSetupStepCard keeps card hierarchy, scrolling, and actions consistent across steps.
export function SeriesSetupStepCard({
  body,
  colors,
  footer,
  image,
  onBodyLayout,
  scrollRef,
  styles,
  title,
}: SeriesSetupStepCardProps): ReactElement {
  return (
    <BubbleSurface colors={colors} style={styles.card} variant="card">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={styles.cardContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="always"
        overScrollMode="never"
        ref={scrollRef}
        style={styles.cardScroll}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        {image}
        <View onLayout={onBodyLayout} style={styles.cardBody}>
          {body}
        </View>
      </ScrollView>
      <View style={styles.cardFooter}>{footer}</View>
    </BubbleSurface>
  );
}
