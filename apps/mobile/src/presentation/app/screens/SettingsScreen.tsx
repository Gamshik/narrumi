
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BubbleButton, BubbleSegmentedControl, BubbleStatus, BubbleToggle, JellyPressable } from '../shared';

import {
  cefrLevels,
  DEFAULT_STORY_WORD_GOAL,
  type LearningPreferences,
  MAX_STORY_WORD_GOAL,
  MIN_STORY_WORD_GOAL,
} from '@domain/index';
import type { SyncLocalChangesResult } from '@application/index';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import { localAppServices } from '../services/localAppServices';
import { useAuthSession } from '../auth';
import { useBootstrapSession, type BootstrapSyncStatus, type BootstrapReadyState } from '../bootstrap';
import { getSettingsWarning, getSettingsSaveError } from './settingsState';

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
  const { session, signOut } = useAuthSession();
  const { state, syncNow: bootstrapSyncNow } = useBootstrapSession();
  const colors: AppColors = isDark ? darkColors : lightColors;

  // Route guard guarantees state is ready before SettingsScreen renders.
  const readyState = state as BootstrapReadyState;

  const [preferences, setPreferences] = useState<LearningPreferences>(readyState.preferences);
  const preferencesRef = useRef<LearningPreferences>(readyState.preferences);
  const [saveErrorRaw, setSaveErrorRaw] = useState<unknown>();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (state.kind === 'ready') {
      preferencesRef.current = state.preferences;
      setPreferences(state.preferences);
    }
  }, [state]);

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
    setSaveErrorRaw(undefined);

    try {
      const savedPreferences =
        await localAppServices.updateLearningPreferences.execute({
          preferredCefrLevel: optimisticPreferences.preferredCefrLevel,
          preferredGenre: optimisticPreferences.preferredGenre,
          storyWordGoal: optimisticPreferences.storyWordGoal,
        });

      preferencesRef.current = savedPreferences;
      setPreferences(savedPreferences);
    } catch (error) {
      preferencesRef.current = previousPreferences;
      setPreferences(previousPreferences);
      setSaveErrorRaw(error);
    }
  };

  const handleSyncNow = async (): Promise<void> => {
    setIsSyncing(true);
    try {
      await bootstrapSyncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  if (state.kind !== 'ready') {
    return <></>; // Fallback, though route guard prevents this.
  }

  const settingsWarning = getSettingsWarning(state);
  const saveErrorMessage = getSettingsSaveError(saveErrorRaw);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.largeTitle}>Settings</Text>
      </View>

      {settingsWarning ? (
        <BubbleStatus
          colors={colors}
          {...(settingsWarning.message ? { message: settingsWarning.message } : {})}
          title={settingsWarning.title}
          tone={settingsWarning.isError ? 'error' : 'offline'}
          variant="row"
        />
      ) : null}

      {saveErrorMessage ? (
        <BubbleStatus
          colors={colors}
          title={saveErrorMessage}
          tone="error"
          variant="row"
        />
      ) : null}

      <LearningPreferencesSection
        isDark={isDark}
        preferences={preferences}
        styles={styles}
        onUpdatePreferences={updatePreferences}
      />
      <Appearance styles={styles} />
      <AccountSync
        email={session?.email}
        isSyncing={isSyncing}
        syncStatus={state.syncStatus}
        styles={styles}
        onSignOut={signOut}
        onSyncNow={handleSyncNow}
      />
    </ScrollView>
  );
}

// AccountSync renders the remote sync state needed to diagnose RLS writes.
function AccountSync({
  email,
  isSyncing,
  syncStatus,
  styles,
  onSignOut,
  onSyncNow,
}: SettingsSectionProps & {
  // email identifies the authenticated Supabase account used by RLS.
  readonly email: string | undefined;
  // isSyncing disables duplicate manual sync attempts.
  readonly isSyncing: boolean;
  // syncStatus is the latest sync attempt status from bootstrap.
  readonly syncStatus: BootstrapSyncStatus;
  // onSignOut closes the current Supabase session.
  readonly onSignOut: () => Promise<void>;
  // onSyncNow forces one visible sync attempt for diagnostics.
  readonly onSyncNow: () => Promise<void>;
}): ReactElement {
  const statusLabel = formatSyncStatus(syncStatus);
  const { isDark } = useAppTheme();
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <>
      <Text style={styles.sectionLabel}>ACCOUNT & SYNC</Text>
      <View style={styles.settingsCompactCard}>
        <View style={styles.accountCompactHeader}>
          <View style={styles.flex}>
            <Text style={styles.actionTitle}>Signed in as</Text>
            <Text style={styles.secondaryText}>{email ?? 'Unknown account'}</Text>
          </View>
          <BubbleStatus
            colors={colors}
            tone={
              syncStatus === 'offline' ? 'offline' :
              syncStatus === 'unauthenticated' ? 'disabled' :
              syncStatus === 'failed' ? 'error' :
              syncStatus === 'synced' ? 'success' : 'loading'
            }
            title={statusLabel}
          />
        </View>

        <Text style={styles.accountStatusText}>
          {syncStatus === 'synced' 
            ? 'Your data is backed up to the cloud.'
            : 'Use Sync Now after creating a series to verify remote writes.'}
        </Text>

        <View style={styles.accountActionRow}>
          <BubbleButton
            style={styles.flexOne}
            disabled={isSyncing}
            colors={colors}
            contentStyle={styles.accountActionButton}
            variant="primary"
            onPress={() => void onSyncNow()}
          >
            <Text style={styles.primaryButtonText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </BubbleButton>
          <BubbleButton
            style={styles.flexOne}
            colors={colors}
            contentStyle={styles.accountActionButton}
            variant="secondary"
            onPress={() => void onSignOut()}
          >
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </BubbleButton>
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

// LearningPreferencesSection keeps persisted grammar and Story Word settings visible.
function LearningPreferencesSection({
  isDark,
  preferences,
  styles,
  onUpdatePreferences,
}: SettingsScreenProps & {
  readonly preferences: LearningPreferences;
  readonly onUpdatePreferences: (patch: EditablePreferencePatch) => Promise<void>;
}): ReactElement {
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <>
      <Text style={styles.sectionLabel}>LEARNING PREFERENCES</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.actionTitle}>CEFR Target Level</Text>
            <Text style={styles.secondaryText}>
              Controls generated story grammar
            </Text>
          </View>
          <Text style={styles.settingValue}>{preferences.preferredCefrLevel}</Text>
        </View>
        <BubbleSegmentedControl
          colors={colors}
          onValueChange={(value) => onUpdatePreferences({ preferredCefrLevel: value as SettingsLevel })}
          selectedIndex={settingsLevels.indexOf(preferences.preferredCefrLevel as SettingsLevel)}
          style={styles.cefrSegmentedControl}
          values={[...settingsLevels]}
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
function formatSyncStatus(status: BootstrapSyncStatus): string {
  if (status === 'synced') return 'Up to date';
  if (status === 'offline') return 'Offline';
  if (status === 'unauthenticated') return 'Signed out';
  if (status === 'failed') return 'Failed';
  return 'Syncing...';
}
