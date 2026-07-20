import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// SelectableReaderTextStyles aligns visible copy and its transparent native layer.
type SelectableReaderTextStyles = {
  // container establishes the shared measurement and positioning context.
  readonly container: ViewStyle;
  // selectionInput occupies the exact visible text bounds without painting duplicate glyphs.
  readonly selectionInput: TextStyle;
  // visibleText keeps annotated Story Words above the transparent selection layer.
  readonly visibleText: TextStyle;
};

// selectableReaderTextStyles align the native selection layer with visible Reader copy.
export const selectableReaderTextStyles: SelectableReaderTextStyles =
  StyleSheet.create({
    container: {
      minWidth: 0,
      position: 'relative',
    },
    selectionInput: {
      backgroundColor: 'transparent',
      // Enlarged bounds keep UIKit's top and bottom grabbers inside the native view.
      bottom: -8,
      color: 'transparent',
      left: -6,
      margin: 0,
      // Matching padding preserves the visible text metrics inside the larger bounds.
      paddingHorizontal: 6,
      paddingVertical: 8,
      position: 'absolute',
      right: -6,
      textAlignVertical: 'top',
      top: -8,
    },
    visibleText: {
      position: 'relative',
      zIndex: 1,
    },
  });
