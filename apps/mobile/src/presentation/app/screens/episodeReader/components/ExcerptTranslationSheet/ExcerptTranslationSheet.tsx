import type { ReactElement } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { BubbleSheet } from '@presentation/app/shared';
import { useAppTheme } from '@presentation/app/theme';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import { excerptTranslationSheetStyles as styles } from './ExcerptTranslationSheet.styles';

// ExcerptTranslationResult stores the completed source and plain Russian result.
export type ExcerptTranslationResult = {
  // sourceText preserves what the learner selected beside the completed result.
  readonly sourceText: string;
  // translation is the validated plain Russian model response.
  readonly translation: string;
};

// ExcerptTranslationSheetProps controls the selected-text result drawer.
type ExcerptTranslationSheetProps = {
  // result is undefined while the selected-text drawer is hidden.
  readonly result: ExcerptTranslationResult | undefined;
  // onClose clears the completed translation result.
  readonly onClose: () => void;
};

// ExcerptTranslationSheet pairs the exact selected source with its Russian result.
export function ExcerptTranslationSheet({
  onClose,
  result,
}: ExcerptTranslationSheetProps): ReactElement | null {
  const { isDark } = useAppTheme();
  // colors keeps selected-text translation aligned with existing Reader sheets.
  const colors: AppColors = isDark ? darkColors : lightColors;

  if (!result) {
    return null;
  }

  // sourceSurfaceColor marks the learner's selection as the translation input.
  const sourceSurfaceColor: ViewStyle = {
    backgroundColor: colors.pillSelectedSurface,
    borderColor: colors.pillBorder,
  };
  // sourceTextColor keeps source hierarchy below the larger Russian result.
  const sourceTextColor: TextStyle = { color: colors.labelSecondary };
  // labelColor keeps mapping labels quiet and functional.
  const labelColor: TextStyle = { color: colors.labelTertiary };
  // connectorLineColor visually links source and result without explanatory copy.
  const connectorLineColor: ViewStyle = { backgroundColor: colors.separator };
  // connectorBadgeColor uses a restrained grape transition marker.
  const connectorBadgeColor: ViewStyle = {
    backgroundColor: colors.badgeAccentSurface,
    borderColor: colors.pillBorder,
  };
  // connectorGlyphColor carries the brand accent inside the mapping marker.
  const connectorGlyphColor: TextStyle = { color: colors.systemBlue };
  // translationTextColor provides maximum contrast for the requested result.
  const translationTextColor: TextStyle = { color: colors.labelPrimary };

  return (
    <BubbleSheet
      closeAccessibilityLabel="Close selected text translation"
      colors={colors}
      onClose={onClose}
      style={styles.overlay}
      title="Translation"
    >
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, labelColor]}>SELECTED TEXT</Text>
          <View style={[styles.sourceSurface, sourceSurfaceColor]}>
            <Text selectable style={[styles.sourceText, sourceTextColor]}>
              {result.sourceText}
            </Text>
          </View>
        </View>

        <View accessible={false} style={styles.connectorRow}>
          <View style={[styles.connectorLine, connectorLineColor]} />
          <View style={[styles.connectorBadge, connectorBadgeColor]}>
            <Text style={[styles.connectorGlyph, connectorGlyphColor]}>↓</Text>
          </View>
          <View style={[styles.connectorLine, connectorLineColor]} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, labelColor]}>RUSSIAN</Text>
          <Text selectable style={[styles.translationText, translationTextColor]}>
            {result.translation}
          </Text>
        </View>
      </View>
    </BubbleSheet>
  );
}
