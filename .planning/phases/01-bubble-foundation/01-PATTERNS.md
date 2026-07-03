# Phase 01: Bubble Foundation - Pattern Map

**Mapped:** 2026-07-03  
**Files analyzed:** 9  
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/src/presentation/theme/tokens.ts` | config | transform | `apps/mobile/src/presentation/theme/tokens.ts` | exact |
| `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` | component | event-driven | `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` | exact |
| `apps/mobile/src/presentation/app/MobileApp.styles.ts` | config | transform | `apps/mobile/src/presentation/app/MobileApp.styles.ts` | exact |
| `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx` | component | event-driven | `apps/mobile/src/presentation/app/shared/BubblePill/BubblePill.tsx` | role-match |
| `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts` | config | transform | `apps/mobile/src/presentation/app/shared/BubbleButton/index.ts` | exact |
| `apps/mobile/src/presentation/app/shared/index.ts` | config | transform | `apps/mobile/src/presentation/app/shared/index.ts` | exact |
| `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` | component | event-driven | `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` | exact |
| `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` | component | request-response | `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` | role-match |
| `apps/mobile/app/_layout.tsx` | route | request-response | `apps/mobile/app/_layout.tsx` | exact |

## Pattern Assignments

### `apps/mobile/src/presentation/theme/tokens.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/theme/tokens.ts`

**Semantic color token pattern** (lines 41-72):
```typescript
  // tabBarSurface is the translucent fill layered over the floating tab bar blur.
  readonly tabBarSurface: string;
  // tabBarBorder is the soft highlight hairline around the floating tab bar.
  readonly tabBarBorder: string;
  // bubbleSurface is the default raised Bubble/Sorbet surface fill.
  readonly bubbleSurface: string;
  // bubbleSurfaceMuted is the lower-emphasis surface fill for quiet panels.
  readonly bubbleSurfaceMuted: string;
  // bubbleSurfaceRaised is the strongest floating surface fill for hero bubbles.
  readonly bubbleSurfaceRaised: string;
  // bubbleBorder is the soft outline used around reusable bubble surfaces.
  readonly bubbleBorder: string;
  // sheetSurface is the elevated bottom-sheet fill layered over blur.
  readonly sheetSurface: string;
  // sheetBorder is the visible sheet edge that keeps glass surfaces legible.
  readonly sheetBorder: string;
  // sheetScrim is the dimming overlay behind modal sheet surfaces.
  readonly sheetScrim: string;
  // pillSurface is the default background for unselected pill controls.
  readonly pillSurface: string;
  // pillSelectedSurface is the background for selected pill controls.
  readonly pillSelectedSurface: string;
  // pillBorder is the outline that separates pills from soft backgrounds.
  readonly pillBorder: string;
  // badgeNeutralSurface is the low-emphasis badge fill for metadata.
  readonly badgeNeutralSurface: string;
  // badgeAccentSurface is the branded badge fill for active learning states.
  readonly badgeAccentSurface: string;
  // badgeSuccessSurface is the badge fill for positive or synced states.
  readonly badgeSuccessSurface: string;
  // badgeWarningSurface is the badge fill for warning or offline states.
  readonly badgeWarningSurface: string;
```

**Motion token pattern** (lines 225-249):
```typescript
// AppMotionTokens defines reusable minimal motion values for Bubble controls.
type AppMotionTokens = {
  // pressScale is the standard scale applied while primary controls are pressed.
  readonly pressScale: number;
  // tabPressScale is the stronger press scale used by compact tab items.
  readonly tabPressScale: number;
  // selectedScale is the subtle lift applied to selected controls and tabs.
  readonly selectedScale: number;
  // sheetEnterScale is the starting scale for soft sheet entrance motion.
  readonly sheetEnterScale: number;
  // springSpeed is the shared React Native spring speed for tactile feedback.
  readonly springSpeed: number;
  // springBounciness keeps press motion soft without distracting bounce.
  readonly springBounciness: number;
};

