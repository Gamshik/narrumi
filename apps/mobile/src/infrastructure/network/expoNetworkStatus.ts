import * as Network from 'expo-network';

import type { ConnectivityState, NetworkStatus } from '@application/ports';

// ExpoNetworkStatus reports real device connectivity for server-only flows.
export class ExpoNetworkStatus implements NetworkStatus {
  // getCurrentState maps Expo Network state to the application connectivity contract.
  async getCurrentState(): Promise<ConnectivityState> {
    const state = await Network.getNetworkStateAsync();

    return {
      isOnline: state.isConnected === true && state.isInternetReachable !== false,
    };
  }
}
