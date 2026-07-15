// GenerationRequestStore keeps retry identifiers durable across app restarts.
export type GenerationRequestStore = {
  // get returns the unfinished request identifier for one logical operation.
  readonly get: (operationKey: string) => Promise<string | undefined>;
  // save records the identifier before the remote generation begins.
  readonly save: (operationKey: string, requestId: string) => Promise<void>;
  // remove clears only the identifier acknowledged by a successful response.
  readonly remove: (operationKey: string, requestId: string) => Promise<void>;
};
