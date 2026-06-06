import type { ReactElement } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import type { TranslationAnnotation } from '@domain/index';

import type { AppStyles } from '../../../../types';

// TranslationSheetProps controls the inline translation bottom sheet.
type TranslationSheetProps = {
  // annotation is the selected inline hint; undefined keeps the sheet hidden.
  readonly annotation: TranslationAnnotation | undefined;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onClose clears the selected annotation.
  readonly onClose: () => void;
};

// TranslationSheet shows context-aware translation without leaving the reader.
export function TranslationSheet({
  annotation,
  styles,
  onClose,
}: TranslationSheetProps): ReactElement {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={annotation !== undefined}
      onRequestClose={onClose}
    >
      <Pressable style={styles.readerSheetScrim} onPress={onClose}>
        <Pressable style={styles.readerTranslationSheet}>
          <View style={styles.readerSheetHandle} />
          <Text style={styles.translationSurface}>{annotation?.surfaceText}</Text>
          <Text style={styles.translationText}>{annotation?.translation}</Text>
          {annotation?.transcription ? (
            <Text style={styles.phonetics}>{annotation.transcription}</Text>
          ) : null}
          <Text style={styles.secondaryText}>
            Context-aware hint from the validated episode payload.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
