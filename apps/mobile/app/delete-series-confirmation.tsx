import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
  DeleteConfirmationSheet,
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
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
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
    <DeleteConfirmationSheet
      closeAccessibilityLabel="Cancel series deletion"
      colors={colors}
      errorMessage={errorMessage}
      isDeleting={isDeleting}
      isTargetValid={Boolean(seriesId)}
      message={`This removes ${title ? `"${title}"` : 'this series'} and its saved episodes from this device.`}
      onCancel={closeSheet}
      onConfirm={(): void => {
        void confirmDelete();
      }}
      title="Delete series?"
    />
  );
}
