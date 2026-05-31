// ConnectivityState is the minimal network snapshot needed by offline-first flows.
export type ConnectivityState = {
  // isOnline tells use cases whether server-backed features may be attempted.
  readonly isOnline: boolean;
};

// NetworkStatus abstracts platform connectivity APIs away from application code.
export type NetworkStatus = {
  // getCurrentState returns the latest known connectivity state on demand.
  readonly getCurrentState: () => Promise<ConnectivityState>;
};
