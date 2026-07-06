import type { ReactElement } from 'react';

import { 
  GuardedBootstrapSurface,
  RouteScreen,
  SettingsScreen,
  canRenderGuardedSurfaces,
  useAppStyles,
  useBootstrapSession,
} from '@presentation/app';

// Route contract: renders settings inside the shared safe-area shell.
export default function SettingsRoute(): ReactElement {
  const { isDark, styles } = useAppStyles();
  const { state, retry } = useBootstrapSession();

  if (!canRenderGuardedSurfaces(state)) {
    return <GuardedBootstrapSurface onRetry={retry} state={state} />;
  }

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <SettingsScreen isDark={isDark} styles={styles} />
    </RouteScreen>
  );
}
