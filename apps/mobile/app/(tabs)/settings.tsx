import type { ReactElement } from 'react';

import { 
  GuardedBootstrapSurface,
  RouteScreen,
  SettingsScreen,
  SettingsSkeleton,
  canRenderGuardedSurfaces,
  useAppStyles,
  useBootstrapSession,
} from '@presentation/app';

// Route contract: renders settings inside the shared safe-area shell.
export default function SettingsRoute(): ReactElement {
  const { isDark, styles } = useAppStyles();
  const { state, retry } = useBootstrapSession();

  if (state.kind === 'hydrating') {
    return (
      <RouteScreen isDark={isDark} styles={styles}>
        <SettingsSkeleton isDark={isDark} styles={styles} />
      </RouteScreen>
    );
  }

  if (!canRenderGuardedSurfaces(state)) {
    return <GuardedBootstrapSurface onRetry={retry} state={state} />;
  }

  return (
    <RouteScreen isDark={isDark} isEdgeToEdge styles={styles}>
      <SettingsScreen isDark={isDark} styles={styles} />
    </RouteScreen>
  );
}
