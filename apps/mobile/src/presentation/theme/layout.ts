import { tabBarLayout } from './tokens';

// FloatingTabBarInsets is the tiny safe-area contract accepted by layout helpers.
export type FloatingTabBarInsets = {
  // bottom is the device safe-area inset below the app content.
  readonly bottom: number;
};

// FloatingTabBarInsetInput allows callers to pass either a bottom value or inset object.
export type FloatingTabBarInsetInput = number | FloatingTabBarInsets;

// FloatingTabBarMetrics is the reusable spacing result for floating navigation.
export type FloatingTabBarMetrics = {
  // bottomOffset is the absolute-position bottom value for the floating capsule.
  readonly bottomOffset: number;
  // tabBarHeight is the shared visual capsule height.
  readonly tabBarHeight: number;
  // contentPaddingBottom keeps final scroll content clear of the floating capsule.
  readonly contentPaddingBottom: number;
};

// getBottomInset normalizes safe-area input while keeping the public helper pure.
function getBottomInset(inset: FloatingTabBarInsetInput): number {
  return typeof inset === 'number' ? inset : inset.bottom;
}

// floatingTabBarMetrics derives safe-area-aware tab placement and scroll padding.
export function floatingTabBarMetrics(
  inset: FloatingTabBarInsetInput,
): FloatingTabBarMetrics {
  // effectiveBottomInset prevents zero-inset devices from pinning the capsule too low.
  const effectiveBottomInset: number = Math.max(
    getBottomInset(inset),
    tabBarLayout.minimumBottomInset,
  );
  // bottomOffset mirrors the floating tab bar's absolute bottom positioning rule.
  const bottomOffset: number = effectiveBottomInset + tabBarLayout.bottomGap;
  // contentPaddingBottom keeps scroll endings visible above the capsule and gap.
  const contentPaddingBottom: number =
    bottomOffset + tabBarLayout.height + tabBarLayout.contentGap;

  return {
    bottomOffset,
    tabBarHeight: tabBarLayout.height,
    contentPaddingBottom,
  };
}

// getFloatingTabBarContentPadding returns only the scroll padding for screen styles.
export function getFloatingTabBarContentPadding(
  inset: FloatingTabBarInsetInput,
): number {
  return floatingTabBarMetrics(inset).contentPaddingBottom;
}