// motion stores spring-like constants shared by pressable and selected states.
export const motion: AppMotionTokens = {
  pressScale: 0.96,
  tabPressScale: 0.88,
  selectedScale: 1.05,
  sheetEnterScale: 0.98,
  springSpeed: 45,
  springBounciness: 0,
} as const;
```

**Apply:** Strengthen shared press feedback here first. If adding press opacity or toggle track/thumb tokens, add explicit typed token fields with English comments and mirrored light/dark values.

---

### `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx` (component, event-driven)

**Analog:** `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`

**Imports and prop contract** (lines 1-20):
```typescript
import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// JellyPressableProps extends Pressable with the claymorphic squish controls.
type JellyPressableProps = PressableProps & {
  // children is the pressable content (text, icons, nested views).
  readonly children: PressableProps['children'];
  // containerStyle layouts the animated wrapper (use for flex/alignSelf in rows).
  readonly containerStyle?: StyleProp<ViewStyle>;
  // scaleTo is the pressed-down scale target; smaller means a deeper squish.
  readonly scaleTo?: number;
};
```

**Core press animation pattern** (lines 38-58):
```typescript
  // handlePressIn squishes the surface immediately when the finger lands.
  const handlePressIn = (event: GestureResponderEvent): void => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 45,
      bounciness: 0,
    }).start();
    onPressIn?.(event);
  };

  // handlePressOut releases the surface with a gentle jelly rebound.
  const handlePressOut = (event: GestureResponderEvent): void => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 14,
    }).start();
    onPressOut?.(event);
  };
```

**Render pattern preserving Pressable semantics** (lines 60-69):
```typescript
  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...pressableProps}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
```

**Apply:** Keep `Animated.View` as the transform wrapper and keep all `PressableProps` forwarding. Make tactile feedback stronger by adjusting defaults/tokens and, if needed, adding a visible pressed opacity/style path without layout-affecting animation.

---

### `apps/mobile/src/presentation/app/MobileApp.styles.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/app/MobileApp.styles.ts`

**Theme import pattern** (lines 1-13):
```typescript
import { StyleSheet } from "react-native";

import type { AppColors } from "@presentation/theme/tokens";
import {
  fontFamilies,
  getFloatingTabBarContentPadding,
  radii,
  shadows,
  tabBarLayout,
} from "@presentation/theme";

// floatingTabContentPadding is the shared no-inset baseline for tab-safe scroll endings.
const floatingTabContentPadding: number = getFloatingTabBarContentPadding(0);
```

**Shared pressed style currently too subtle** (lines 380-387):
```typescript
    actionTitle: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.display,
      fontSize: 15,
      marginBottom: 3,
    },
    rowChevron: { color: colors.labelTertiary, fontSize: 28 },
    pressed: { opacity: 0.92 },
```

**Settings row/card pattern for custom toggle styles** (lines 388-410):
```typescript
    settingsCard: {
      gap: 14,
      padding: 16,
      borderRadius: radii.xl,
      backgroundColor: colors.backgroundSecondary,
      ...shadows.soft,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    settingValue: {
      overflow: "hidden",
      borderRadius: 99,
      backgroundColor: `${colors.systemBlue}1f`,
      color: colors.systemBlue,
```

**Dictionary sheet content bug source** (lines 960-966):
```typescript
    sheetContent: {
      flex: 1,
      gap: 12,
      padding: 20,
      paddingBottom: 0,
      backgroundColor: colors.backgroundSecondary,
    },
```

**Apply:** Either remove `flex: 1` from `sheetContent` if no full-height sheet still needs it, or create a separate content-sized dictionary style and use that in `DictionaryWordDetailsSheet`. Add custom toggle track/thumb/text styles here only if the toggle stays local to settings; shared toggle visual chrome should live in `BubbleToggle`.

---

### `apps/mobile/src/presentation/app/shared/BubbleToggle/BubbleToggle.tsx` (component, event-driven)

**Analog:** `apps/mobile/src/presentation/app/shared/BubblePill/BubblePill.tsx`

**Imports pattern** (lines 1-18):
```typescript
import type { ReactNode, ReactElement } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityState,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  motion,
  radii,
  spacing,
  type AppColors,
} from '@presentation/theme';

import { JellyPressable } from '../JellyPressable';
```

**Typed prop contract pattern** (lines 28-47):
```typescript
// BubblePillProps supports passive badges and optional tactile chip behavior.
export type BubblePillProps = Omit<
  PressableProps,
  'children' | 'disabled' | 'style'
> & {
  // children is caller-owned label or icon content rendered inside the pill.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // tone selects the semantic visual role without parsing product data.
  readonly tone?: BubblePillTone;
  // selected marks the pill as active while callers retain selection rules.
  readonly selected?: boolean;
  // disabled blocks press behavior and exposes inactive accessibility state.
  readonly disabled?: boolean;
  // style positions the outer pill without duplicating tokenized chrome.
  readonly style?: StyleProp<ViewStyle>;
  // contentStyle customizes inner layout for label and icon combinations.
  readonly contentStyle?: StyleProp<ViewStyle>;
};
```

**Accessibility and pressable pattern** (lines 63-101):
```typescript
  // resolvedStyle combines theme-aware tone, selected, and disabled visual states.
  const resolvedStyle: ViewStyle = getPillStyle(colors, tone, selected);
  // resolvedAccessibilityState keeps pressable chip state visible to assistive tech.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    disabled,
    selected,
  };

  return (
    <JellyPressable
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      onPress={onPress}
      scaleTo={disabled ? 1 : motion.pressScale}
      containerStyle={style}
      {...pressableProps}
    >
      {pillContent}
    </JellyPressable>
  );
