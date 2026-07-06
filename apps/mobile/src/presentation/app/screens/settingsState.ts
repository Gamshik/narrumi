import type { BootstrapReadyState } from '../bootstrap/bootstrapState';

// SettingsWarning provides non-blocking display copy for recovery or sync issues.
export type SettingsWarning = {
  readonly title: string;
  readonly message?: string;
  readonly isError: boolean;
};

// getSettingsWarning maps the background bootstrap metadata into a surface warning.
export function getSettingsWarning(
  state: BootstrapReadyState,
): SettingsWarning | undefined {
  if (state.recovered) {
    return {
      title: 'Settings Recovered',
      message: 'Your preferences were reset because the local file was corrupted.',
      isError: true,
    };
  }

  if (state.syncStatus === 'failed') {
    return {
      title: 'Sync Failed',
      message: 'Your changes are saved locally but could not be backed up.',
      isError: true,
    };
  }

  if (state.syncStatus === 'offline') {
    return {
      title: 'Offline',
      message: 'Your changes are saved locally and will sync when you reconnect.',
      isError: false,
    };
  }

  return undefined;
}

// getSettingsSaveError maps a thrown persistence error into safe inline text.
export function getSettingsSaveError(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }
  return 'Unable to save settings. Changes were reverted.';
}
