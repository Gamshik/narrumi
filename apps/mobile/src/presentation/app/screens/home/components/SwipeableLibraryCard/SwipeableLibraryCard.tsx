import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  Pressable,
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

import type { AppColors } from '@presentation/theme';

import { SwipeDeleteAction } from '../SwipeableSeriesCard/SeriesDeleteAction';
import { styles } from './SwipeableLibraryCard.styles';
import {
  swipeDeleteActionWidth,
  swipeDeleteActivationDistance,
  swipeDeleteOpenThreshold,
} from './swipeDeleteMotion';

// SwipeableLibraryItemKind identifies copy for the two Home collection row types.
export type SwipeableLibraryItemKind = 'draft' | 'series';

// SwipeableLibraryCardProps describes shared navigation and deletion behavior around row content.
type SwipeableLibraryCardProps = {
  // accessibilityLabel summarizes caller-owned row content for assistive technology.
  readonly accessibilityLabel: string;
  // children is the opaque caller-owned card surface moved by the native swipe gesture.
  readonly children: ReactNode;
  // colors supplies semantic Sorbet tokens for the destructive action and shell.
  readonly colors: AppColors;
  // hasOpenSwipe reports whether any Home row currently owns the delete lane.
  readonly hasOpenSwipe: boolean;
  // isDisabled blocks navigation and deletion while a caller-owned operation is pending.
  readonly isDisabled?: boolean;
  // isOpen controls whether this row owns the shared reveal position.
  readonly isOpen: boolean;
  // itemKind supplies precise series-or-draft accessibility copy.
  readonly itemKind: SwipeableLibraryItemKind;
  // label identifies the destructive target inside the revealed action.
  readonly label: string;
  // onOpen activates the row after ordinary taps.
  readonly onOpen: () => void;
  // onOpenChange coordinates single-open-row ownership in Home.
  readonly onOpenChange: (isOpen: boolean) => void;
  // onRequestDelete opens confirmation and receives a callback that closes this lane.
  readonly onRequestDelete: (onCancel: () => void) => void;
};

// swipeSpringOptions keeps both row types quick, clamped, and accessibility-aware.
const swipeSpringOptions: Record<string, unknown> = {
  damping: 26,
  mass: 0.82,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
  stiffness: 280,
};

// SwipeableLibraryCard gives series and drafts one native swipe-to-delete contract.
export function SwipeableLibraryCard({
  accessibilityLabel,
  children,
  colors,
  hasOpenSwipe,
  isDisabled = false,
  isOpen,
  itemKind,
  label,
  onOpen,
  onOpenChange,
  onRequestDelete,
}: SwipeableLibraryCardProps): ReactElement {
  // swipeableRef provides imperative close behavior for tab, scroll, and confirmation changes.
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  // closeCard synchronizes native motion with Home's single-open-row state.
  const closeCard = useCallback((): void => {
    swipeableRef.current?.close();
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect((): void => {
    if (!isOpen) {
      swipeableRef.current?.close();
    }
  }, [isOpen]);

  // requestDelete keeps every destructive action behind its confirmation route.
  const requestDelete = useCallback((): void => {
    onRequestDelete(closeCard);
  }, [closeCard, onRequestDelete]);

  // pressCard closes an exposed lane before any row can navigate.
  const pressCard = (): void => {
    if (hasOpenSwipe || isOpen) {
      closeCard();
      return;
    }

    onOpen();
  };

  // handleAccessibilityAction exposes activation and deletion without requiring a gesture.
  const handleAccessibilityAction = (
    // event names the custom action selected by assistive technology.
    event: AccessibilityActionEvent,
  ): void => {
    if (event.nativeEvent.actionName === 'delete') {
      requestDelete();
      return;
    }

    if (event.nativeEvent.actionName === 'activate') {
      onOpen();
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
        animationOptions={swipeSpringOptions}
        childrenContainerStyle={styles.cardMotion}
        containerStyle={styles.swipeContainer}
        dragOffsetFromRightEdge={swipeDeleteActivationDistance}
        enabled={!isDisabled}
        friction={1}
        overshootRight={false}
        ref={swipeableRef}
        rightThreshold={swipeDeleteOpenThreshold}
        onSwipeableClose={(): void => onOpenChange(false)}
        onSwipeableOpen={(): void => onOpenChange(true)}
        onSwipeableOpenStartDrag={(): void => onOpenChange(true)}
        renderRightActions={(
          // progress is the native reveal value shared with the delete affordance worklet.
          progress: SharedValue<number>,
        ): ReactElement => (
          <SwipeDeleteAction
            colors={colors}
            disabled={isDisabled}
            itemKind={itemKind}
            label={label}
            progress={progress}
            width={swipeDeleteActionWidth}
            onPress={requestDelete}
          />
        )}
      >
        <Pressable
          accessibilityActions={[
            { name: 'activate', label: `Open ${itemKind}` },
            { name: 'delete', label: `Delete ${itemKind}` },
          ]}
          accessibilityHint={`Opens the ${itemKind}. Swipe left for delete options.`}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          disabled={isDisabled}
          onAccessibilityAction={handleAccessibilityAction}
          onPress={pressCard}
          style={(
            // state provides geometry-safe feedback without scaling the swipe foreground.
            state: PressableStateCallbackType,
          ): StyleProp<ViewStyle> => [
            styles.cardPressable,
            state.pressed && styles.cardPressablePressed,
          ]}
        >
          {children}
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}
