import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { JellyPressable } from '../../../../../../shared';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import {
  seriesSetupSteps,
  type SeriesSetupMemoryItem,
  type SeriesSetupStep,
} from '../../seriesSetupFlow';

// SeriesSetupOverviewProps combines navigation progress and earlier answers in one surface.
type SeriesSetupOverviewProps = {
  // activeIndex identifies the focused card and visible progress count.
  readonly activeIndex: number;
  // furthestIndex bounds direct navigation to deliberately visited cards.
  readonly furthestIndex: number;
  // items contains compact editable answers from earlier cards.
  readonly items: readonly SeriesSetupMemoryItem[];
  // styles provides the unified setup-strip geometry and palette.
  readonly styles: CreateSeriesFlowStyles;
  // onSelect reopens one visited card without clearing later answers.
  readonly onSelect: (step: SeriesSetupStep) => void;
};

// SeriesSetupOverview renders one concise setup path with contextual edit shortcuts.
export function SeriesSetupOverview({
  activeIndex,
  furthestIndex,
  items,
  styles,
  onSelect,
}: SeriesSetupOverviewProps): ReactElement {
  return (
    <View
      style={[
        styles.setupOverview,
        items.length === 0 && styles.setupOverviewEmpty,
      ]}
    >
      <View style={styles.setupOverviewTop}>
        <Text style={styles.progressTitle}>SERIES SETUP</Text>
        <View style={styles.progressPath}>
          {seriesSetupSteps.map(
            (step: SeriesSetupStep, index: number): ReactElement => {
              // isReached lets completed and active nodes reopen their card.
              const isReached: boolean = index <= furthestIndex;
              // isActive gives the focused node the strongest Sorbet depth.
              const isActive: boolean = index === activeIndex;
              // isComplete keeps visited nodes recognizable while revisiting an earlier card.
              const isComplete: boolean = isReached && !isActive;
              // isLast removes the connector after the final node.
              const isLast: boolean = index === seriesSetupSteps.length - 1;

              return (
                <View
                  key={step}
                  style={[
                    styles.progressItem,
                    isLast && styles.progressItemLast,
                  ]}
                >
                  <JellyPressable
                    accessibilityLabel={`Open setup step ${index + 1}`}
                    disabled={!isReached}
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
                        {isComplete ? '✓' : index + 1}
                      </Text>
                    </View>
                  </JellyPressable>
                  {!isLast ? (
                    <View
                      style={[
                        styles.progressConnector,
                        index < furthestIndex &&
                          styles.progressConnectorReached,
                      ]}
                    />
                  ) : null}
                </View>
              );
            },
          )}
        </View>
        <Text style={styles.progressCount}>
          {activeIndex + 1}/{seriesSetupSteps.length}
        </Text>
      </View>

      {items.length > 0 ? (
        <View style={styles.setupOverviewMemory}>
          <ScrollView
            contentContainerStyle={styles.memoryRow}
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
          >
            {items.map((item: SeriesSetupMemoryItem) => (
              <JellyPressable
                accessibilityHint={`Returns to the ${item.label} card`}
                accessibilityLabel={`${item.label}: ${item.value}`}
                accessibilityRole="button"
                key={item.step}
                onPress={(): void => onSelect(item.step)}
                style={styles.memoryChip}
              >
                <Text style={styles.memoryChipLabel}>{item.label}</Text>
                <Text numberOfLines={1} style={styles.memoryChipValue}>
                  · {item.value}
                </Text>
              </JellyPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
