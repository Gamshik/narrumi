# Phase 02: Shell And Series Screens - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 15 likely touched/new-or-modified files
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx` | component/screen | request-response | same file | exact |
| `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` | component/screen | CRUD + request-response | same file | exact |
| `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` | component/screen | CRUD + request-response | same file | exact |
| `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` | component/screen | CRUD + request-response | same file | exact |
| `apps/mobile/app/(tabs)/index.tsx` | route | request-response navigation | `apps/mobile/app/series-details.tsx` | exact |
| `apps/mobile/app/(tabs)/settings.tsx` | route | request-response navigation | same file | exact |
| `apps/mobile/app/(tabs)/_layout.tsx` | route/config | event-driven navigation | same file | exact |
| `apps/mobile/app/_layout.tsx` | provider/config | auth-gated routing | same file | exact |
| `apps/mobile/src/presentation/app/shared/SorbetTabBar/SorbetTabBar.tsx` | component | event-driven navigation | same file | exact |
| `apps/mobile/src/presentation/app/shared/RouteScreen.tsx` | component/shell | transform | same file | exact |
| `apps/mobile/src/presentation/app/shared/BubbleSurface/BubbleSurface.tsx` | component/primitive | transform | same file | exact |
| `apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx` | component/primitive | event-driven | same file | exact |
| `apps/mobile/src/presentation/app/shared/BubblePill/BubblePill.tsx` | component/primitive | event-driven + transform | same file | exact |
| `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` | component/primitive | modal presentation | same file | exact |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | style utility | transform | same file | exact |

## Pattern Assignments

### `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx` (component/screen, request-response)

**Analog:** `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx`

**Imports and session boundary pattern** (lines 1-12):
```typescript
import { useState } from 'react';
import type { ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { JellyPressable, RouteScreen } from '../../shared';
import { useAppStyles } from '../../useAppStyles';
import { useAuthSession } from '../AuthProvider';
```

**Submit/error/loading pattern** (lines 28-60):
```typescript
const submit = async (): Promise<void> => {
  setIsSubmitting(true);
  setMessage(undefined);
  setIsError(false);

  try {
    if (mode === 'sign-in') {
      await signIn({ email, password });
    } else {
      const result = await signUp({ email, password });
      if (result.requiresEmailConfirmation) {
        setMessage('Check your inbox, confirm the email, then return and sign in.');
        setPassword('');
        setMode('sign-in');
      }
    }
  } catch (error) {
    setIsError(true);
    setMessage(error instanceof Error ? error.message : 'Authentication failed. Try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Mode switch and status message pattern** (lines 77-149):
```typescript
<View style={styles.authModeRow}>
  <AuthModeButton isActive={mode === 'sign-in'} label="Sign In" styles={styles} onPress={...} />
  <AuthModeButton isActive={mode === 'sign-up'} label="Create Account" styles={styles} onPress={...} />
</View>
{message ? (
  <View style={[styles.authMessage, isError ? styles.authErrorMessage : styles.authSuccessMessage]}>
    <Text style={styles.authMessageText}>{message}</Text>
  </View>
) : null}
```

**Planner notes:** Restyle around `RouteScreen` + `KeyboardAvoidingView`; preserve `useAuthSession`, `submit`, `isSubmitting`, `message`, `isError`, `TextInput` auth props, and disabled button rules.

---

### `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` (component/screen, CRUD + request-response)

**Analog:** `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`

**Imports and local service boundary** (lines 1-33):
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { JellyPressable } from '../shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
```

**Screen state and CRUD actions** (lines 108-130, 132-187, 238-249):
```typescript
const [series, setSeries] = useState<readonly Series[]>([]);
const [form, setForm] = useState<SeriesFormState>(emptySeriesForm);
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
const [errorMessage, setErrorMessage] = useState<string>();

const loadSeries = useCallback(async (): Promise<void> => {
  try {
    const result = await localAppServices.listSeries.execute();
    setSeries(result.series);
    setErrorMessage(undefined);
  } catch {
    setErrorMessage('Local series could not be loaded.');
  }
}, []);
```

**AI setup generation pattern** (lines 189-218):
```typescript
const generateSetupDraft = async (): Promise<void> => {
  setIsGeneratingSetup(true);
  setErrorMessage(undefined);
  try {
    const result = await localAppServices.generateSeriesSetupDraft.execute(
      buildSetupDraftRequest(form),
    );
    setForm({ ...form, title: result.draft.title, premise: result.draft.premise });
    setFormErrors({});
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Series setup could not be generated.');
  } finally {
    setIsGeneratingSetup(false);
  }
};
```

**Current render decomposition** (lines 252-301):
```typescript
<ScrollView contentContainerStyle={styles.screenContent}>
  <HomeHeader styles={styles} onCreateSeries={() => setIsCreateOpen(true)} />
  {errorMessage ? <View style={styles.stateMessage}>...</View> : null}
  <ContinueBanner ... />
  <SeriesList ... />
</ScrollView>
<CreateSeriesModal ... onGenerate={generateSetupDraft} onSubmit={submitSeries} />
```

**Series card/list row pattern** (lines 370-477):
```typescript
function SeriesList({ series, deletingSeriesId, onOpenSeries, onDeleteSeries }: ...): ReactElement {
  return series.length === 0 ? (
    <JellyPressable style={({ pressed }) => [styles.emptySeriesPanel, pressed && styles.pressed]} />
  ) : (
    <View style={styles.seriesList}>
      {series.map((item) => <SeriesRow key={item.id} series={item} ... />)}
    </View>
  );
}
```

**Planner notes:** Home should become create-first per D-01/D-03/D-04. Do not move `localAppServices` logic. Convert `ContinueBanner`, `SeriesList`, and `SeriesRow` visuals toward `BubbleSurface`/`BubbleButton`/`BubblePill` if it reduces duplication, but keep callbacks and local CRUD behavior intact.

---

### `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` setup modal (component/form, request-response + file-local transform)

**Analog:** `CreateSeriesModal`, `FormField`, `CharacterProfilesEditor`, `ChoiceGroup` in `HomeScreen.tsx`

**Modal structure and safe-area pattern** (lines 513-572):
```typescript
const insets = useSafeAreaInsets();
const topInset = Math.max(insets.top, 62);
const bottomInset = Math.max(insets.bottom, 18);
const isBusy = isSaving || isGeneratingSetup;

<Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalScreen, { paddingTop: topInset }]}>
    <View style={styles.modalHeader}>...</View>
    <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: bottomInset + 12 }]} />
  </KeyboardAvoidingView>
