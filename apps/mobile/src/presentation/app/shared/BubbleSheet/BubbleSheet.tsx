import { useCallback, useEffect, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
  Pressable,
  type PanResponderInstance,
  type PanResponderGestureState,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  spacing,
  type AppColors,
} from '@presentation/theme';

// rubberBandDragDistance controls the resistance curve for upward over-pull.
const rubberBandDragDistance = 140;
// dismissDragDistance is the downward pull distance that closes a collapsed drawer.
const dismissDragDistance = 140;
// dismissVelocity is the downward fling velocity that closes a collapsed drawer.
const dismissVelocity = 1.2;
// maximumOverPull is the largest temporary upward rubber-band offset.
const maximumOverPull = 34;
// minimumSheetDragDistance is the vertical movement required before the sheet owns a gesture.
const minimumSheetDragDistance = 8;
// BubbleSheetProps is the public frame contract for bottom-sheet presentation.
export type BubbleSheetProps = {
  // children is caller-owned sheet content; this component renders chrome only.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // title optionally labels the sheet frame for visible and accessible context.
  readonly title?: string;
  // onClose optionally renders a close affordance without owning modal state.
  readonly onClose?: () => void;
  // closeAccessibilityLabel describes the close control for assistive tech.
  readonly closeAccessibilityLabel?: string;
  // showScrim controls whether the frame includes a dimmed modal backdrop.
  readonly showScrim?: boolean;
  // isNativeSheet strips the full-screen absolute positioning when rendering inside a native formSheet.
  readonly isNativeSheet?: boolean;
  // isDragEnabled allows modal drawers to rubber-band while preserving their resting size.
  readonly isDragEnabled?: boolean;
  // style positions the outer sheet wrapper within a caller-owned modal route.
  readonly style?: StyleProp<ViewStyle>;
  // contentStyle lets callers tune spacing inside the reusable sheet surface.
  readonly contentStyle?: StyleProp<ViewStyle>;
};

