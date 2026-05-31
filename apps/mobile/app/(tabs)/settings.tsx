import type { ReactElement } from 'react';

import { RouteScreen, SettingsScreen, useAppStyles } from '@presentation/app';

// Route contract: renders settings inside the shared safe-area shell.
export default function SettingsRoute(): ReactElement {
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <SettingsScreen isDark={isDark} styles={styles} />
    </RouteScreen>
  );
}
