import { useRouter } from 'expo-router';

import { DictionaryScreen, RouteScreen, useAppStyles } from '@presentation/app';

export default function DictionaryRoute() {
  const router = useRouter();
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <DictionaryScreen
        styles={styles}
        onSelectWord={(word) =>
          router.push({
            pathname: '/dictionary-word-details',
            params: { id: word.id },
          })
        }
      />
    </RouteScreen>
  );
}
