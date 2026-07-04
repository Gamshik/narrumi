import type { ReactNode, ReactElement } from 'react';
import {
  StyleSheet,
  Text,
  View,
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

import { BubbleButton } from '../BubbleButton';

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
  style,
  title,
}: BubbleSheetProps): ReactElement {
  // titleStyle resolves text color from the active theme instead of static colors.
  const titleStyle: TextStyle = { color: colors.labelPrimary };
  // sheetStyle resolves the glass-like sheet fill and edge from theme tokens.
  const sheetStyle: ViewStyle = {
    backgroundColor: colors.sheetSurface,
    borderColor: colors.sheetBorder,
  };

  const content = (
    <View style={[styles.sheet, sheetStyle, isNativeSheet && styles.nativeSheet, isNativeSheet && style]}>
      <View
        style={[styles.handle, { backgroundColor: colors.labelTertiary }]}
      />
      {title || onClose ? (
        <View style={styles.header}>
          {title ? (
            <Text style={[styles.title, titleStyle]}>{title}</Text>
          ) : (
            <View />
          )}
          {onClose ? (
            <BubbleButton
              accessibilityLabel={closeAccessibilityLabel}
              colors={colors}
              hitSlop={12}
              onPress={onClose}
              variant="ghost"
              style={styles.closeButton}
              contentStyle={styles.closeButtonContent}
            >
              <Text style={[styles.closeButtonText, titleStyle]}>x</Text>
            </BubbleButton>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (isNativeSheet) {
    return content;
  }

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      {showScrim ? (
        <View
          pointerEvents="none"
          style={[styles.scrim, { backgroundColor: colors.sheetScrim }]}
        />
      ) : null}
      {content}
    </View>
  );
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
  nativeSheet: {
    shadowOpacity: 0,
    elevation: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 0,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    height: 5,
    marginBottom: spacing.md,
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
  closeButton: {
    alignSelf: 'flex-start',
    marginLeft: spacing.md,
  },
  closeButtonContent: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  },
  content: {
    paddingBottom: spacing.xl,
  },
});
