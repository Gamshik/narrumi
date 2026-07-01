# Testing Patterns

**Analysis Date:** 2026-07-01

## Test Framework

**Runner:**
- Mobile application: Node's built-in test runner, executed through `tsx` from `apps/mobile/package.json`.
- Mobile command: `tsx --test "src/**/*.test.ts"` from `apps/mobile/package.json`.
- Supabase Edge Functions: Deno's built-in test runner through `Deno.test` in files such as `supabase/functions/_shared/episodeFinalizers.test.ts`.
- Config: No dedicated Jest, Vitest, or Deno config file detected. Mobile TypeScript test execution uses `apps/mobile/tsconfig.json` and the `tsx` runtime.

**Assertion Library:**
- Mobile application tests use `node:assert/strict`: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/sync/conflictResolver.test.ts`.
- Supabase Edge Function tests use `jsr:@std/assert`: `supabase/functions/_shared/episodeFinalizers.test.ts`, `supabase/functions/_shared/moderation.test.ts`.

**Run Commands:**
```bash
cd apps/mobile && npm run test        # Run all mobile application tests
cd apps/mobile && npm run lint        # Run ESLint
cd apps/mobile && npm run typecheck   # Run TypeScript without emitting files
cd apps/mobile && npm run build       # Export the Expo app bundle
deno test supabase/functions/**/*.test.ts # Run Supabase Edge Function tests when Deno is available
```

## Test File Organization

**Location:**
- Mobile tests are co-located beside the application logic under `apps/mobile/src/`.
- Use case tests live beside use cases in `apps/mobile/src/application/useCases/`.
- Sync tests live beside sync helpers in `apps/mobile/src/application/sync/`.
- AI payload validation tests live beside AI contracts in `apps/mobile/src/application/ai/`.
- Supabase Edge Function tests are co-located beside shared helpers or function-local modules under `supabase/functions/`.

**Naming:**
- Use `[module].test.ts` for mobile and Supabase tests: `createSeries.test.ts`, `syncQueuePolicy.test.ts`, `episodeFinalizers.test.ts`, `regeneration.test.ts`.
- Name suites after the function, use case, or contract under test: `describe('createSeries', ...)` in `apps/mobile/src/application/useCases/createSeries.test.ts`, `describe('resolveConflict', ...)` in `apps/mobile/src/application/sync/conflictResolver.test.ts`.
- Name test cases as observable behavior: `it('requires a learner role for character mode', ...)` in `apps/mobile/src/application/useCases/createSeries.test.ts`.

**Structure:**
```
apps/mobile/src/application/useCases/[useCase].ts
apps/mobile/src/application/useCases/[useCase].test.ts
apps/mobile/src/application/sync/[helper].ts
apps/mobile/src/application/sync/[helper].test.ts
apps/mobile/src/application/ai/[contract].ts
apps/mobile/src/application/ai/[contract].test.ts
supabase/functions/_shared/[helper].ts
supabase/functions/_shared/[helper].test.ts
supabase/functions/[function]/[helper].ts
supabase/functions/[function]/[helper].test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveConflict } from './conflictResolver';

describe('resolveConflict', () => {
  it('keeps a newer dirty local record over stale remote data', () => {
    const localRecord = buildRecord('2026-06-06T12:00:00.000Z', 'local:2');
    const remoteRecord = buildRecord('2026-06-06T11:00:00.000Z', 'remote:4', false);

    assert.equal(resolveConflict(localRecord, remoteRecord), 'local');
  });
});
```

**Patterns:**
- Arrange dependencies and fixtures inline in the test case unless they are reused across several cases: `apps/mobile/src/application/useCases/createSeries.test.ts`.
- Extract small typed fixture builders for repeated contract objects: `buildRecord` in `apps/mobile/src/application/sync/conflictResolver.test.ts`, `buildOperation` in `apps/mobile/src/application/sync/syncQueuePolicy.test.ts`.
- Use async tests for use cases that interact with ports: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/useCases/generateEpisode.test.ts`.
- Assert both returned values and side effects on fake ports or in-memory arrays: `savedSeries` and `savedMemory` in `apps/mobile/src/application/useCases/createSeries.test.ts`.
- Use `assert.rejects` and `assert.throws` for validation and malformed-payload paths: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/ai/episodeAiPayload.test.ts`.

## Mocking

**Framework:** No Jest, Vitest, Sinon, or React Native Testing Library mock framework detected.

**Patterns:**
```typescript
const moderationGateway: SeriesSetupModerationGateway = {
  validateSeriesSetup: async (request) => {
    assert.equal(request.title, 'Bomb, garry potter');
    throw new Error('Series setup matched blocked content rules.');
  },
};