</Modal>
```

**Segmented choice pattern** (lines 845-893):
```typescript
function ChoiceGroup<T extends string>({ label, labels, options, selected, onSelect }: ...): ReactElement {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <JellyPressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.goalChoice,
              option === selected && styles.activeGoalChoice,
              pressed && styles.pressed,
            ]}
          >
```

**Text field and validation pattern** (lines 690-756, 916-940):
```typescript
<TextInput
  multiline={isMultiline || isCompactMultiline}
  placeholderTextColor={styles.placeholder.color}
  style={[styles.formInput, isMultiline && styles.formTextArea]}
  value={value}
/>
{error ? <Text style={styles.formErrorText}>{error}</Text> : null}
{!error && helper ? <Text style={styles.formHelperText}>{helper}</Text> : null}
```

**Character editor pattern** (lines 760-841):
```typescript
{profiles.map((profile, index) => (
  <View key={profile.id} style={styles.formGroup}>
    <TextInput value={profile.name} onChangeText={(name) => updateProfile(index, { name })} />
    <TextInput multiline value={profile.description} onChangeText={(description) => updateProfile(index, { description })} />
  </View>
))}
<JellyPressable onPress={addProfile} style={({ pressed }) => [styles.secondarySmallButton, pressed && styles.pressed]}>
  <Text style={styles.secondarySmallButtonText}>Add Character</Text>
</JellyPressable>
```

**Planner notes:** D-05 keeps native modal behavior. D-07 requires fuller character cards; reuse the existing controlled profile editor contract and only restyle/decompose presentation.

---

### `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` (component/screen, CRUD + request-response)

**Analog:** `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx`

**Focus reload and state pattern** (lines 123-150):
```typescript
const [state, setState] = useState<SeriesDetailsState>();
const [setupForm, setSetupForm] = useState<SeriesSetupFormState>();
const [errorMessage, setErrorMessage] = useState<string>();

const loadDetails = useCallback(async (): Promise<void> => {
  try {
    const details = await localAppServices.loadSeriesDetails.execute({ seriesId });
    setState(details);
    setSetupForm(createSetupForm(details.series));
    setErrorMessage(undefined);
  } catch {
    setErrorMessage('Series details could not be loaded.');
  }
}, [seriesId]);

