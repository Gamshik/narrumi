
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  type ViewStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BubbleButton,
  CefrLevelSelector,
  BubbleStatus,
  BubbleToggle,
  CollapsingTitleEdgeEffects,
  PlatformBlurTargetView,
} from '../shared';

import { type LearningPreferences } from '@domain/index';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';
import { floatingTabBarMetrics } from '@presentation/theme/layout';

import { useAuthSession } from '../auth';
import { useAppTheme } from '../theme';
import type { AppStyles } from '../types';
import { StoryWordGoalSetting } from './settings/components/StoryWordGoalSetting';

import {
  SettingsSkeleton,
  useBootstrapSession,
  type BootstrapSyncStatus,
  type BootstrapReadyState,
} from '../bootstrap';
import { getSettingsWarning, getSettingsSaveError } from './settingsState';

// settingsHeaderCollapseOffset matches Home's deliberate upward-scroll threshold.
const settingsHeaderCollapseOffset: number = 38;
// settingsHeaderExpandOffset matches Home's hysteresis against small scroll reversals.
const settingsHeaderExpandOffset: number = 12;
// settingsTitleTransitionDuration keeps the Settings title swap identical to Home.
const settingsTitleTransitionDuration: number = 220;
// settingsMaterialTransitionDuration fades top glass without a directional reveal.
const settingsMaterialTransitionDuration: number = 180;

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
  const {
    state,
    syncNow: bootstrapSyncNow,
    updatePreferences: bootstrapUpdatePreferences,
  } = useBootstrapSession();

  if (state.kind !== 'ready') {
    return <SettingsSkeleton isDark={isDark} styles={styles} />;
  }

  // readyState carries the hydrated preferences used by first visible render.
  const readyState: BootstrapReadyState = state;

  return (
    <SettingsReadyContent
      email={session?.email}
      isDark={isDark}
      readyState={readyState}
      styles={styles}
      onSignOut={signOut}
      onSyncNow={bootstrapSyncNow}
      onSavePreferences={bootstrapUpdatePreferences}
    />
  );
}

