import { RouteScreen, SettingsScreen, useAppStyles } from '@presentation/app';

export default function SettingsRoute() {
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <SettingsScreen isDark={isDark} styles={styles} />
    </RouteScreen>
  );
}
