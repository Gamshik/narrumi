import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  createAiProviderRoutingPolicy,
  isEnabledFlag,
  readBoundedTimeout,
} from './aiRoutingPolicy.ts';

Deno.test('AI routing does not require ZDR by default', (): void => {
  assertEquals(createAiProviderRoutingPolicy(false), {
    allow_fallbacks: true,
    data_collection: 'deny',
    require_parameters: true,
  });
});

Deno.test('AI request timeout stays inside safe server bounds', (): void => {
  assertEquals(readBoundedTimeout(undefined, 45_000), 45_000);
  assertEquals(readBoundedTimeout('1000', 45_000), 5_000);
  assertEquals(readBoundedTimeout('90000', 45_000), 60_000);
  assertEquals(readBoundedTimeout('32000', 45_000), 32_000);
});

Deno.test('AI routing adds ZDR only after explicit opt-in', (): void => {
  assertEquals(createAiProviderRoutingPolicy(true), {
    allow_fallbacks: true,
    data_collection: 'deny',
    require_parameters: true,
    zdr: true,
  });
});

Deno.test('ZDR environment parsing rejects ambiguous truthy values', (): void => {
  assertEquals(isEnabledFlag(undefined), false);
  assertEquals(isEnabledFlag('false'), false);
  assertEquals(isEnabledFlag('1'), false);
  assertEquals(isEnabledFlag(' TRUE '), true);
});
