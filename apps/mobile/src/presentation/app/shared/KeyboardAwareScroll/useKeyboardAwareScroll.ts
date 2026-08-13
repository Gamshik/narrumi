import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { ScrollView } from 'react-native';

// This distance keeps focused inputs clear of the software keyboard.
const KEYBOARD_CLEARANCE: number = 24;

// This callback accepts the native input handle emitted by React Native focus events.
export type KeyboardFocusTargetHandler = (target: number) => void;

// This contract couples a scroll container ref with the handler used by its inputs.
export type KeyboardAwareScroll = {
  readonly scrollViewRef: RefObject<ScrollView | null>;
  readonly revealFocusedInput: KeyboardFocusTargetHandler;
};

// This hook exposes the shared native focus behavior used by ordinary form screens.
export function useKeyboardAwareScroll(): KeyboardAwareScroll {
  // This ref owns the native responder used by every ordinary focused input.
  const scrollViewRef: RefObject<ScrollView | null> =
    useRef<ScrollView>(null);

  // This handler asks React Native to reveal the exact native input that received focus.
  const revealFocusedInput: KeyboardFocusTargetHandler = useCallback(
    (target: number): void => {
      scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        target,
        KEYBOARD_CLEARANCE,
        true,
      );
    },
    [],
  );

  return { scrollViewRef, revealFocusedInput };
}
