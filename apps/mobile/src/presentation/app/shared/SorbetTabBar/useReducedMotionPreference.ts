import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// useReducedMotionPreference mirrors the operating-system animation preference for navigation.
export function useReducedMotionPreference(): boolean {
  // reduceMotion defaults to true so startup never flashes an unapproved transition.
  const [reduceMotion, setReduceMotion] = useState<boolean>(true);

  useEffect((): (() => void) => {
    let isMounted = true;

    // updatePreference applies changes only while the consuming navigation tree is mounted.
    const updatePreference = (isEnabled: boolean): void => {
      if (isMounted) {
        setReduceMotion(isEnabled);
      }
    };

    void AccessibilityInfo.isReduceMotionEnabled().then(updatePreference);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      updatePreference,
    );

    return (): void => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
