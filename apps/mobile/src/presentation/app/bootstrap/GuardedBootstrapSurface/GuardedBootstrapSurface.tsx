import React from 'react';

import type { BootstrapState } from '../bootstrapState';
import { BootstrapScreen } from '../BootstrapScreen';

export type GuardedBootstrapSurfaceProps = {
  readonly state: BootstrapState;
  readonly onRetry: () => void;
};

// GuardedBootstrapSurface handles the loading and error states for screens that require bootstrap data.
export function GuardedBootstrapSurface({
  state,
  onRetry,
}: GuardedBootstrapSurfaceProps): React.ReactElement {
  if (state.kind === 'ready') {
    throw new Error(
      'GuardedBootstrapSurface must not be rendered when bootstrap is ready.',
    );
  }

  return <BootstrapScreen onRetry={onRetry} state={state} />;
}
