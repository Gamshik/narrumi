import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { RouteScreen } from '@presentation/app/shared';
import { useAppStyles } from '@presentation/app/useAppStyles';
import { AuthenticationScreen } from '../AuthenticationScreen';
import { useAuthSession } from '../AuthProvider';

// AuthGateProps defines the protected application route tree.
type AuthGateProps = {
  // children are rendered only while an authenticated session is active.
  readonly children: ReactNode;
};

// AuthGate blocks protected routes until session restoration completes.
export function AuthGate({ children }: AuthGateProps): ReactElement {
  const { isRestoring, session } = useAuthSession();
  const { isDark, styles } = useAppStyles();

  if (isRestoring) {
    return (
      <RouteScreen isDark={isDark} styles={styles}>
        <View style={styles.stateMessage}>
          <ActivityIndicator />
          <Text style={styles.stateMessageTitle}>Restoring account...</Text>
        </View>
      </RouteScreen>
    );
  }

  if (!session) {
    return <AuthenticationScreen />;
  }

  return <>{children}</>;
}