useFocusEffect(useCallback(() => { void loadDetails(); }, [loadDetails]));
```

**Continue/prep action pattern** (lines 301-363):
```typescript
const latestEpisode = state.episodes.at(-1);
const hasEpisodeInProgress = latestEpisode !== undefined && !latestEpisode.isComplete;

<JellyPressable
  onPress={() => {
    if (latestEpisode && !latestEpisode.isComplete) {
      onContinueEpisode(latestEpisode.id);
      return;
    }
    onPrepareEpisode(state.series.id);
  }}
  style={({ pressed }) => [styles.continueBanner, styles.seriesPrepareBanner, pressed && styles.pressed]}
>
```

**Memory and episode history pattern** (lines 365-407, 991-1051):
```typescript
<View style={styles.settingsCard}>
  <Text style={styles.actionTitle}>Series Memory</Text>
  <Text style={styles.secondaryText}>
    {state.memory?.lastEpisodeSummary ?? state.memory?.unresolvedCliffhanger ?? 'No generated episode memory yet.'}
  </Text>
</View>

{state.episodes.map((episode) => (
  <EpisodeHistoryRow
    isDeleting={episode.id === deletingEpisodeId}
    episode={episode}
    key={episode.id}
    onDeleteEpisode={requestDeleteEpisode}
    onOpenEpisode={onOpenEpisode}
  />
))}
```

**Planner notes:** D-09 makes the continue/prep card the visual priority. D-10 says hide memory when empty, so replace the current fallback card with conditional rendering. Keep `useFocusEffect`, delete confirmation, `onPrepareEpisode`, `onContinueEpisode`, `onReadSeries`, and read/delete row callbacks.

---

### `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` setup modal (component/form, CRUD + read-only state)

**Analog:** `SeriesSetupModal`, `SetupFormField`, `SetupChoiceGroup` in `SeriesDetailsScreen.tsx`

**Edit lock pattern** (lines 183-227, 434-477):
```typescript
const canEditSetup = (state?.episodes.length ?? 1) === 0;

function SeriesSetupModal({ canEdit, isGenerating, isSaving, ... }: ...): ReactElement {
  const isBusy = isSaving || isGenerating;
```

**Read-only controls pattern** (lines 497-675, 682-755, 858-912):
```typescript
<JellyPressable disabled={!canEdit || isBusy} onPress={onSave} style={styles.modalTextButton}>
  <Text style={[styles.modalSave, (!canEdit || isBusy) && styles.disabledControl]}>Save</Text>
</JellyPressable>

<TextInput
  editable={isEditable}
  style={[styles.formInput, !isEditable && styles.disabledControl]}
  value={value}
/>

<JellyPressable
  disabled={isDisabled}
  style={({ pressed }) => [
    styles.goalChoice,
    option === selected && styles.activeGoalChoice,
    pressed && styles.pressed,
    isDisabled && option !== selected && styles.disabledControl,
  ]}
>
```

**Planner notes:** Preserve post-first-episode read-only behavior and make disabled/read-only styling visually clear per D-11 and D-16.

---

### `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` (component/screen, CRUD + request-response)

**Analog:** `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`

**Imports and settings dependencies** (lines 1-23):
```typescript
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BubbleToggle, JellyPressable } from '../shared';
import { localAppServices } from '../services/localAppServices';
import { useAuthSession } from '../auth';
import { useAppTheme } from '../theme';
```

**Optimistic preferences update pattern** (lines 85-135, 498-517):
```typescript
void localAppServices.loadLearningPreferences.execute().then(({ preferences: loadedPreferences }) => {
  preferencesRef.current = loadedPreferences;
  setPreferences(loadedPreferences);
});

