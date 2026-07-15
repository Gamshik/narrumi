// generationRequestSequence separates operations created within the same millisecond.
let generationRequestSequence: number = 0;

// createGenerationRequestId creates a retry-stable token without treating it as a secret.
export function createGenerationRequestId(scope: string, now: Date): string {
  generationRequestSequence = (generationRequestSequence + 1) % 1_000_000;

  return `generation:${encodeURIComponent(scope)}:${now.getTime()}:${generationRequestSequence}`;
}

// createGenerationOperationKey identifies equivalent visible input across retries.
export function createGenerationOperationKey(
  scope: string,
  input: unknown,
): string {
  return `${scope}:${canonicalizeGenerationInput(input)}`;
}

// canonicalizeGenerationInput removes object key-order differences from local lookup keys.
function canonicalizeGenerationInput(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeGenerationInput).join(',')}]`;
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map(
        (key): string =>
          `${JSON.stringify(key)}:${canonicalizeGenerationInput(record[key])}`,
      );

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value) ?? 'undefined';
}
