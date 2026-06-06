import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { EpisodeReaderScreen, RouteScreen, useAppStyles } from '@presentation/app';

// EpisodeReaderRoute renders a locally persisted structured episode reader.
export default function EpisodeReaderRoute(): ReactElement {
  const router = useRouter();
  const { episodeId, readOnly, seriesId } = useLocalSearchParams<{
    readonly episodeId?: string;
    readonly readOnly?: string;
    readonly seriesId?: string;
  }>();
  const { isDark, styles } = useAppStyles();
  // normalizedEpisodeId protects the screen from array params on web deep links.
  const normalizedEpisodeId =
    typeof episodeId === 'string' ? episodeId : undefined;
  // normalizedSeriesId lets history exit return to the owning series screen.
  const normalizedSeriesId =
    typeof seriesId === 'string' ? seriesId : undefined;
  // isReadOnly prevents completed history from resubmitting story choices.
  const isReadOnly = readOnly === 'true';

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <EpisodeReaderScreen
        {...(normalizedEpisodeId ? { episodeId: normalizedEpisodeId } : {})}
        {...(normalizedSeriesId ? { seriesId: normalizedSeriesId } : {})}
        isReadOnly={isReadOnly}
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
