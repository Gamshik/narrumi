import { BlurTargetView } from 'expo-blur';
import type { ReactElement, ReactNode, RefObject } from 'react';
import {
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// PlatformBlurTargetViewProps defines a scroll surface compatible with shared edge effects.
export type PlatformBlurTargetViewProps = {
  // blurTargetRef preserves the native view contract used by shared edge-effect callers.
  readonly blurTargetRef: RefObject<View | null>;
  // children are the route or modal contents rendered without layout changes.
  readonly children: ReactNode;
  // style preserves the caller-owned layout contract for the target surface.
  readonly style?: StyleProp<ViewStyle>;
};

// PlatformBlurTargetView avoids Android's expensive blur-capture surface and its compositing artifacts.
export function PlatformBlurTargetView({
  blurTargetRef,
  children,
  style,
}: PlatformBlurTargetViewProps): ReactElement {
  if (Platform.OS === 'android') {
    return (
      <View ref={blurTargetRef} style={style}>
        {children}
      </View>
    );
  }

  return (
    <BlurTargetView ref={blurTargetRef} style={style}>
      {children}
    </BlurTargetView>
  );
}
