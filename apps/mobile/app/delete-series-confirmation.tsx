import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import {
  BubbleButton,
  BubbleSheet,
  BubbleStatus,
  useAppTheme,
} from '@presentation/app';
import { localAppServices } from '@presentation/app/services/localAppServices';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

// DeleteSeriesConfirmationParams carries the route-owned deletion target.
type DeleteSeriesConfirmationParams = {
  // seriesId identifies the local series to delete.
  readonly seriesId?: string;
  // title is display-only copy passed from the already-loaded home list.
  readonly title?: string;
};

// DeleteSeriesConfirmationRoute renders delete approval as the same transparent sheet route as dictionary details.
export default function DeleteSeriesConfirmationRoute(): ReactElement {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { seriesId, title } =
    useLocalSearchParams<DeleteSeriesConfirmationParams>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  // colors resolves the active theme tokens for the shared sheet and controls.
  const colors: AppColors = isDark ? darkColors : lightColors;

  const closeSheet = (): void => {
    router.back();
  };

  const confirmDelete = async (): Promise<void> => {
    if (!seriesId || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(undefined);

    try {
      await localAppServices.deleteSeries.execute({ seriesId });
      router.back();
    } catch {
      setErrorMessage('Series could not be deleted.');
      setIsDeleting(false);
    }
  };

  return (
    <BubbleSheet
      closeAccessibilityLabel="Cancel series deletion"
      colors={colors}
      onClose={closeSheet}
      title="Delete series?"
    >
      <View style={{ gap: 14 }}>
        <Text
          style={{
            color: colors.labelSecondary,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          This removes {title ? `"${title}"` : 'this series'} and its saved episodes from this device.
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BubbleButton
            colors={colors}
            disabled={isDeleting}
            onPress={closeSheet}
            variant="secondary"
            style={{ flex: 1 }}
          >
            <Text
              style={{
                color: colors.labelPrimary,
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Cancel
            </Text>
          </BubbleButton>
          <BubbleButton
            colors={colors}
            disabled={isDeleting || !seriesId}
            onPress={() => {
              void confirmDelete();
            }}
            variant="danger"
            style={{ flex: 1 }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontWeight: '900',
              }}
            >
              {isDeleting ? 'Deleting' : 'Delete'}
            </Text>
          </BubbleButton>
        </View>
      </View>
    </BubbleSheet>
  );
}
