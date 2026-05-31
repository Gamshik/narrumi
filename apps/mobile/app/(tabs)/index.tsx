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
        styles={styles}
        onStartDailySession={() => router.push('/daily-session')}
      />
    </RouteScreen>
  );
}
