import type { ReactElement } from 'react';
import { useRouter } from 'expo-router';

import type { LocalSeriesSetupDraft, Series } from '@domain/index';
import { HomeScreen, RouteScreen, useAppStyles } from '@presentation/app';

// Route contract: renders the home dashboard without direct dictionary shortcuts.
export default function HomeRoute(): ReactElement {
  const router = useRouter();
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} isEdgeToEdge styles={styles}>
      <HomeScreen
        onOpenSeries={(seriesId: string): void =>
          router.push({ pathname: '/series-details', params: { seriesId } })
        }
        onRequestDeleteDraft={(draft: LocalSeriesSetupDraft): void =>
          router.push({
            pathname: '/delete-draft-confirmation',
            params: {
              draftId: draft.draftId,
              title: draft.title.trim() || 'Untitled series',
            },
          })
        }
        onRequestDeleteSeries={(series: Series): void =>
          router.push({
            pathname: '/delete-series-confirmation',
            params: { seriesId: series.id, title: series.title },
          })
        }
        styles={styles}
      />
    </RouteScreen>
  );
}
