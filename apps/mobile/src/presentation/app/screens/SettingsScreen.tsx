import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BubbleToggle, JellyPressable } from '../shared';

import {
  cefrLevels,
  DEFAULT_STORY_WORD_GOAL,
  learningGenres,
  type CefrLevel,
  type LearningPreferences,
  type LearningGenre,
  MAX_STORY_WORD_GOAL,
  MIN_STORY_WORD_GOAL,
} from '@domain/index';
import type { SyncLocalChangesResult } from '@application/index';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import { localAppServices } from '../services/localAppServices';
import { useAuthSession } from '../auth';
import { useAppTheme } from '../theme';
import type { AppStyles } from '../types';

// settingsLevels mirrors the domain CEFR set so persisted values always render.
const settingsLevels = cefrLevels;
// SettingsLevel narrows the settings selector to supported grammar targets.
type SettingsLevel = (typeof settingsLevels)[number];

// EditablePreferencePatch is the settings subset controlled by this screen.
type EditablePreferencePatch = Partial<
  Pick<
    LearningPreferences,
    | 'preferredCefrLevel'
    | 'preferredGenre'
    | 'storyWordGoal'
  >
>;

// genreLabels maps domain genre values to settings display labels.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'short-fiction': 'Short Fiction',
  'travel-leisure': 'Travel',
  'work-it': 'Work & IT',
};

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

