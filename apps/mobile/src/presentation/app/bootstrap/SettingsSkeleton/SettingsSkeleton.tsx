import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BubbleSurface } from '@presentation/app/shared/BubbleSurface';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import type { AppStyles } from '@presentation/app/types';

// SettingsSkeletonProps mirrors SettingsScreen shell props for stable route layout.
export type SettingsSkeletonProps = {
  // isDark selects the semantic color token set used for placeholder chrome.
  readonly isDark: boolean;
  // styles carries the route's shared spacing and typography contract.
  readonly styles: AppStyles;
};

// SettingsSkeleton approximates loaded Settings blocks while bootstrap data hydrates.
export function SettingsSkeleton({
  isDark,
  styles: appStyles,
}: SettingsSkeletonProps): ReactElement {
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <View style={appStyles.screenContent}>
      <View style={appStyles.homeHeader}>
        <Text style={appStyles.largeTitle}>Settings</Text>
      </View>

      <SkeletonSection
        colors={colors}
        label="LEARNING PREFERENCES"
        rows={[
          { primaryWidth: '48%', secondaryWidth: '14%', hasControl: true },
          { primaryWidth: '38%', secondaryWidth: '68%', hasControl: false },
        ]}
        styles={appStyles}
      />
      <SkeletonSection
        colors={colors}
        label="APPEARANCE"
        rows={[{ primaryWidth: '32%', secondaryWidth: '42%', hasToggle: true }]}
        styles={appStyles}
      />
      <SkeletonSection
        colors={colors}
        label="ACCOUNT & SYNC"
        rows={[
          { primaryWidth: '36%', secondaryWidth: '54%', hasControl: true },
          { primaryWidth: '88%', secondaryWidth: '62%', hasControl: false },
        ]}
        styles={appStyles}
      />
    </View>
  );
}

// SkeletonSection renders one settings card-shaped placeholder group.
function SkeletonSection({
  colors,
  label,
  rows,
  styles: appStyles,
}: {
  // colors provides theme-aware surfaces without hardcoding light mode.
  readonly colors: AppColors;
  // label preserves the loaded section rhythm during hydration.
  readonly label: string;
  // rows describes the placeholder blocks shown inside the card.
  readonly rows: readonly SkeletonRowSpec[];
  // styles carries the shared section label and card spacing contract.
  readonly styles: AppStyles;
}): ReactElement {
  return (
    <>
      <Text style={appStyles.sectionLabel}>{label}</Text>
      <BubbleSurface colors={colors} style={localStyles.card} variant="card">
        {rows.map((row, index) => (
          <SkeletonRow colors={colors} key={`${label}-${index}`} spec={row} />
        ))}
      </BubbleSurface>
    </>
  );
}

// SkeletonRowSpec defines placeholder proportions that mirror loaded settings rows.
type SkeletonRowSpec = {
  // primaryWidth approximates the title text width in the loaded row.
  readonly primaryWidth: `${number}%`;
  // secondaryWidth approximates description or value text width.
  readonly secondaryWidth: `${number}%`;
  // hasControl adds a trailing compact segmented/action placeholder.
  readonly hasControl?: boolean;
  // hasToggle adds a trailing switch-shaped placeholder.
  readonly hasToggle?: boolean;
};

// SkeletonRow renders a single placeholder row with optional trailing control shape.
function SkeletonRow({
  colors,
  spec,
}: {
  // colors provides semantic placeholder fill and border colors.
  readonly colors: AppColors;
  // spec keeps layout proportions explicit and stable.
  readonly spec: SkeletonRowSpec;
}): ReactElement {
  return (
    <View style={localStyles.row}>
      <View style={localStyles.textColumn}>
        <View
          style={[
            localStyles.line,
            {
              backgroundColor: colors.backgroundTertiary,
              width: spec.primaryWidth,
            },
          ]}
        />
        <View
          style={[
            localStyles.lineSmall,
            {
              backgroundColor: colors.separator,
              width: spec.secondaryWidth,
            },
          ]}
        />
      </View>
      {spec.hasToggle ? (
        <View style={[localStyles.toggle, { backgroundColor: colors.backgroundTertiary }]} />
      ) : null}
      {spec.hasControl ? (
        <View style={[localStyles.control, { backgroundColor: colors.backgroundTertiary }]} />
      ) : null}
    </View>
  );
}

// localStyles define placeholder geometry; theme colors are injected above.
const localStyles = StyleSheet.create({
  card: {
    gap: 16,
  },
  control: {
    borderRadius: 16,
    height: 32,
    width: 96,
  },
  line: {
    borderRadius: 6,
    height: 14,
  },
  lineSmall: {
    borderRadius: 5,
    height: 10,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    minHeight: 54,
  },
  textColumn: {
    flex: 1,
    gap: 8,
  },
  toggle: {
    borderRadius: 16,
    height: 32,
    width: 52,
  },
});