// SettingsReadyContent renders editable controls only after bootstrap hydration succeeds.
function SettingsReadyContent({
  email,
  isDark,
  readyState,
  styles,
  onSignOut,
  onSyncNow,
  onSavePreferences,
}: SettingsScreenProps & {
  // email identifies the authenticated account shown in sync diagnostics.
  readonly email: string | undefined;
  // readyState is the loaded bootstrap state allowed to render settings values.
  readonly readyState: BootstrapReadyState;
  // onSignOut closes the current Supabase session.
  readonly onSignOut: () => Promise<void>;
  // onSyncNow triggers the bootstrap-owned sync path from Settings.
  readonly onSyncNow: () => Promise<void>;
  // onSavePreferences persists settings and updates the bootstrap snapshot.
  readonly onSavePreferences: (
    preferences: EditablePreferencePatch,
  ) => Promise<LearningPreferences>;
}): ReactElement {
  const colors: AppColors = isDark ? darkColors : lightColors;
  const insets = useSafeAreaInsets();
  // titleTransition drives only the autonomous large-to-compact title swap.
  const [titleTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // materialTransition controls only the top blur-and-gradient opacity.
  const [materialTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  // blurTargetRef preserves the shared edge-effect source contract around Settings content.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // settingsContentInsets matches Home's initial safe spacing and tab clearance.
  const settingsContentInsets: ViewStyle = {
    paddingTop: insets.top + 20,
    paddingBottom: floatingTabBarMetrics(insets).contentPaddingBottom,
  };
  // largeTitleOpacity removes the large heading before the compact header reaches full opacity.
  const largeTitleOpacity: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.18, 0.58, 1],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });
  // largeTitleTranslateY lets the large heading leave with the scrolling content.
  const largeTitleTranslateY: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [0, -10, -10],
      extrapolate: 'clamp',
    });
  // largeTitleScale subtly compresses the title during collapse.
  const largeTitleScale: Animated.AnimatedInterpolation<number> =
    titleTransition.interpolate({
      inputRange: [0, 0.58, 1],
      outputRange: [1, 0.97, 0.97],
      extrapolate: 'clamp',
    });

  const [preferences, setPreferences] = useState<LearningPreferences>(readyState.preferences);
  const preferencesRef = useRef<LearningPreferences>(readyState.preferences);
  const [saveErrorRaw, setSaveErrorRaw] = useState<unknown>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    // The scroll gesture selects a target state; timing finishes independently of finger position.
    const titleAnimation: Animated.CompositeAnimation = Animated.timing(
      titleTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: settingsTitleTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );
    const materialAnimation: Animated.CompositeAnimation = Animated.timing(
      materialTransition,
      {
        toValue: isHeaderCollapsed ? 1 : 0,
        duration: settingsMaterialTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      },
    );

    titleAnimation.start();
    materialAnimation.start();

    return (): void => {
      titleAnimation.stop();
      materialAnimation.stop();
    };
  }, [isHeaderCollapsed, materialTransition, titleTransition]);

  useEffect(() => {
    preferencesRef.current = readyState.preferences;
    setPreferences(readyState.preferences);
  }, [readyState.preferences]);

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
      const savedPreferences = await onSavePreferences({
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
      await onSyncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const settingsWarning = getSettingsWarning(readyState);
  const saveErrorMessage = getSettingsSaveError(saveErrorRaw);

  const handleSettingsScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const offsetY: number = event.nativeEvent.contentOffset.y;

    if (!isHeaderCollapsed && offsetY >= settingsHeaderCollapseOffset) {
      setIsHeaderCollapsed(true);
      return;
    }

    if (isHeaderCollapsed && offsetY <= settingsHeaderExpandOffset) {
      setIsHeaderCollapsed(false);
    }
  };

  return (
    <View style={styles.flexOne}>
      <PlatformBlurTargetView
        blurTargetRef={blurTargetRef}
        style={styles.flexOne}
      >
        <Animated.ScrollView
          contentContainerStyle={[styles.screenContent, settingsContentInsets]}
          onScroll={handleSettingsScroll}
          scrollEnabled={scrollEnabled}
          scrollEventThrottle={16}
        >
          <Animated.View
            style={{
              opacity: largeTitleOpacity,
              transform: [
                { translateY: largeTitleTranslateY },
                { scale: largeTitleScale },
              ],
            }}
          >
            <View style={styles.homeHeader}>
              <View style={styles.homeTitleBlock}>
                <Text style={[styles.largeTitle, styles.homeTitle]}>
                  Settings
                </Text>
                <View style={styles.homeTitleAccent} />
              </View>
            </View>
          </Animated.View>

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
        setScrollEnabled={setScrollEnabled}
      />
          <Appearance styles={styles} />
          <AccountSync
        email={email}
        isSyncing={isSyncing}
        syncStatus={readyState.syncStatus}
        styles={styles}
        onSignOut={onSignOut}
        onSyncNow={handleSyncNow}
          />
        </Animated.ScrollView>
      </PlatformBlurTargetView>
      <CollapsingTitleEdgeEffects
        blurTarget={blurTargetRef}
        bottomInset={insets.bottom}
        colors={colors}
        isDark={isDark}
        materialOpacity={materialTransition}
        title="Settings"
        topInset={insets.top}
        transitionProgress={titleTransition}
      />
    </View>
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
  // colors follows the committed choice while the thumb animates on the native driver.
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
  setScrollEnabled,
}: SettingsScreenProps & {
  readonly preferences: LearningPreferences;
  readonly onUpdatePreferences: (patch: EditablePreferencePatch) => Promise<void>;
  readonly setScrollEnabled: (enabled: boolean) => void;
}): ReactElement {
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <>
      <Text style={styles.sectionLabel}>LEARNING PREFERENCES</Text>
      <View style={styles.settingsCard}>
        <CefrLevelSelector
          isDark={isDark}
          label="CEFR Target Level"
          selectedLevel={preferences.preferredCefrLevel}
          styles={styles}
          onSelect={(preferredCefrLevel) =>
            void onUpdatePreferences({ preferredCefrLevel })
          }
        />

        <StoryWordGoalSetting
          colors={colors}
          value={preferences.storyWordGoal}
          onChange={(storyWordGoal: number): void => {
            void onUpdatePreferences({ storyWordGoal });
          }}
          onInteractionStart={() => setScrollEnabled(false)}
          onInteractionEnd={() => setScrollEnabled(true)}
        />
      </View>
    </>
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
