import type { ReactElement } from 'react';
import { useRouter } from 'expo-router';

import { HomeScreen, RouteScreen, useAppStyles } from '@presentation/app';

// Route contract: renders the home dashboard without direct dictionary shortcuts.
export default function HomeRoute(): ReactElement {
  const router = useRouter();
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <HomeScreen
        onOpenSeries={(seriesId) =>
          router.push({ pathname: '/series-details', params: { seriesId } })
        }
        onRequestDeleteSeries={(series) =>
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
