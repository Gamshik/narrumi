import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { DictionaryScreen, RouteScreen, useAppStyles } from '@presentation/app';

// Route contract: bridges dictionary row selection to the native details sheet route.
export default function DictionaryRoute(): ReactElement {
  const router = useRouter();
  const { isDark, colors, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <DictionaryScreen
        colors={colors}
        isDark={isDark}
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
