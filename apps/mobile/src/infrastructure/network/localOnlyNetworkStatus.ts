import type { ConnectivityState, NetworkStatus } from '@application/ports';

// LocalOnlyNetworkStatus keeps server-only flows gated during the local MVP step.
export class LocalOnlyNetworkStatus implements NetworkStatus {
  // getCurrentState reports offline capability for generation until Edge Functions are wired.
  async getCurrentState(): Promise<ConnectivityState> {
    return { isOnline: false };
  }
}
