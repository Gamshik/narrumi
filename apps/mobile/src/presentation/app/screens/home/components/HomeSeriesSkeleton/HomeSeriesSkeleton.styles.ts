import { StyleSheet, type ViewStyle } from 'react-native';

import { radii } from '@presentation/theme';

// HomeSeriesSkeletonStyleName enumerates every placeholder geometry slot.
type HomeSeriesSkeletonStyleName =
  | 'action'
  | 'actionButton'
  | 'card'
  | 'cardFooter'
  | 'cardMeta'
  | 'cardProgress'
  | 'cardTitle'
  | 'copy'
  | 'list'
  | 'root'
  | 'subtitle'
  | 'title';

// HomeSeriesSkeletonStyles keeps every named skeleton rule constrained to view geometry.
type HomeSeriesSkeletonStyles = Readonly<
  Record<HomeSeriesSkeletonStyleName, ViewStyle>
>;

// styles define the stable geometry that mirrors the compact Home action and series rows.
export const styles: HomeSeriesSkeletonStyles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 72,
  },
  actionButton: {
    borderRadius: radii.pill,
    height: 36,
    width: 96,
  },
  card: {
    gap: 10,
    height: 88,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cardMeta: {
    borderRadius: radii.pill,
    height: 18,
    width: 76,
  },
  cardProgress: {
    borderRadius: radii.pill,
    height: 10,
    width: 112,
  },
  cardTitle: {
    borderRadius: radii.sm,
    height: 18,
    width: '58%',
  },
  copy: {
    flex: 1,
    gap: 9,
  },
  list: {
    gap: 10,
  },
  root: {
    gap: 22,
  },
  subtitle: {
    borderRadius: radii.sm,
    height: 11,
    width: '64%',
  },
  title: {
    borderRadius: radii.sm,
    height: 18,
    width: '44%',
  },
});
