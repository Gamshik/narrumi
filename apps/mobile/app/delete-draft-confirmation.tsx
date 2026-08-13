import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { DeleteConfirmationSheet, useAppTheme } from '@presentation/app';
import { localAppServices } from '@presentation/app/services/localAppServices';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

// DeleteDraftConfirmationParams carries the route-owned local draft target.
type DeleteDraftConfirmationParams = {
  // draftId identifies the exact setup snapshot to remove.
  readonly draftId?: string;
  // title is display-only copy passed from the already-loaded draft row.
  readonly title?: string;
};

// DeleteDraftConfirmationRoute confirms removal of only one unfinished local setup.
export default function DeleteDraftConfirmationRoute(): ReactElement {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { draftId, title } =
    useLocalSearchParams<DeleteDraftConfirmationParams>();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  // colors resolves active tokens for the shared sheet and controls.
  const colors: AppColors = isDark ? darkColors : lightColors;

  // closeSheet returns to Home without changing any saved draft.
  const closeSheet = (): void => {
    router.back();
  };

  // confirmDelete removes exactly the route-selected draft and preserves all others.
  const confirmDelete = async (): Promise<void> => {
    if (!draftId || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(undefined);

    try {
      await localAppServices.deleteSeriesSetupDraft.execute({ draftId });
      router.back();
    } catch {
      setErrorMessage('Draft could not be deleted.');
      setIsDeleting(false);
    }
  };

  return (
    <DeleteConfirmationSheet
      closeAccessibilityLabel="Cancel draft deletion"
      colors={colors}
      errorMessage={errorMessage}
      isDeleting={isDeleting}
      isTargetValid={Boolean(draftId)}
      message={`This removes ${title ? `"${title}"` : 'this draft'} from this device. Your other drafts remain available.`}
      onCancel={closeSheet}
      onConfirm={(): void => {
        void confirmDelete();
      }}
      title="Delete draft?"
    />
  );
}
