import type { ReactElement } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DailySessionScreen, RouteScreen, useAppStyles } from '@presentation/app';

// DailySessionRoute renders the local-first Story Words and genre flow.
export default function DailySessionRoute(): ReactElement {
  const router = useRouter();
  const { seriesId } = useLocalSearchParams<{ readonly seriesId?: string }>();
  const { isDark, styles } = useAppStyles();
  // normalizedSeriesId protects the screen from array params on web deep links.
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId : undefined;

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <DailySessionScreen
        {...(normalizedSeriesId ? { seriesId: normalizedSeriesId } : {})}
        styles={styles}
        onExit={() => {
          if (router.canGoBack()) {
            router.back();
          } else if (normalizedSeriesId) {
            router.dismissTo({
              pathname: '/series-details',
              params: { seriesId: normalizedSeriesId },
            });
          } else {
            router.dismissTo('/');
          }
        }}
      />
    </RouteScreen>
  );
}