// BubbleSheet renders a reusable Sorbet bottom-sheet frame and optional scrim.
export function BubbleSheet({
  children,
  closeAccessibilityLabel = 'Close sheet',
  colors,
  contentStyle,
  onClose,
  showScrim = true,
  isNativeSheet = false,
  isDragEnabled = true,
  style,
  title,
}: BubbleSheetProps): ReactElement {
  // progress drives sheet entrance and backdrop opacity independently from navigation.
  const [progress] = useState(() => new Animated.Value(isNativeSheet ? 1 : 0));
  // dragOffset stores only the visible downward overscroll during a pull gesture.
  const [dragOffset] = useState(() => new Animated.Value(0));
  // overPullOffset stores the temporary upward rubber-band motion.
  const [overPullOffset] = useState(() => new Animated.Value(0));
  // dragIsAvailable enables gestures only for custom modal drawers with a close target.
  const dragIsAvailable: boolean = !isNativeSheet && isDragEnabled && Boolean(onClose);

  // titleStyle resolves text color from the active theme instead of static colors.
  const titleStyle: TextStyle = { color: colors.labelPrimary };
  // sheetStyle resolves the glass-like sheet fill and edge from theme tokens.
  const sheetStyle: ViewStyle = {
    backgroundColor: isNativeSheet ? colors.backgroundSecondary : colors.sheetSurface,
    borderColor: colors.sheetBorder,
  };
  // entranceStyle applies native-driven entrance, drag, and upward rubber-band movement.
  const entranceStyle: Animated.WithAnimatedObject<ViewStyle> = {
    transform: [
      {
        translateY: Animated.add(
          progress.interpolate({
            inputRange: [0, 1],
            outputRange: [84, 0],
          }),
          dragOffset,
        ),
      },
    ],
  };
  // overPullStyle is JS-driven so it can share the same value with the filler height.
  const overPullStyle: Animated.WithAnimatedObject<ViewStyle> = {
    transform: [{ translateY: Animated.multiply(overPullOffset, -1) }],
  };
  // bottomFillStyle covers the temporary gap under an upward rubber-band.
  const bottomFillStyle: Animated.WithAnimatedObject<ViewStyle> = {
    height: overPullOffset,
  };
  // scrimOpacity fades the backdrop in place instead of sliding it with the drawer.
  const scrimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  useEffect(() => {
    if (isNativeSheet) {
      return undefined;
    }

    // Defer the entrance until after the first paint so text/layout are committed
    // before the drawer starts moving.
    const frameId = requestAnimationFrame(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isNativeSheet, progress]);

  const closeWithAnimation = useCallback((): void => {
    if (!onClose) {
      return;
    }

    if (isNativeSheet) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(progress, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(dragOffset, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
        toValue: 84,
        useNativeDriver: true,
      }),
      Animated.timing(overPullOffset, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [dragOffset, isNativeSheet, onClose, overPullOffset, progress]);

  // shouldClaimSheetDrag matches vertical drawer intent while preserving normal button taps.
  const shouldClaimSheetDrag = useCallback((
    gestureState: PanResponderGestureState,
  ): boolean => (
    Math.abs(gestureState.dy) > minimumSheetDragDistance &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
  ), []);

  // panResponder owns only sheet detent gestures; content remains caller-owned.
  const [panResponder, setPanResponder] = useState<PanResponderInstance>();

  useEffect(() => {
    if (!dragIsAvailable) {
      setPanResponder(undefined);
      return undefined;
    }

    setPanResponder(PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        shouldClaimSheetDrag(gestureState),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        shouldClaimSheetDrag(gestureState),
      onPanResponderGrant: () => {
        dragOffset.setValue(0);
        overPullOffset.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          const pullDistance = Math.abs(gestureState.dy);
          const resistedStretch =
            1 - 1 / (1 + pullDistance / rubberBandDragDistance);

          overPullOffset.setValue(
            clamp(resistedStretch * maximumOverPull * 2, 0, maximumOverPull),
          );
          dragOffset.setValue(0);
          return;
        }

        overPullOffset.setValue(0);
        dragOffset.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          gestureState.dy > dismissDragDistance || gestureState.vy > dismissVelocity;

        if (shouldClose) {
          closeWithAnimation();
          return;
        }

        Animated.parallel([
          Animated.spring(dragOffset, {
            toValue: 0,
            speed: 28,
            bounciness: 4,
            useNativeDriver: true,
          }),
          Animated.spring(overPullOffset, {
            toValue: 0,
            speed: 28,
            bounciness: 4,
            useNativeDriver: false,
          }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(dragOffset, {
            toValue: 0,
            speed: 28,
            bounciness: 4,
            useNativeDriver: true,
          }),
          Animated.spring(overPullOffset, {
            toValue: 0,
            speed: 28,
            bounciness: 4,
            useNativeDriver: false,
          }),
        ]).start();
      },
    }));

    return undefined;
  }, [
    closeWithAnimation,
    dragIsAvailable,
    dragOffset,
    overPullOffset,
    shouldClaimSheetDrag,
  ]);

  // handlePanHandlers exposes drag responders only when the modal drawer can move.
  const handlePanHandlers = panResponder?.panHandlers;
  const content = (
    <Animated.View style={[
      !isNativeSheet && entranceStyle,
      isNativeSheet && style,
    ]} {...handlePanHandlers}>
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          !isNativeSheet && overPullStyle,
          isNativeSheet && styles.nativeSheet,
          isNativeSheet && style,
        ]}
      >
        {!isNativeSheet && (
          <View
            style={styles.handleDragArea}
          >
            <View
              style={[styles.handle, { backgroundColor: colors.labelTertiary }]}
            />
          </View>
        )}
        {title ? (
          <View style={styles.header}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
          </View>
        ) : null}
        <View style={[styles.content, contentStyle, isNativeSheet && { paddingBottom: 0 }]}>{children}</View>
      </Animated.View>
    </Animated.View>
  );

  if (isNativeSheet) {
    return content;
  }

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      {showScrim ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.scrim, { opacity: scrimOpacity }]}
        >
          <Pressable
            style={[styles.scrim, { backgroundColor: colors.sheetScrim }]}
            onPress={closeWithAnimation}
            accessibilityLabel={closeAccessibilityLabel}
            accessibilityRole="button"
          />
        </Animated.View>
      ) : null}
      {content}
      <Animated.View
        pointerEvents="none"
        style={[styles.bottomFill, sheetStyle, bottomFillStyle]}
      />
    </View>
  );
}

// clamp keeps gesture-derived sheet detents inside the supported native-like range.
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// styles define stable sheet chrome while callers own content layout and state.
const styles = StyleSheet.create({
  root: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.soft,
  },
  bottomFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  nativeSheet: {
    shadowOpacity: 0,
    elevation: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 0,
  },
  handleDragArea: {
    alignSelf: 'center',
    alignItems: 'center',
    height: 24,
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
    width: 96,
  },
  handle: {
    borderRadius: radii.pill,
    height: 5,
    opacity: 0.45,
    width: 36,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: 21,
    lineHeight: 28,
  },
  content: {
    paddingBottom: spacing.xl,
  },
});
