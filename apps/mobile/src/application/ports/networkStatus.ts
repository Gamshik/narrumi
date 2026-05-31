export type ConnectivityState = {
  readonly isOnline: boolean;
};

export type NetworkStatus = {
  readonly getCurrentState: () => Promise<ConnectivityState>;
};
