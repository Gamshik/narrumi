import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { EpisodeReaderScreen, RouteScreen, useAppStyles } from '@presentation/app';

// EpisodeReaderRoute renders a locally persisted structured episode reader.
export default function EpisodeReaderRoute(): ReactElement {
  const router = useRouter();
  const { episodeOrderIndex, readOnly, seriesId } = useLocalSearchParams<{
    readonly episodeOrderIndex?: string;
    readonly readOnly?: string;
    readonly seriesId?: string;
  }>();
  const { isDark, styles } = useAppStyles();
  // normalizedEpisodeOrderIndex validates the visible episode number from routing.
  const parsedEpisodeOrderIndex =
    typeof episodeOrderIndex === 'string' ? Number(episodeOrderIndex) : NaN;
  const normalizedEpisodeOrderIndex =
    Number.isInteger(parsedEpisodeOrderIndex) && parsedEpisodeOrderIndex > 0
      ? parsedEpisodeOrderIndex
      : undefined;
  // normalizedSeriesId identifies the owner for full reading and exit navigation.
  const normalizedSeriesId =
    typeof seriesId === 'string' ? seriesId : undefined;
  // isReadOnly prevents completed history from resubmitting story choices.
  const isReadOnly = readOnly === 'true';

  return (
    <RouteScreen isDark={isDark} isEdgeToEdge styles={styles}>
      <EpisodeReaderScreen
        {...(normalizedEpisodeOrderIndex
          ? { episodeOrderIndex: normalizedEpisodeOrderIndex }
          : {})}
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