const updatePreferences = async (nextPreferences: EditablePreferencePatch): Promise<void> => {
  const previousPreferences = preferencesRef.current;
  const optimisticPreferences = buildOptimisticPreferences(previousPreferences, nextPreferences);
  preferencesRef.current = optimisticPreferences;
  setPreferences(optimisticPreferences);
  try {
    const savedPreferences = await localAppServices.updateLearningPreferences.execute(...);
    preferencesRef.current = savedPreferences;
    setPreferences(savedPreferences);
  } catch {
    preferencesRef.current = previousPreferences;
    setPreferences(previousPreferences);
    setErrorMessage('Learning settings could not be saved.');
  }
};
```

**Sync status pattern** (lines 137-155, 195-274, 519-538):
```typescript
const syncNow = async (): Promise<void> => {
  setIsSyncing(true);
  setErrorMessage(undefined);
  try {
    setSyncResult(await localAppServices.syncLocalChanges.execute());
  } catch (error) {
    setSyncResult({ status: 'failed', pushedCount: 0, failedCount: 1, pendingCount: 0, errorMessage: ... });
  } finally {
    setIsSyncing(false);
  }
};

if (result.status === 'offline') return 'Offline';
if (result.status === 'unauthenticated') return 'Signed out';
```

**Controls pattern** (lines 306-383, 388-496):
```typescript
<SegmentedControl
  appearance={isDark ? 'dark' : 'light'}
  onValueChange={(value) => onChangeLevel(value as SettingsLevel)}
  selectedIndex={settingsLevels.indexOf(level as SettingsLevel)}
  style={styles.cefrSegmentedControl}
  values={[...settingsLevels]}
/>

<JellyPressable disabled={value <= min} onPress={() => onChange(value - 1)} style={[styles.stepperButton, value <= min && styles.disabledControl]}>
```

**Planner notes:** D-13/D-14 move `Learning Preferences` first and combine CEFR, default genre, and Story Word goal. Keep `useAuthSession`, `useAppTheme`, manual sync, optimistic persistence, and sign-out behavior.

---

### Route and navigation files (route/config, request-response + event-driven)

**Analogs:** `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/series-details.tsx`, `apps/mobile/app/(tabs)/settings.tsx`

**Root provider and auth gate pattern** (`apps/mobile/app/_layout.tsx` lines 40-76):
```typescript
<SafeAreaProvider>
  <ThemeProvider>
    <AuthProvider>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="series-details" options={{ headerShown: false }} />
        </Stack>
      </AuthGate>
    </AuthProvider>
  </ThemeProvider>
</SafeAreaProvider>
```

**Tab layout pattern** (`apps/mobile/app/(tabs)/_layout.tsx` lines 9-18):
```typescript
<Tabs
  screenOptions={{ headerShown: false }}
  tabBar={(props) => <SorbetTabBar {...props} />}
>
  <Tabs.Screen name="index" options={{ title: 'Home' }} />
  <Tabs.Screen name="dictionary" options={{ title: 'Dictionary' }} />
  <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
</Tabs>
```

**Thin route wrapper pattern** (`apps/mobile/app/(tabs)/index.tsx` lines 7-20):
```typescript
const router = useRouter();
const { isDark, styles } = useAppStyles();