```

**Apply:** New `BubbleToggle` should accept `colors`, `value`, `onValueChange`, optional `disabled`, and Pressable accessibility props. Render a themed track/thumb using semantic tokens, call `onValueChange(!value)` from `onPress`, set `accessibilityRole="switch"`, and set `accessibilityState={{ checked: value, disabled }}`.

---

### `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/app/shared/BubbleSheet/index.ts`

**Barrel pattern** (line 1):
```typescript
export * from './BubbleSheet';
```

**Apply:** Create `apps/mobile/src/presentation/app/shared/BubbleToggle/index.ts` with `export * from './BubbleToggle';`.

---

### `apps/mobile/src/presentation/app/shared/index.ts` (config, transform)

**Analog:** `apps/mobile/src/presentation/app/shared/index.ts`

**Shared public export pattern** (lines 1-10):
```typescript
export * from './BubbleButton';
export * from './BubblePill';
export * from './BubbleSheet';
export * from './BubbleSurface';
export * from './DictionaryWordDetailsSheet';
export * from './JellyPressable';
export * from './LevelBadge';
export * from './SorbetTabBar';
export * from './RouteScreen';
export * from './SorbetBackground';
```

**Apply:** Add `export * from './BubbleToggle';` near other Bubble primitives so settings and later screens import through the public shared barrel.

---

### `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx` (component, event-driven)

**Analog:** `apps/mobile/src/presentation/app/screens/SettingsScreen.tsx`

**Current native Switch import to replace** (lines 1-5):
```typescript
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { JellyPressable } from '../shared';
```

**Appearance section currently using native control** (lines 275-294):
```typescript
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
```

**Existing local pressable settings controls** (lines 245-269):
```typescript
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
```

**Apply:** Remove `Switch` from imports. Import `BubbleToggle` from `../shared` if shared, or use `JellyPressable` if local. Keep `Appearance` backed by `useAppTheme()` and `setDarkMode`; do not add new persistence logic because `ThemeProvider` already owns it.

---

### `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` (component, request-response)

**Analog:** `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` plus `BubbleSheet.tsx`

**Route-owned content contract** (lines 10-18):
```typescript
// DictionaryWordDetailsSheetProps defines the native sheet content contract.
type DictionaryWordDetailsSheetProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is undefined when a route id cannot be resolved from the local catalog.
  readonly word: VocabularyItem | undefined;
  // onClose dismisses the native form sheet route.
  readonly onClose: () => void;
};
```

**Current sheet content using flex-expanding global style** (lines 29-68):
```typescript
  if (!word) {
    return (
      <BubbleSheet
        closeAccessibilityLabel="Close dictionary details"
        colors={colors}
        onClose={onClose}
        showScrim={false}
        title="Dictionary"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.stateMessageTitle}>Word not found.</Text>
        </View>
      </BubbleSheet>
    );
  }

  return (
    <BubbleSheet
      closeAccessibilityLabel="Close dictionary details"
      colors={colors}
      onClose={onClose}
      showScrim={false}
      title={word.word}
    >
      <View style={styles.sheetContent}>
```

**BubbleSheet caller-owned content style hook** (BubbleSheet lines 21-38, 94):
```typescript
export type BubbleSheetProps = {
  // children is caller-owned sheet content; this component renders chrome only.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // title optionally labels the sheet frame for visible and accessible context.
  readonly title?: string;
  // onClose optionally renders a close affordance without owning modal state.
  readonly onClose?: () => void;
  // closeAccessibilityLabel describes the close control for assistive tech.
  readonly closeAccessibilityLabel?: string;
  // showScrim controls whether the frame includes a dimmed modal backdrop.
  readonly showScrim?: boolean;
  // style positions the outer sheet wrapper within a caller-owned modal route.
  readonly style?: StyleProp<ViewStyle>;
  // contentStyle lets callers tune spacing inside the reusable sheet surface.
  readonly contentStyle?: StyleProp<ViewStyle>;
};

<View style={[styles.content, contentStyle]}>{children}</View>
```

**Apply:** Use a non-flex content style for dictionary details. Prefer a dedicated `styles.dictionarySheetContent` or a local `StyleSheet` in `DictionaryWordDetailsSheet` that does not set `flex: 1`. Keep `BubbleSheet` presentation-only and keep the route close callback unchanged.

---

### `apps/mobile/app/_layout.tsx` (route, request-response)

**Analog:** `apps/mobile/app/_layout.tsx`

**Native form sheet route pattern** (lines 59-70):
```typescript
              <Stack.Screen
                name="dictionary-word-details"
                options={{
                  contentStyle: { backgroundColor: sheetBackgroundColor },
                  headerShown: false,
                  presentation: 'formSheet',
                  // The sheet height must follow dictionary content; fixed detents
                  // either leave empty space or clip words with longer examples.
                  sheetAllowedDetents: 'fitToContents',
                  sheetCornerRadius: 28,
                  sheetGrabberVisible: true,
                }}
              />
```

**Apply:** Preserve `sheetAllowedDetents: 'fitToContents'` unless the content-sizing fix is insufficient on device. The known bug is caused by flex expansion inside the sheet content, so route changes should be a fallback, not the first move.

## Shared Patterns

### Theme Resolution
**Source:** `apps/mobile/src/presentation/app/shared/DictionaryWordDetailsSheet.tsx` lines 72-79  
**Apply to:** `BubbleToggle` if it needs active colors inside `SettingsScreen` without changing the settings prop contract.
```typescript
// resolveColorsFromStyles preserves the sheet props while feeding BubbleSheet tokens.
function resolveColorsFromStyles(styles: AppStyles): AppColors {
  const safeAreaStyle = StyleSheet.flatten(styles.safeArea);

  return safeAreaStyle.backgroundColor === darkColors.backgroundPrimary
    ? darkColors
    : lightColors;
}
```

### Accessibility State Forwarding
**Source:** `apps/mobile/src/presentation/app/shared/BubbleButton/BubbleButton.tsx` lines 57-62  
**Apply to:** `BubbleToggle`, `BubblePill`, any stronger press wrapper.
```typescript
  // resolvedAccessibilityState ensures disabled and selected controls are announced.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    disabled,
    selected,
  };
