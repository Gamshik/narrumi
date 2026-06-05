import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { AppStyles } from '../types';

// HomeScreenProps carries the shared themed style sheet into the home dashboard.
type HomeScreenProps = {
  // styles is the app-level StyleSheet contract generated from current theme colors.
  readonly styles: AppStyles;
  // onStartDailySession opens the local Story Words flow until route names are migrated.
  readonly onStartDailySession: () => void;
};

// ActionRowProps describes one home action without implying implemented navigation.
type ActionRowProps = {
  // accent selects the approved design-system color for the action icon.
  readonly accent: 'blue' | 'orange' | 'purple';
  // icon is the compact glyph text shown before the action title.
  readonly icon: string;
  // styles is the shared themed style sheet used by presentation components.
  readonly styles: AppStyles;
  // subtitle explains current availability without fake progress data.
  readonly subtitle: string;
  // title is the visible action label.
  readonly title: string;
  // onPress is optional because several MVP actions are placeholders only.
  readonly onPress?: () => void;
};

// HomeScreen renders the main dashboard shell without mock counters or dictionary shortcuts.
export function HomeScreen({
  styles,
  onStartDailySession,
}: HomeScreenProps): ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <HomeHeader styles={styles} />
      <GoalCard styles={styles} />
      <PracticeActions
        styles={styles}
        onStartDailySession={onStartDailySession}
      />
    </ScrollView>
  );
}

// HomeHeader owns the app title and avatar placement on the home screen.
function HomeHeader({
  styles,
}: Pick<HomeScreenProps, 'styles'>): ReactElement {
  return (
    <View style={styles.homeHeader}>
      <Text style={styles.largeTitle}>Context-English</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>LE</Text>
      </View>
    </View>
  );
}

// GoalCard reserves the series area until the full personal series flow is connected.
function GoalCard({ styles }: Pick<HomeScreenProps, 'styles'>): ReactElement {
  return (
    <View style={styles.goalCard}>
      <View style={styles.flex}>
        <Text style={styles.actionTitle}>Personal Series</Text>
        <Text style={styles.secondaryText}>
          Continue a story, choose Story Words, and generate episodes when the
          backend is connected.
        </Text>
      </View>
    </View>
  );
}

// PracticeActions shows product entry points without fabricated user state.
function PracticeActions({
  styles,
  onStartDailySession,
}: HomeScreenProps): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>SERIES FLOW</Text>
      <View style={styles.actionList}>
        <ActionRow
          accent="blue"
          icon="Aa"
          subtitle="Choose words that should appear in the next episode."
          styles={styles}
          title="Story Words"
          onPress={onStartDailySession}
        />
        <ActionRow
          accent="purple"
          icon="S"
          subtitle="Series creation is the next local-first implementation step."
          styles={styles}
          title="My Series"
        />
        <ActionRow
          accent="orange"
          icon="E"
          subtitle="AI generation stays gated behind online Edge Functions."
          styles={styles}
          title="Episodes"
        />
      </View>
    </>
  );
}

// ActionRow renders a single dashboard action row with optional interaction.
function ActionRow({
  accent,
  icon,
  styles,
  subtitle,
  title,
  onPress,
}: ActionRowProps): ReactElement {
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
