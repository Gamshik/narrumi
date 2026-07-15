import { tabBarLayout } from '@presentation/theme/tokens';

// getActiveIndicatorOffset returns the centered bubble position for one equal-width destination.
export function getActiveIndicatorOffset(
  barWidth: number,
  routeCount: number,
  activeIndex: number,
): number {
  if (barWidth <= 0 || routeCount <= 0) {
    return 0;
  }

  // safeIndex prevents stale navigation state from moving the bubble outside the toy shell.
  const safeIndex: number = Math.min(
    Math.max(activeIndex, 0),
    routeCount - 1,
  );
  // itemWidth keeps the bubble centered as phones and tablets resize the floating dock.
  const itemWidth: number = barWidth / routeCount;

  return (
    itemWidth * safeIndex +
    (itemWidth - tabBarLayout.activeIconSize) / 2
  );
}