```

### Presentation-Only Boundaries
**Source:** `apps/mobile/src/presentation/app/shared/BubbleSheet/BubbleSheet.tsx` lines 21-24  
**Apply to:** `BubbleToggle`, sheet sizing fix, stronger tactile feedback.
```typescript
// BubbleSheetProps is the public frame contract for bottom-sheet presentation.
export type BubbleSheetProps = {
  // children is caller-owned sheet content; this component renders chrome only.
  readonly children: ReactNode;
```

### Public Barrel Exports
**Source:** `apps/mobile/src/presentation/app/shared/index.ts` lines 1-10  
**Apply to:** any new shared primitive folder.
```typescript
export * from './BubbleButton';
export * from './BubblePill';
export * from './BubbleSheet';
export * from './BubbleSurface';
export * from './DictionaryWordDetailsSheet';
export * from './JellyPressable';
export * from './LevelBadge';
export * from './SorbetTabBar';
export * from './RouteScreen';
export * from './SorbetBackground';
```

## No Analog Found

None. Every likely Phase 1 gap file has a close presentation-layer analog in the current codebase.

## Metadata

**Analog search scope:** `apps/mobile/src/presentation`, `apps/mobile/app`, phase artifacts under `.planning/phases/01-bubble-foundation`  
**Files scanned:** 20+ focused source/artifact files via `rg` and line-numbered reads  
**Pattern extraction date:** 2026-07-03  
**Verification commands identified:** from `apps/mobile/package.json`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`  
**Verification note:** Pattern mapping changed only this planning artifact; mobile lint/typecheck/build/test are for the downstream implementation phase.
