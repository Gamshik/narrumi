import type { ReactElement } from 'react';

import { DailySessionScreen, RouteScreen, useAppStyles } from '@presentation/app';

// DailySessionRoute renders the local-first Story Words and genre flow.
export default function DailySessionRoute(): ReactElement {
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <DailySessionScreen styles={styles} />
    </RouteScreen>
  );
}
