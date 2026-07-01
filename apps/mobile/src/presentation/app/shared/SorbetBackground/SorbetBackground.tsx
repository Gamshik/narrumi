import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppColors } from '@presentation/theme/tokens';

// SorbetBackgroundProps carries the active theme colors into the backdrop.
type SorbetBackgroundProps = {
  // colors provides the gradient stops and floating blob tints for the theme.
  readonly colors: AppColors;
};

// SorbetBackground renders the warm Sorbet gradient with soft floating blobs.
// It fills its parent and sits behind screen content, so parents must place it
// as the first child inside a relatively positioned container.
export function SorbetBackground({
  colors,
}: SorbetBackgroundProps): ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors.backgroundGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft blobs imitate the CSS blurred shapes; React Native has no blur
          filter, so large low-opacity circles approximate the same effect. */}
      <View
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: colors.blobGrape },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobRight,
          { backgroundColor: colors.blobBubblegum },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottom,
          { backgroundColor: colors.blobMint },
        ]}
      />
    </View>
  );
}

// styles positions the decorative blobs; sizes and offsets are tuned to keep
// color pooled near the corners without overpowering foreground content.
const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.16,
  },
  blobTop: { top: -130, left: -90 },
  blobRight: { top: 160, right: -140 },
  blobBottom: { bottom: -120, left: -60 },
});
