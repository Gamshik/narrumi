import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { useAppTheme } from '../theme';
import type { AppStyles } from '../types';

const settingsLevels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
type SettingsLevel = (typeof settingsLevels)[number];

export function SettingsScreen({
  isDark,
  styles,
}: {
  readonly isDark: boolean;
  readonly styles: AppStyles;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.largeTitle}>Settings</Text>
      </View>

      <GrammarControl isDark={isDark} styles={styles} />
      <Appearance styles={styles} />
      <CardGoals styles={styles} />
    </ScrollView>
  );
}

function Appearance({ styles }: { readonly styles: AppStyles }) {
  const { isDark, setDarkMode } = useAppTheme();

  return (
    <>
      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.flex}>
            <Text style={styles.actionTitle}>Dark Mode</Text>
            <Text style={styles.secondaryText}>
              Switch between the light and dark app themes.
            </Text>
          </View>
          <Switch onValueChange={setDarkMode} value={isDark} />
        </View>
      </View>
    </>
  );
}

function GrammarControl({
  isDark,
  styles,
}: {
  readonly isDark: boolean;
  readonly styles: AppStyles;
}) {
  const [level, setLevel] = useState<SettingsLevel>('B2');

  return (
    <>
      <Text style={styles.sectionLabel}>GRAMMAR CONTROL</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.actionTitle}>CEFR Target Level</Text>
            <Text style={styles.secondaryText}>
              Controls generated story grammar
            </Text>
          </View>
          <Text style={styles.settingValue}>{level}</Text>
        </View>
        <SegmentedControl
          appearance={isDark ? 'dark' : 'light'}
          onValueChange={(value) => setLevel(value as SettingsLevel)}
          selectedIndex={settingsLevels.indexOf(level)}
          style={styles.cefrSegmentedControl}
          values={[...settingsLevels]}
        />
      </View>
    </>
  );
}

function CardGoals({ styles }: { readonly styles: AppStyles }) {
  return (
    <>
      <Text style={styles.sectionLabel}>CARD GOALS</Text>
      <View style={styles.settingsCard}>
        <SettingMeter
          label="Daily New-Word Goal"
          styles={styles}
          value="5 words"
          width="28%"
        />
        <SettingMeter
          label="Mastery Repetitions"
          styles={styles}
          value="5 cycles"
          width="57%"
        />
      </View>
    </>
  );
}

function SettingMeter({
  label,
  styles,
  value,
  width,
}: {
  readonly label: string;
  readonly styles: AppStyles;
  readonly value: string;
  readonly width: `${number}%`;
}) {
  return (
    <View style={styles.settingMeter}>
      <View style={styles.settingRow}>
        <Text style={styles.actionTitle}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width }]} />
      </View>
    </View>
  );
}
