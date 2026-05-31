import { Pressable, ScrollView, Text, View } from 'react-native';

import type { AppStyles } from '../types';

export function HomeScreen({ styles }: { readonly styles: AppStyles }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <HomeHeader styles={styles} />
      <GoalCard styles={styles} />
      <PracticeActions styles={styles} />
    </ScrollView>
  );
}

function HomeHeader({ styles }: { readonly styles: AppStyles }) {
  return (
    <View style={styles.homeHeader}>
      <Text style={styles.largeTitle}>Context-English</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>LE</Text>
      </View>
    </View>
  );
}

function GoalCard({ styles }: { readonly styles: AppStyles }) {
  return (
    <View style={styles.goalCard}>
      <View style={styles.flex}>
        <Text style={styles.actionTitle}>Today&apos;s Goal</Text>
        <Text style={styles.secondaryText}>
          Daily learning progress will appear after card practice is connected.
        </Text>
      </View>
    </View>
  );
}

function PracticeActions({
  styles,
}: {
  readonly styles: AppStyles;
}) {
  return (
    <>
      <Text style={styles.sectionLabel}>TODAY&apos;S PRACTICE</Text>
      <View style={styles.actionList}>
        <ActionRow
          accent="blue"
          icon="Aa"
          subtitle="Card practice will use the local vocabulary catalog."
          styles={styles}
          title="Study Cards"
        />
        <ActionRow
          accent="purple"
          icon="R"
          subtitle="Due words will appear after study progress is saved."
          styles={styles}
          title="Reviews"
        />
        <ActionRow
          accent="orange"
          icon="T"
          subtitle="Requires online story generation."
          styles={styles}
          title="Text of the Day"
        />
      </View>
    </>
  );
}

function ActionRow({
  accent,
  icon,
  styles,
  subtitle,
  title,
  onPress,
}: {
  readonly accent: 'blue' | 'orange' | 'purple';
  readonly icon: string;
  readonly styles: AppStyles;
  readonly subtitle: string;
  readonly title: string;
  readonly onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.actionIcon,
          accent === 'blue' && styles.blueIcon,
          accent === 'purple' && styles.purpleIcon,
          accent === 'orange' && styles.orangeIcon,
        ]}
      >
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.secondaryText}>{subtitle}</Text>
      </View>
      {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
    </Pressable>
  );
}