const store = createMemoryStore(savedSeries, savedMemory);
const clock: Clock = {
  now: () => new Date('2026-06-10T10:00:00.000Z'),
};
```

**What to Mock:**
- Mock application ports with typed object literals: `LocalSeriesStore`, `Clock`, `SeriesSetupModerationGateway`, `EpisodeGenerationGateway`, `NetworkStatus`, and `AuthGateway`.
- Mock time through the `Clock` port instead of using real wall-clock time: `apps/mobile/src/application/useCases/createSeries.test.ts`.
- Mock remote boundaries and assert the outgoing request shape before returning a deterministic payload: `apps/mobile/src/application/useCases/generateEpisode.test.ts`, `apps/mobile/src/application/useCases/generateSeriesSetupDraft.test.ts`.
- Mock persistence using in-memory arrays or tiny object stores that implement only the behavior the use case needs: `createMemoryStore` in `apps/mobile/src/application/useCases/createSeries.test.ts`.

**What NOT to Mock:**
- Do not mock pure domain and application helpers; call them directly. Examples: `resolveConflict` in `apps/mobile/src/application/sync/conflictResolver.test.ts`, `mergeSyncOperation` in `apps/mobile/src/application/sync/syncQueuePolicy.test.ts`.
- Do not mock Zod payload parsers when validating AI contract behavior; test the parser with representative accepted and rejected payloads in `apps/mobile/src/application/ai/episodeAiPayload.test.ts`.
- Do not mock Edge Function finalizer helpers; call `finalizeEpisodePayload` and `finalizeInteractionPayload` directly in `supabase/functions/_shared/episodeFinalizers.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
// buildOperation creates one deterministic queue-policy test value.
function buildOperation(
  operationId: string,
  recordId: string,
  createdAt: string,
): SyncOperation {
  return {
    action: 'upsert',
    operationId,
    recordKind: 'series',
    recordId,
    clientUpdatedAt: createdAt,
    createdAt,
  };
}
```

**Location:**
- Keep fixtures in the test file when they are specific to one module: `apps/mobile/src/application/sync/syncQueuePolicy.test.ts`, `apps/mobile/src/application/sync/conflictResolver.test.ts`.
- Keep large Edge Function fixture objects at the top of the test file when many cases share the same request context: `generateRequest` and `submitRequest` in `supabase/functions/_shared/episodeFinalizers.test.ts`.
- Use deterministic dates and IDs in fixtures to make sync, ordering, and persistence assertions stable: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/sync/conflictResolver.test.ts`.

## Coverage

**Requirements:** None enforced. No coverage threshold or coverage command is present in `apps/mobile/package.json`, and no Jest/Vitest coverage config is detected.

**View Coverage:**
```bash
Not detected
```

## Test Types

**Unit Tests:**
- Primary test type. Cover pure application logic, sync policy, AI payload validation, and Edge Function finalizers.
- Examples: `apps/mobile/src/application/sync/conflictResolver.test.ts`, `apps/mobile/src/application/sync/syncQueuePolicy.test.ts`, `apps/mobile/src/application/ai/episodeAiPayload.test.ts`, `supabase/functions/_shared/episodeFinalizers.test.ts`.

**Integration Tests:**
- Lightweight port-level integration tests are present inside use case tests by combining the real use case with fake storage, network, auth, clock, and gateway ports.
- Examples: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/useCases/generateEpisode.test.ts`, `apps/mobile/src/application/useCases/syncLocalChanges.test.ts`, `apps/mobile/src/application/useCases/submitEpisodeInteraction.test.ts`.

**E2E Tests:**
- Not used. No Detox, Playwright, Appium, Maestro, or Expo E2E test setup is detected.

## Common Patterns

**Async Testing:**
```typescript
it('requires complete text setup before local persistence', async () => {
  const savedSeries: Series[] = [];
  const savedMemory: SeriesMemory[] = [];
  const createSeries = createCreateSeries(
    createMemoryStore(savedSeries, savedMemory),
    { now: () => new Date('2026-06-10T10:00:00.000Z') },
  );

  await assert.rejects(
    () => createSeries.execute({
      title: 'The Door',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Calm detective',
      premise: '',
      participationMode: 'director',
      mainCharacters: [],
    }),
    /premise is required/,
  );
});
```

**Error Testing:**
```typescript
it('rejects sentence frames that drift from playback sentences', () => {
  assert.throws(() =>
    parseEpisodeAiPayload({
      sceneText: 'Mira opened the door.',
      sentences: ['Mira opened the door.'],
      sentenceFrames: [{ kind: 'narration', text: 'Mira closed the door.' }],
      storyWordIds: [],
      annotations: [],
      interaction: {
        kind: 'choice',
        prompt: 'Choose.',
        choices: [
          { id: 'open', label: 'Open it' },
          { id: 'wait', label: 'Wait' },
        ],
      },
      cliffhanger: 'Broken.',
      summaryUpdate: 'Broken.',
      memoryUpdate: validMemoryUpdate,
    }),
  );
});
```

---

*Testing analysis: 2026-07-01*
