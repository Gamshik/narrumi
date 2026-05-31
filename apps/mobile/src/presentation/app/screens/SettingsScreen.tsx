import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import {
  DEFAULT_DAILY_WORD_GOAL,
  DEFAULT_REQUIRED_REVIEW_CYCLES,
  type LearningPreferences,
  MAX_DAILY_WORD_GOAL,
  MAX_REQUIRED_REVIEW_CYCLES,
  MIN_DAILY_WORD_GOAL,
  MIN_REQUIRED_REVIEW_CYCLES,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import { useAppTheme } from '../theme';
import type { AppStyles } from '../types';

// settingsLevels is the native segmented-control value set for grammar target level.
const settingsLevels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
// SettingsLevel narrows the settings selector to supported grammar targets.
type SettingsLevel = (typeof settingsLevels)[number];

// SettingsScreenProps defines the top-level settings screen style and theme inputs.
type SettingsScreenProps = {
  // isDark controls native iOS segmented-control appearance.
  readonly isDark: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// SettingsSectionProps carries shared themed styles into settings sections.
type SettingsSectionProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// GrammarControlProps defines inputs needed by the CEFR target control.
type GrammarControlProps = SettingsScreenProps;

// SettingsScreen renders real settings controls and excludes mock profile/network panels.
export function SettingsScreen({
  isDark,
  styles,
}: SettingsScreenProps): ReactElement {
  const [preferences, setPreferences] = useState<LearningPreferences>({
    dailyWordGoal: DEFAULT_DAILY_WORD_GOAL,
    requiredReviewCycles: DEFAULT_REQUIRED_REVIEW_CYCLES,
    updatedAt: new Date(0).toISOString(),
  });
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isActive = true;

    void localAppServices.loadLearningPreferences
      .execute()
      .then(({ preferences: loadedPreferences }) => {
        if (isActive) {
          setPreferences(loadedPreferences);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('Learning settings could not be loaded.');
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const updatePreferences = async (
    nextPreferences: Partial<
      Pick<LearningPreferences, 'dailyWordGoal' | 'requiredReviewCycles'>
    >,
  ): Promise<void> => {
    setErrorMessage(undefined);

    try {
      const savedPreferences =
        await localAppServices.updateLearningPreferences.execute(nextPreferences);

      setPreferences(savedPreferences);
    } catch {
      setErrorMessage('Learning settings could not be saved.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.largeTitle}>Settings</Text>
      </View>

      {errorMessage ? (
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      ) : null}

      <GrammarControl isDark={isDark} styles={styles} />
      <Appearance styles={styles} />
      <CardGoals
        preferences={preferences}
        styles={styles}
        onUpdatePreferences={updatePreferences}
      />
    </ScrollView>
  );
}

// Appearance renders the app theme toggle backed by ThemeProvider state.
function Appearance({ styles }: SettingsSectionProps): ReactElement {
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

// GrammarControl stores the local CEFR target until persistence is introduced.
function GrammarControl({
  isDark,
  styles,
}: GrammarControlProps): ReactElement {
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

// CardGoals edits the local card-learning settings used by Daily Session.
function CardGoals({
  preferences,
  styles,
  onUpdatePreferences,
}: SettingsSectionProps & {
  // preferences are the locally persisted card-learning rules.
  readonly preferences: LearningPreferences;
  // onUpdatePreferences persists bounded preference updates through the use case.
  readonly onUpdatePreferences: (
    preferences: Partial<
      Pick<LearningPreferences, 'dailyWordGoal' | 'requiredReviewCycles'>
    >,
  ) => Promise<void>;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>CARD GOALS</Text>
      <View style={styles.settingsCard}>
        <StepSetting
          max={MAX_DAILY_WORD_GOAL}
          min={MIN_DAILY_WORD_GOAL}
          label="Daily New-Word Goal"
          styles={styles}
          suffix="words"
          value={preferences.dailyWordGoal}
          onChange={(dailyWordGoal) =>
            onUpdatePreferences({ dailyWordGoal })
          }
        />
        <StepSetting
          max={MAX_REQUIRED_REVIEW_CYCLES}
          min={MIN_REQUIRED_REVIEW_CYCLES}
          label="Mastery Repetitions"
          styles={styles}
          suffix="cycles"
          value={preferences.requiredReviewCycles}
          onChange={(requiredReviewCycles) =>
            onUpdatePreferences({ requiredReviewCycles })
          }
        />
      </View>
    </>
  );
}

// StepSetting renders a bounded local setting with tactile increment controls.
function StepSetting({
  label,
  max,
  min,
  styles,
  suffix,
  value,
  onChange,
}: {
  // label is the visible name of the setting.
  readonly label: string;
  // max is the upper product bound for this setting.
  readonly max: number;
  // min is the lower product bound for this setting.
  readonly min: number;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // suffix explains the numeric value unit.
  readonly suffix: string;
  // value is the current persisted setting value.
  readonly value: number;
  // onChange persists the next bounded setting value.
  readonly onChange: (value: number) => void;
}): ReactElement {
  const width = `${((value - min) / (max - min)) * 100}%` as `${number}%`;

  return (
    <View style={styles.settingMeter}>
      <View style={styles.settingRow}>
        <Text style={styles.actionTitle}>{label}</Text>
        <Text style={styles.settingValue}>
          {value} {suffix}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width }]} />
      </View>
      <View style={styles.stepperRow}>
        <Pressable
          disabled={value <= min}
          onPress={() => onChange(value - 1)}
          style={({ pressed }) => [
            styles.stepperButton,
            value <= min && styles.disabledControl,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Pressable
          disabled={value >= max}
          onPress={() => onChange(value + 1)}
          style={({ pressed }) => [
            styles.stepperButton,
            value >= max && styles.disabledControl,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
