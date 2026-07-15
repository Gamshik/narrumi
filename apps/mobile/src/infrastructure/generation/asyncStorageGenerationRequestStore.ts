import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GenerationRequestStore } from '@application/ports';

// GENERATION_REQUESTS_KEY owns retry identifiers that have no successful response yet.
const GENERATION_REQUESTS_KEY = '@context-english/generation-requests';

// GenerationRequestMap maps one canonical local operation to its stable request id.
type GenerationRequestMap = Readonly<Record<string, string>>;

// AsyncStorageGenerationRequestStore preserves idempotency after process restarts.
export class AsyncStorageGenerationRequestStore
  implements GenerationRequestStore
{
  // pendingMutation serializes read-modify-write cycles inside one app process.
  private pendingMutation: Promise<void> = Promise.resolve();

  // get waits for local writes before reading the current retry identifier.
  async get(operationKey: string): Promise<string | undefined> {
    await this.pendingMutation;

    return (await this.read())[operationKey];
  }

  // save persists the identifier before any network request can be sent.
  async save(operationKey: string, requestId: string): Promise<void> {
    await this.mutate((requests) => ({
      ...requests,
      [operationKey]: requestId,
    }));
  }

  // remove protects a newer retry identifier from a stale successful response.
  async remove(operationKey: string, requestId: string): Promise<void> {
    await this.mutate((requests) => {
      if (requests[operationKey] !== requestId) {
        return requests;
      }

      const nextRequests = { ...requests };
      delete nextRequests[operationKey];

      return nextRequests;
    });
  }

  // mutate serializes durable transformations and lets later work continue after errors.
  private async mutate(
    transform: (requests: GenerationRequestMap) => GenerationRequestMap,
  ): Promise<void> {
    const mutation = this.pendingMutation.then(async (): Promise<void> => {
      const requests = await this.read();

      await AsyncStorage.setItem(
        GENERATION_REQUESTS_KEY,
        JSON.stringify(transform(requests)),
      );
    });

    this.pendingMutation = mutation.catch((): void => undefined);
    await mutation;
  }

  // read validates AsyncStorage because local persistence is an external boundary.
  private async read(): Promise<GenerationRequestMap> {
    const rawValue = await AsyncStorage.getItem(GENERATION_REQUESTS_KEY);

    if (!rawValue) {
      return {};
    }

    try {
      const value: unknown = JSON.parse(rawValue);

      return parseGenerationRequests(value);
    } catch {
      return {};
    }
  }
}

// parseGenerationRequests drops malformed persisted entries instead of trusting JSON.
function parseGenerationRequests(value: unknown): GenerationRequestMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const requests: Record<string, string> = {};

  for (const [operationKey, requestId] of Object.entries(value)) {
    if (typeof requestId === 'string') {
      requests[operationKey] = requestId;
    }
  }

  return requests;
}