// SettingsScreen renders real settings controls and excludes fake profile/network panels.
export function SettingsScreen({
  isDark,
  styles,
}: SettingsScreenProps): ReactElement {
  const initialPreferences: LearningPreferences = {
    preferredCefrLevel: 'B1',
    preferredGenre: 'short-fiction',
    storyWordGoal: DEFAULT_STORY_WORD_GOAL,
    updatedAt: new Date(0).toISOString(),
    sync: {
      isDirty: false,
      pendingOperationId: 'initial-preferences-placeholder',
    },
  };
  const [preferences, setPreferences] =
    useState<LearningPreferences>(initialPreferences);
  const preferencesRef = useRef<LearningPreferences>(initialPreferences);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [syncResult, setSyncResult] = useState<SyncLocalChangesResult>();
  const [isSyncing, setIsSyncing] = useState(false);
  const { session, signOut } = useAuthSession();

  useEffect(() => {
    let isActive = true;

    void localAppServices.loadLearningPreferences
      .execute()
      .then(({ preferences: loadedPreferences }) => {
        if (isActive) {
          preferencesRef.current = loadedPreferences;
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
    nextPreferences: EditablePreferencePatch,
  ): Promise<void> => {
    const previousPreferences = preferencesRef.current;
    const optimisticPreferences = buildOptimisticPreferences(
      previousPreferences,
      nextPreferences,
    );

    preferencesRef.current = optimisticPreferences;
    setPreferences(optimisticPreferences);
    setErrorMessage(undefined);

    try {
      const savedPreferences =
        await localAppServices.updateLearningPreferences.execute({
          preferredCefrLevel: optimisticPreferences.preferredCefrLevel,
          preferredGenre: optimisticPreferences.preferredGenre,
          storyWordGoal: optimisticPreferences.storyWordGoal,
        });

      preferencesRef.current = savedPreferences;
      setPreferences(savedPreferences);
    } catch {
      preferencesRef.current = previousPreferences;
      setPreferences(previousPreferences);
      setErrorMessage('Learning settings could not be saved.');
    }
  };

  const syncNow = async (): Promise<void> => {
    setIsSyncing(true);
    setErrorMessage(undefined);

    try {
      setSyncResult(await localAppServices.syncLocalChanges.execute());
    } catch (error) {
      setSyncResult({
        status: 'failed',
        pushedCount: 0,
        failedCount: 1,
        pendingCount: 0,
        errorMessage:
          error instanceof Error ? error.message : 'Sync failed unexpectedly.',
      });
    } finally {
      setIsSyncing(false);
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

      <GrammarControl
        isDark={isDark}
        level={preferences.preferredCefrLevel}
        styles={styles}
        onChangeLevel={(preferredCefrLevel) =>
          updatePreferences({ preferredCefrLevel })
        }
      />
      <AccountSync
        email={session?.email}
        isSyncing={isSyncing}
        result={syncResult}
        styles={styles}
        onSignOut={signOut}
        onSyncNow={syncNow}
      />
      <Appearance styles={styles} />
      <SeriesDefaults
        preferences={preferences}
        styles={styles}
        onUpdatePreferences={updatePreferences}
      />
    </ScrollView>
  );
}

// AccountSync renders the remote sync state needed to diagnose RLS writes.
function AccountSync({
  email,
  isSyncing,
  result,
  styles,
  onSignOut,
  onSyncNow,
}: SettingsSectionProps & {
  // email identifies the authenticated Supabase account used by RLS.
  readonly email: string | undefined;
  // isSyncing disables duplicate manual sync attempts.
  readonly isSyncing: boolean;
  // result is the latest sync attempt summary.
  readonly result: SyncLocalChangesResult | undefined;
  // onSignOut closes the current Supabase session.
  readonly onSignOut: () => Promise<void>;
  // onSyncNow forces one visible sync attempt for diagnostics.
  readonly onSyncNow: () => Promise<void>;
}): ReactElement {
  const statusLabel = result ? formatSyncStatus(result) : 'Not checked yet';

  return (
    <>
      <Text style={styles.sectionLabel}>ACCOUNT & SYNC</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.flex}>
            <Text style={styles.actionTitle}>Signed in as</Text>
            <Text style={styles.secondaryText}>{email ?? 'Unknown account'}</Text>
          </View>
          <Text style={styles.settingValue}>{statusLabel}</Text>
        </View>

        {result?.errorMessage ? (
          <View style={styles.syncErrorBox}>
            <Text style={styles.syncErrorText}>{result.errorMessage}</Text>
          </View>
        ) : null}

        {result ? (
          <Text style={styles.secondaryText}>
            Pending: {result.pendingCount} · Pushed: {result.pushedCount} ·
            Failed: {result.failedCount}
          </Text>
        ) : (
          <Text style={styles.secondaryText}>
            Use Sync Now after creating a series to verify remote writes.
          </Text>
        )}

        <View style={styles.practiceActions}>
          <JellyPressable
            disabled={isSyncing}
            onPress={() => void onSyncNow()}
            style={({ pressed }) => [
              styles.primaryButton,
              isSyncing && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </JellyPressable>
          <JellyPressable
            containerStyle={styles.flexOne}
            onPress={() => void onSignOut()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </JellyPressable>
        </View>
      </View>
    </>
  );
}

// Appearance renders the app theme toggle backed by ThemeProvider state.
function Appearance({ styles }: SettingsSectionProps): ReactElement {
  const { isDark, setDarkMode } = useAppTheme();
  // colors lets the reusable toggle render from semantic light/dark tokens.
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <>
      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.flex}>
            <Text style={styles.actionTitle}>Dark Mode</Text>
            <Text style={styles.secondaryText}>
              Choose the light or dark app theme.
            </Text>
          </View>
          <BubbleToggle
            accessibilityLabel="Dark Mode"
            colors={colors}
            onValueChange={setDarkMode}
            style={styles.settingToggle}
            value={isDark}
          />
        </View>
      </View>
    </>
  );
}

// GrammarControl stores the local CEFR target until persistence is introduced.
function GrammarControl({
  isDark,
  level,
  styles,
  onChangeLevel,
}: SettingsScreenProps & {
  // level is the persisted preferred CEFR level.
  readonly level: CefrLevel;
  // onChangeLevel persists the selected preferred CEFR level.
  readonly onChangeLevel: (level: CefrLevel) => void;
}): ReactElement {
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
          onValueChange={(value) => onChangeLevel(value as SettingsLevel)}
          selectedIndex={settingsLevels.indexOf(level as SettingsLevel)}
          style={styles.cefrSegmentedControl}
          values={[...settingsLevels]}
        />
      </View>
    </>
  );
}

// SeriesDefaults edits local defaults used by Word Picker and episode generation.
function SeriesDefaults({
  preferences,
  styles,
  onUpdatePreferences,
}: SettingsSectionProps & {
  // preferences are the locally persisted series defaults.
  readonly preferences: LearningPreferences;
  // onUpdatePreferences persists bounded preference updates through the use case.
  readonly onUpdatePreferences: (
    preferences: Partial<
      Pick<
        LearningPreferences,
        'preferredGenre' | 'storyWordGoal'
      >
    >,
  ) => Promise<void>;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>SERIES DEFAULTS</Text>
      <View style={styles.settingsCard}>
        <GenreDefault
          selectedGenre={preferences.preferredGenre}
          styles={styles}
          onChangeGenre={(preferredGenre) =>
            onUpdatePreferences({ preferredGenre })
          }
        />
        <StepSetting
          max={MAX_STORY_WORD_GOAL}
          min={MIN_STORY_WORD_GOAL}
          label="Story Word Suggestions"
          styles={styles}
          suffix="words"
          value={preferences.storyWordGoal}
          onChange={(storyWordGoal) =>
            onUpdatePreferences({ storyWordGoal })
          }
        />
      </View>
    </>
  );
}

// GenreDefault renders persisted default genre choices for new series.
function GenreDefault({
  selectedGenre,
  styles,
  onChangeGenre,
}: {
  // selectedGenre is the locally persisted default series genre.
  readonly selectedGenre: LearningGenre;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onChangeGenre persists the chosen default genre.
  readonly onChangeGenre: (genre: LearningGenre) => void;
}): ReactElement {
  return (
    <View style={styles.settingMeter}>
      <View style={styles.settingRow}>
        <Text style={styles.actionTitle}>Default Genre</Text>
        <Text style={styles.settingValue}>{genreLabels[selectedGenre]}</Text>
      </View>
      <View style={styles.choiceRow}>
        {learningGenres.map((genre) => (
          <JellyPressable
            key={genre}
            onPress={() => onChangeGenre(genre)}
            style={[
              styles.goalChoice,
              genre === selectedGenre && styles.activeGoalChoice,
            ]}
          >
            <Text
              style={[
                styles.goalChoiceText,
                genre === selectedGenre && styles.activeGoalChoiceText,
              ]}
            >
              {genreLabels[genre]}
            </Text>
          </JellyPressable>
        ))}
      </View>
    </View>
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
        <JellyPressable
          containerStyle={styles.flexOne}
          disabled={value <= min}
          onPress={() => onChange(value - 1)}
          style={[
            styles.stepperButton,
            value <= min && styles.disabledControl,
          ]}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </JellyPressable>
        <JellyPressable
          containerStyle={styles.flexOne}
          disabled={value >= max}
          onPress={() => onChange(value + 1)}
          style={[
            styles.stepperButton,
            value >= max && styles.disabledControl,
          ]}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </JellyPressable>
      </View>
    </View>
  );
}

// buildOptimisticPreferences updates UI immediately while persistence catches up.
function buildOptimisticPreferences(
  currentPreferences: LearningPreferences,
  nextPreferences: EditablePreferencePatch,
): LearningPreferences {
  const timestamp = new Date().toISOString();

  return {
    ...currentPreferences,
    ...nextPreferences,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId: `${timestamp}:preferences:update`,
      ...(currentPreferences.sync.lastSyncedAt
        ? { lastSyncedAt: currentPreferences.sync.lastSyncedAt }
        : {}),
    },
  };
}

// formatSyncStatus keeps the diagnostic label compact inside the settings row.
function formatSyncStatus(result: SyncLocalChangesResult): string {
  if (result.status === 'synced' && result.pendingCount === 0) {
    return 'Up to date';
  }

  if (result.status === 'synced') {
    return 'Synced';
  }

  if (result.status === 'offline') {
    return 'Offline';
  }

  if (result.status === 'unauthenticated') {
    return 'Signed out';
  }

  return 'Failed';
}
