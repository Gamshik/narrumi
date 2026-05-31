import { HomeScreen, RouteScreen, useAppStyles } from '@presentation/app';

export default function HomeRoute() {
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <HomeScreen styles={styles} />
    </RouteScreen>
  );
}
