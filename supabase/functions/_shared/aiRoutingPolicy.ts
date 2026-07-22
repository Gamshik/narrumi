// AiProviderRoutingPolicy is the privacy and capability contract sent to OpenRouter.
export type AiProviderRoutingPolicy = {
  // allow_fallbacks lets OpenRouter recover from an unavailable infrastructure provider.
  readonly allow_fallbacks: true;
  // data_collection excludes providers that may train on or retain prompts for collection.
  readonly data_collection: 'deny';
  // require_parameters prevents providers from silently ignoring structured-output settings.
  readonly require_parameters: true;
  // zdr is present only after the operator explicitly enables compatible ZDR routing.
  readonly zdr?: true;
};

// isEnabledFlag accepts only an explicit true value for restrictive optional features.
export function isEnabledFlag(value: string | undefined): boolean {
  return value?.trim().toLocaleLowerCase() === 'true';
}

// readBoundedTimeout keeps one upstream request inside the Edge Function idle budget.
export function readBoundedTimeout(
  value: string | undefined,
  fallbackMs: number,
): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackMs;
  }

  return Math.min(Math.max(Math.round(parsedValue), 5_000), 60_000);
}

// createAiProviderRoutingPolicy keeps ZDR opt-in so missing account routes cannot block AI.
export function createAiProviderRoutingPolicy(
  requireZdr: boolean,
): AiProviderRoutingPolicy {
  return {
    allow_fallbacks: true,
    data_collection: 'deny',
    require_parameters: true,
    ...(requireZdr ? { zdr: true } : {}),
  };
}
