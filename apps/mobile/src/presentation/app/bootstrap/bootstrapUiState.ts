import type { BootstrapState } from './bootstrapState';

// BootstrapUiContent provides the display copy for a blocked bootstrap state.
export type BootstrapUiContent = {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly isError: boolean;
};

// getBootstrapUiContent maps hydration and error states to calm, safe display copy.
// It must only be called when the bootstrap state is NOT ready.
export function getBootstrapUiContent(state: BootstrapState): BootstrapUiContent {
  if (state.kind === 'ready') {
    throw new Error(
      'getBootstrapUiContent must not be called when bootstrap is ready.',
    );
  }

  if (state.kind === 'failed') {
    return {
      title: 'Unable to load session',
      subtitle: 'Please try again to continue learning.',
      isError: true,
    };
  }

  return {
    title: 'Preparing your session...',
    subtitle: undefined,
    isError: false,
  };
}
