import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { ScrollView } from 'react-native';

// KEYBOARD_CLEARANCE keeps the focused input visibly separated from the keyboard edge.
const KEYBOARD_CLEARANCE: number = 24;

// KeyboardFocusTargetHandler receives the native handle of the focused input.
export type KeyboardFocusTargetHandler = (target: number) => void;

// KeyboardAwareScroll exposes one scroll ref and the focus callback used by setup fields.
export type KeyboardAwareScroll = {
  // scrollViewRef connects the hook to the setup form's native scroll container.
  readonly scrollViewRef: RefObject<ScrollView | null>;
  // revealFocusedInput scrolls only as far as needed to clear the keyboard.
  readonly revealFocusedInput: KeyboardFocusTargetHandler;
};

// useKeyboardAwareScroll delegates nested field measurement to React Native's scroll responder.
export function useKeyboardAwareScroll(): KeyboardAwareScroll {
  // scrollViewRef owns the native responder that knows the keyboard and content coordinates.
  const scrollViewRef: RefObject<ScrollView | null> = useRef<ScrollView>(null);

  // revealFocusedInput avoids mixing offsets from different nested form containers.
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
