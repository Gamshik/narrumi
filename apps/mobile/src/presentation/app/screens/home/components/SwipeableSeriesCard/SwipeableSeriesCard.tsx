import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import {
  Pressable,
  Text,
  View,
  type AccessibilityActionEvent,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ReduceMotion, type SharedValue } from 'react-native-reanimated';

import type { Series } from '@domain/index';
import {
  BubblePill,
  BubbleStatus,
  BubbleSurface,
} from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { SeriesDeleteAction } from './SeriesDeleteAction';
import { styles } from './SwipeableSeriesCard.styles';
import {
  seriesSwipeActionWidth,
  seriesSwipeActivationDistance,
  seriesSwipeOpenThreshold,
} from './seriesSwipeMotion';

// SwipeableSeriesCardProps describes one saved-series row and its controlled reveal state.
export type SwipeableSeriesCardProps = {
  // colors provides semantic light or dark Sorbet tokens.
  readonly colors: AppColors;
  // modeLabel is the compact product-facing label for learner participation.
  readonly modeLabel: string;
  // hasOpenSwipe reports whether any row in the list currently owns the action lane.
  readonly hasOpenSwipe: boolean;
  // isDeleting disables repeated destructive actions while persistence is running.
  readonly isDeleting: boolean;
  // isOpen controls whether this row owns the revealed snap point.
  readonly isOpen: boolean;
  // series supplies the visible saved-series metadata and stable identifier.
  readonly series: Series;
  // onOpenChange requests this row's controlled open or closed state.
  readonly onOpenChange: (isOpen: boolean) => void;
  // onOpenSeries navigates to the selected series after an ordinary card tap.
  readonly onOpenSeries: (seriesId: string) => void;
  // onRequestDelete opens the existing confirmation flow and receives a close callback.
  readonly onRequestDelete: (onCancel: () => void) => void;
};

// seriesSwipeSpringOptions keeps the native snap quick, clamped, and accessibility-aware.
const seriesSwipeSpringOptions: Record<string, unknown> = {
  damping: 26,
  mass: 0.82,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
  stiffness: 280,
};

// SwipeableSeriesCard renders one opaque row above a native, edge-aligned delete action.
export function SwipeableSeriesCard({
  colors,
  modeLabel,
  hasOpenSwipe,
  isDeleting,
  isOpen,
  series,
  onOpenChange,
  onOpenSeries,
  onRequestDelete,
}: SwipeableSeriesCardProps): ReactElement {
  // swipeableRef provides imperative close behavior for scroll and confirmation changes.
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  // closeCard synchronizes the native row and Home's single-open-row state.
  const closeCard = useCallback((): void => {
    swipeableRef.current?.close();
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect((): void => {
    if (!isOpen) {
      swipeableRef.current?.close();
    }
  }, [isOpen]);

  // requestDelete keeps the destructive action behind the existing confirmation route.
  const requestDelete = useCallback((): void => {
    onRequestDelete(closeCard);
  }, [closeCard, onRequestDelete]);

  // pressCard closes another exposed row first so a cleanup tap can never navigate.
  const pressCard = (): void => {
    if (hasOpenSwipe || isOpen) {
      closeCard();
      return;
    }

    onOpenSeries(series.id);
  };

  // handleAccessibilityAction exposes both row actions without requiring a gesture.
  const handleAccessibilityAction = (
    // event names the custom action selected by assistive technology.
    event: AccessibilityActionEvent,
  ): void => {
    if (event.nativeEvent.actionName === 'delete') {
      requestDelete();
      return;
    }

    if (event.nativeEvent.actionName === 'activate') {
      onOpenSeries(series.id);
    }
  };

  return (
    <View
      style={[
        styles.shadowShell,
        { backgroundColor: colors.bubbleSurfaceRaised },
      ]}
    >
      <ReanimatedSwipeable
        animationOptions={seriesSwipeSpringOptions}
        childrenContainerStyle={styles.cardMotion}
        containerStyle={styles.swipeContainer}
        dragOffsetFromRightEdge={seriesSwipeActivationDistance}
        enabled={!isDeleting}
        friction={1}
        overshootRight={false}
        ref={swipeableRef}
        rightThreshold={seriesSwipeOpenThreshold}
        onSwipeableClose={(): void => onOpenChange(false)}
        onSwipeableOpen={(): void => onOpenChange(true)}
        onSwipeableOpenStartDrag={(): void => onOpenChange(true)}
        renderRightActions={(
          // progress is the native reveal value shared with the delete affordance worklet.
          progress: SharedValue<number>,
        ): ReactElement => (
          <SeriesDeleteAction
            colors={colors}
            disabled={isDeleting}
            label={series.title}
            progress={progress}
            width={seriesSwipeActionWidth}
            onPress={requestDelete}
          />
        )}
      >
        <Pressable
          accessibilityActions={[
            { name: 'activate', label: 'Open series' },
            { name: 'delete', label: 'Delete series' },
          ]}
          accessibilityHint="Opens the series. Swipe left for delete options."
          accessibilityLabel={`${series.title}, ${modeLabel} series`}
          accessibilityRole="button"
          disabled={isDeleting}
          onAccessibilityAction={handleAccessibilityAction}
          onPress={pressCard}
          style={(
            // state provides geometry-safe tap feedback without scaling the swipe foreground.
            state: PressableStateCallbackType,
          ): StyleProp<ViewStyle> => [
            styles.cardPressable,
            state.pressed && styles.cardPressablePressed,
          ]}
        >
          <BubbleSurface
            colors={colors}
            style={[
              styles.cardSurface,
              { backgroundColor: colors.bubbleSurfaceRaised },
            ]}
            tone="neutral"
            variant="list"
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={[styles.title, { color: colors.labelPrimary }]}
                >
                  {series.title}
                </Text>
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={[styles.meta, { color: colors.labelSecondary }]}
                >
                  {modeLabel} · Personal series
                </Text>
              </View>
              <BubblePill colors={colors} style={styles.badge} tone="primary">
                <Text style={[styles.badgeText, { color: colors.systemBlue }]}>
                  SERIES
                </Text>
              </BubblePill>
            </View>
            {isDeleting ? (
              <View style={styles.deletingRow}>
                <BubbleStatus
                  colors={colors}
                  title="Deleting"
                  tone="loading"
                  variant="compact"
                />
              </View>
            ) : null}
          </BubbleSurface>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}
