import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { RouteScreen, SeriesDetailsScreen, useAppStyles } from '@presentation/app';

// SeriesDetailsRoute renders one local story with saved episode history.
export default function SeriesDetailsRoute(): ReactElement {
  const router = useRouter();
  const { seriesId } = useLocalSearchParams<{ readonly seriesId?: string }>();
  const { isDark, styles } = useAppStyles();
  // normalizedSeriesId protects the screen from array params on web deep links.
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId : '';

  return (
    <RouteScreen isDark={isDark} isEdgeToEdge styles={styles}>
      <SeriesDetailsScreen
        seriesId={normalizedSeriesId}
        styles={styles}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.dismissTo('/');
          }
        }}
        onOpenEpisode={(episodeOrderIndex) =>
          router.push({
            pathname: '/episode-reader',
            params: {
              episodeOrderIndex: String(episodeOrderIndex),
              readOnly: 'true',
              seriesId: normalizedSeriesId,
            },
          })
        }
        onContinueEpisode={(episodeOrderIndex) =>
          router.push({
            pathname: '/episode-reader',
            params: {
              episodeOrderIndex: String(episodeOrderIndex),
              readOnly: 'false',
              seriesId: normalizedSeriesId,
            },
          })
        }
        onPrepareEpisode={(selectedSeriesId) =>
          router.push({
            pathname: '/daily-session',
            params: { seriesId: selectedSeriesId },
          })
        }
        onReadSeries={(selectedSeriesId) =>
          router.push({
            pathname: '/episode-reader',
            params: {
              readOnly: 'true',
              seriesId: selectedSeriesId,
            },
          })
        }
      />
    </RouteScreen>
  );
}