return (
  <RouteScreen isDark={isDark} styles={styles}>
    <HomeScreen onOpenSeries={(seriesId) => router.push({ pathname: '/series-details', params: { seriesId } })} styles={styles} />
  </RouteScreen>
);
```

**Planner notes:** Phase 2 likely does not need new routes. Keep routes thin; screen files own presentation, routes own navigation callbacks.

## Shared Patterns

### Shell, Safe Area, And Background

**Source:** `apps/mobile/src/presentation/app/shared/RouteScreen.tsx` lines 20-35
```typescript
export function RouteScreen({ children, isDark, styles }: RouteScreenProps): ReactElement {
  const colors = isDark ? darkColors : lightColors;
  return (
    <SafeAreaView style={styles.safeArea}>
      <SorbetBackground colors={colors} />
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
```

**Apply to:** Auth, home, settings, series details, and route wrappers.

### Floating Tab Bar And Scroll Padding

**Source:** `apps/mobile/src/presentation/app/shared/SorbetTabBar/SorbetTabBar.tsx` lines 21-40, 68-103
```typescript
const tabMetrics = floatingTabBarMetrics(insets);
<View pointerEvents="box-none" style={[styles.tabBar, { bottom: tabMetrics.bottomOffset }]}>
  <BlurView intensity={28} pointerEvents="none" style={styles.tabBarBlur} tint={isDark ? 'dark' : 'light'} />
  {state.routes.map((route, index) => (
    <JellyPressable accessibilityState={{ selected: isFocused }} scaleTo={motion.tabPressScale} style={styles.tabItem}>
```

**Source:** `apps/mobile/src/presentation/theme/layout.ts` lines 27-47
```typescript
export function floatingTabBarMetrics(inset: FloatingTabBarInsetInput): FloatingTabBarMetrics {
  const effectiveBottomInset: number = Math.max(getBottomInset(inset), tabBarLayout.minimumBottomInset);
  const bottomOffset: number = effectiveBottomInset + tabBarLayout.bottomGap;
  const contentPaddingBottom: number = bottomOffset + tabBarLayout.height + tabBarLayout.contentGap;
  return { bottomOffset, tabBarHeight: tabBarLayout.height, contentPaddingBottom };
}
```

**Apply to:** Home/settings tab screens and any scroll-content style changes. Do not reduce `screenContent.paddingBottom`.

### Bubble/Sorbet Primitives

**Source:** `apps/mobile/src/presentation/app/shared/index.ts` lines 1-11
```typescript
export * from './BubbleButton';
export * from './BubblePill';
export * from './BubbleSheet';
export * from './BubbleSurface';
export * from './BubbleToggle';
export * from './JellyPressable';
export * from './SorbetTabBar';
export * from './RouteScreen';
export * from './SorbetBackground';
```

**Button source:** `BubbleButton.tsx` lines 44-84
```typescript
export function BubbleButton({ disabled = false, selected = false, variant = 'primary', ...pressableProps }: BubbleButtonProps): ReactElement {
  const resolvedAccessibilityState: AccessibilityState = { ...accessibilityState, disabled, selected };
  const buttonStyle: ViewStyle = getButtonStyle(colors, variant, selected);
  return (
    <JellyPressable accessibilityState={resolvedAccessibilityState} disabled={disabled} scaleTo={disabled ? 1 : motion.pressScale} style={[styles.base, styles[variant], buttonStyle, disabled && styles.disabled, contentStyle]} />
  );
}
```

**Surface source:** `BubbleSurface.tsx` lines 36-55
```typescript
export function BubbleSurface({ children, colors, style, tone = 'neutral', variant = 'card' }: BubbleSurfaceProps): ReactElement {
  const surfaceStyle: ViewStyle = {
    backgroundColor: getSurfaceColor(colors, variant),
    borderColor: getToneBorderColor(colors, tone),
  };
  return <View style={[styles.base, styles[variant], surfaceStyle, style]}>{children}</View>;
}
```

**Pill source:** `BubblePill.tsx` lines 49-103
```typescript
export function BubblePill({ colors, disabled = false, onPress, selected = false, tone = 'neutral', ...pressableProps }: BubblePillProps): ReactElement {
  const resolvedStyle: ViewStyle = getPillStyle(colors, tone, selected);
  if (!onPress) {
    return <View style={style}>{pillContent}</View>;
  }
  return <JellyPressable accessibilityState={resolvedAccessibilityState} disabled={disabled} onPress={onPress} scaleTo={disabled ? 1 : motion.pressScale}>{pillContent}</JellyPressable>;
}
```

**Apply to:** Hero bubbles, mini-cards, setup segmented controls, status badges, account/sync row, action buttons.

### Theme Tokens And Motion

**Source:** `apps/mobile/src/presentation/theme/tokens.ts` lines 75-112, 190-197, 247-258, 282-298
```typescript
export const lightColors = {
  systemBlue: '#6e4df0',
  backgroundGradient: ['#fff4ec', '#ffecf2', '#f1ecff'],
  bubbleSurface: '#fffaf7',
  pillSelectedSurface: 'rgba(110, 77, 240, 0.14)',
} as const;

export const radii = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 } as const;
export const motion = { pressScale: 0.92, pressedOpacity: 0.80, tabPressScale: 0.88, selectedScale: 1.05 } as const;
export const shadows = { clay: { shadowColor: '#6e4df0', ... }, soft: { shadowColor: '#3a2f4a', ... } } as const;
```

**Apply to:** All Phase 2 visual changes. Avoid new hardcoded colors unless matching existing white-on-primary text patterns.

### Loading, Empty, Error, Offline, Disabled States

**Source:** `AuthGate.tsx` lines 20-32
```typescript
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
if (!session) return <AuthenticationScreen />;
```

**Source:** `DailySessionScreen.tsx` lines 539-557
```typescript
<View style={styles.offlineNotice}>
  <Text style={styles.stateMessageTitle}>{isOnline ? 'Ready for AI generation' : 'Offline mode'}</Text>
  <Text style={styles.secondaryText}>
    Episode generation requires Supabase Edge Functions and remains disabled while the device is offline.
  </Text>
</View>
<JellyPressable disabled={!isOnline} style={({ pressed }) => [styles.primaryButton, !isOnline && styles.disabledControl, pressed && styles.pressed]}>
```

**Source:** `DictionaryScreen.tsx` lines 226-270
```typescript
if (errorMessage) return <StateMessage message={errorMessage} styles={styles} />;
if (!isLoading && words.length === 0) return <StateMessage message="No vocabulary matches found." styles={styles} />;
```

**Apply to:** Home create/save/generate/delete states, setup modal validation, series details loading/error/read-only, settings sync/offline/failed status.

### Styles To Reuse Or Replace Carefully

**Source:** `MobileApp.styles.ts` lines 42-76, 95-99, 208-283, 389-456, 482-556, 958-1055
```typescript
authCard: { gap: 18, borderRadius: radii.xl, padding: 18, backgroundColor: colors.backgroundSecondary, ...shadows.soft },
screenContent: { gap: 18, padding: 20, paddingBottom: floatingTabContentPadding },
continueBanner: { gap: 10, borderRadius: radii.xl, padding: 20, backgroundColor: colors.systemBlue, ...shadows.clay },
emptySeriesPanel: { gap: 8, minHeight: 104, borderRadius: radii.xl, padding: 18, backgroundColor: colors.backgroundSecondary, ...shadows.soft },
seriesRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 104, paddingHorizontal: 14, paddingVertical: 14 },
settingsCard: { gap: 14, padding: 16, borderRadius: radii.xl, backgroundColor: colors.backgroundSecondary, ...shadows.soft },
goalChoice: { minWidth: 48, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.backgroundTertiary },
formInput: { minHeight: 50, borderRadius: radii.md, paddingHorizontal: 16, backgroundColor: colors.backgroundTertiary, color: colors.labelPrimary },
disabledControl: { opacity: 0.55 },
stateMessage: { alignItems: "center", gap: 6, padding: 36 },
tabBar: { position: "absolute", left: tabBarLayout.horizontalMargin, right: tabBarLayout.horizontalMargin, height: tabBarLayout.height, borderRadius: radii.pill },
```

**Apply to:** The planner should either reuse these style keys or plan a focused style extraction. Avoid expanding `MobileApp.styles.ts` into a larger god file if substantial new reusable chrome is needed; prefer existing primitive folders with `index.ts` exports.

## No Analog Found

None. Every Phase 2 target has an existing same-file analog and shared Phase 1 primitives.

## Planner Touchpoint Guidance

- Auth: likely touch `AuthenticationScreen.tsx` and auth style keys in `MobileApp.styles.ts`; preserve `AuthProvider`/`AuthGate`.
- Home: likely touch `HomeScreen.tsx`, perhaps introduce presentation-only subcomponents under a focused folder if the modal/cards become too large; preserve service calls and route callbacks.
- New series/setup: current duplicate create/edit setup patterns live in `HomeScreen.tsx` and `SeriesDetailsScreen.tsx`; planner may extract shared presentation-only setup controls if it reduces duplication without moving domain/application behavior.
- Series details: likely touch `SeriesDetailsScreen.tsx`; hide empty memory, strengthen continue/prep card, restyle episode rows.
- Settings: likely touch `SettingsScreen.tsx`; reorder sections learning-first, compact account/sync, keep manual sync and optimistic preference persistence.
- Navigation/tab bar: likely small/no code changes; verify `screenContent.paddingBottom` and `SorbetTabBar` still prevent overlap.
- Shared primitives: prefer `BubbleButton`, `BubblePill`, `BubbleSurface`, `BubbleSheet`, `BubbleToggle`, and `JellyPressable` from `apps/mobile/src/presentation/app/shared/index.ts`.

## Metadata

**Analog search scope:** `apps/mobile/app/**`, `apps/mobile/src/presentation/app/**`, `apps/mobile/src/presentation/theme/**`, `design/design_system_guidelines.md`, `design/bubble/*`
**Files scanned:** `rg --files apps/mobile/src apps/mobile/app` returned the current mobile app tree; targeted reads covered 15 files/modules.
**Pattern extraction date:** 2026-07-05
