import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { BubbleButton } from '../BubbleButton';
import { BubbleSheet } from '../BubbleSheet';
import { BubbleStatus } from '../BubbleStatus';
import { styles } from './DeleteConfirmationSheet.styles';

// DeleteConfirmationSheetProps describes reusable confirmation content around route-owned state.
type DeleteConfirmationSheetProps = {
  // closeAccessibilityLabel explains which pending deletion is cancelled by the sheet scrim.
  readonly closeAccessibilityLabel: string;
  // colors supplies the active light or dark Sorbet palette.
  readonly colors: AppColors;
  // errorMessage reports a failed local deletion without closing the route.
  readonly errorMessage: string | undefined;
  // isDeleting blocks repeated actions and selects pending button copy.
  readonly isDeleting: boolean;
  // isTargetValid disables confirmation when required route identity is absent.
  readonly isTargetValid: boolean;
  // message explains the exact data removed by this confirmation.
  readonly message: string;
  // title names the destructive operation in the shared sheet heading.
  readonly title: string;
  // onCancel closes the confirmation without changing local data.
  readonly onCancel: () => void;
  // onConfirm begins the route-owned deletion operation.
  readonly onConfirm: () => void;
};

// DeleteConfirmationSheet renders aligned controls for series and draft removal.
export function DeleteConfirmationSheet({
  closeAccessibilityLabel,
  colors,
  errorMessage,
  isDeleting,
  isTargetValid,
  message,
  title,
  onCancel,
  onConfirm,
}: DeleteConfirmationSheetProps): ReactElement {
  return (
    <BubbleSheet
      closeAccessibilityLabel={closeAccessibilityLabel}
      colors={colors}
      onClose={onCancel}
      title={title}
    >
      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.labelSecondary }]}>
          {message}
        </Text>
        {errorMessage ? (
          <BubbleStatus
            colors={colors}
            message={errorMessage}
            title="Could not delete"
            tone="error"
            variant="compact"
          />
        ) : null}
        <View style={styles.actions}>
          <BubbleButton
            colors={colors}
            disabled={isDeleting}
            onPress={onCancel}
            style={styles.action}
            variant="secondary"
          >
            <Text
              style={[styles.actionLabel, { color: colors.labelPrimary }]}
            >
              Cancel
            </Text>
          </BubbleButton>
          <BubbleButton
            colors={colors}
            disabled={isDeleting || !isTargetValid}
            onPress={onConfirm}
            style={styles.action}
            variant="danger"
          >
            <Text style={[styles.actionLabel, styles.dangerLabel]}>
              {isDeleting ? 'Deleting' : 'Delete'}
            </Text>
          </BubbleButton>
        </View>
      </View>
    </BubbleSheet>
  );
}
