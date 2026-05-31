import { ScrollView, Text, View } from 'react-native';

import { RouteScreen, useAppStyles } from '@presentation/app';

export default function AudioRoute() {
  const { isDark, styles } = useAppStyles();

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.homeHeader}>
          <Text style={styles.largeTitle}>Audio</Text>
        </View>
        <View style={styles.settingsCard}>
          <Text style={styles.actionTitle}>Story Playback</Text>
          <Text style={styles.secondaryText}>
            Audio playback will be available after story generation is connected.
          </Text>
        </View>
      </ScrollView>
    </RouteScreen>
  );
}
