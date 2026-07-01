<!-- refreshed: 2026-07-01 -->
# Architecture

**Analysis Date:** 2026-07-01

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│              Expo Router Mobile Presentation                │
├──────────────────┬──────────────────┬───────────────────────┤
│ Route entries    │ Screens          │ Shared UI/theme        │
│ `apps/mobile/app`│ `src/presentation│ `src/presentation`     │
│                  │ /app/screens`    │                       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│             Presentation Service Composition                 │
│ `apps/mobile/src/presentation/app/services/localAppServices.ts`│
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│           Application Use Cases And Ports                    │
│ `apps/mobile/src/application/useCases`                       │
│ `apps/mobile/src/application/ports`                          │
└────────┬────────────────────────────────────────┬────────────┘
         │                                        │
         ▼                                        ▼
┌──────────────────────────────────┐   ┌──────────────────────┐
│ Domain Models                    │   │ Infrastructure        │
│ `apps/mobile/src/domain/models`  │   │ `apps/mobile/src/     │
│                                  │   │ infrastructure`       │
└──────────────────────────────────┘   └──────────┬───────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│ AsyncStorage, bundled Oxford JSON, Expo APIs, Supabase       │
│ `apps/mobile/src/infrastructure/*`                          │
└─────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Edge Functions And PostgreSQL Sync Tables           │
│ `supabase/functions/*` `supabase/migrations/*`               │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Expo Router entry | Bootstraps Expo Router through Expo's root component registration. | `apps/mobile/index.ts`, `apps/mobile/App.tsx` |
| Root layout | Loads fonts, owns splash hiding, and wraps routes in safe area, theme, auth, and stack providers. | `apps/mobile/app/_layout.tsx` |
| Tab layout | Renders Home, Dictionary, and Settings through a custom presentation tab bar. | `apps/mobile/app/(tabs)/_layout.tsx` |
| Route screens | Normalize route params and pass navigation callbacks into presentation screens. | `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/daily-session.tsx`, `apps/mobile/app/episode-reader.tsx`, `apps/mobile/app/series-details.tsx` |
| Presentation screens | Render themed UI state and call composed application services. | `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`, `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`, `apps/mobile/src/presentation/app/screens/DailySessionScreen.tsx`, `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` |
| Service composition | Instantiates adapters once, wires use cases, and applies pre-sync/background-sync wrappers. | `apps/mobile/src/presentation/app/services/localAppServices.ts` |
| Domain models | Define series, episodes, memory, word sets, preferences, vocabulary, and learning signals as framework-free types. | `apps/mobile/src/domain/models/series.ts`, `apps/mobile/src/domain/models/episode.ts`, `apps/mobile/src/domain/models/seriesMemory.ts`, `apps/mobile/src/domain/models/learningSignal.ts` |
| Application use cases | Coordinate user intent, validation, local-first persistence, AI gateway calls, and sync. | `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/application/useCases/generateEpisode.ts`, `apps/mobile/src/application/useCases/submitEpisodeInteraction.ts`, `apps/mobile/src/application/useCases/syncLocalChanges.ts` |
| Application ports | Define narrow contracts for storage, AI, auth, network, audio, clock, vocabulary, and remote sync. | `apps/mobile/src/application/ports/localSeriesStore.ts`, `apps/mobile/src/application/ports/episodeGenerationGateway.ts`, `apps/mobile/src/application/ports/interactionGateway.ts`, `apps/mobile/src/application/ports/remoteSeriesStore.ts` |
| Local persistence adapters | Persist validated local records and queued sync metadata with AsyncStorage. | `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`, `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts` |
| Supabase adapters | Hide Supabase Auth, Edge Function invocation, and remote row mapping behind application ports. | `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`, `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`, `apps/mobile/src/infrastructure/supabase/supabaseInteractionGateway.ts`, `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts` |
| Vocabulary adapter | Validates and indexes bundled Oxford 5000 JSON for offline dictionary and Story Words behavior. | `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`, `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json` |
| Edge Functions | Authenticate, moderate, validate, call OpenRouter through Vercel AI SDK, finalize structured AI payloads, and return safe errors. | `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, `supabase/functions/generate-series-setup/index.ts`, `supabase/functions/validate-series-setup/index.ts` |
| Edge shared modules | Share auth, HTTP responses, moderation, AI contracts, and finalization across Edge Functions. | `supabase/functions/_shared/auth.ts`, `supabase/functions/_shared/http.ts`, `supabase/functions/_shared/moderation.ts`, `supabase/functions/_shared/episodeContracts.ts`, `supabase/functions/_shared/episodeFinalizers.ts` |
| Database migrations | Define user-owned sync tables, moderation state, RLS grants, participation mode, sentence frames, and character profiles. | `supabase/migrations/20260606190000_create_sync_tables.sql`, `supabase/migrations/20260630040000_add_series_character_profiles.sql` |

## Pattern Overview

**Overall:** Pragmatic Clean Architecture with Expo Router presentation, application use cases, domain models, infrastructure adapters, and Supabase Edge Functions as the AI backend boundary.

**Key Characteristics:**
- Keep dependency direction as Presentation -> Application -> Domain, with Infrastructure implementing Application ports from `apps/mobile/src/application/ports`.
- Treat all persistence, Supabase, network, audio, vocabulary JSON, and AI calls as infrastructure details behind ports.
- Persist mutable user records locally before remote sync through `QueuedLocalSeriesStore` and `createSyncLocalChanges`.
- Keep AI prompts, model configuration, OpenRouter credentials, moderation, and final AI validation inside `supabase/functions`.
- Validate external data at every boundary with typed parsers or Zod schemas in `apps/mobile/src/infrastructure/*`, `apps/mobile/src/application/ai/episodeAiPayload.ts`, and `supabase/functions/_shared/episodeContracts.ts`.

## Layers

**Presentation Routes:**
- Purpose: Bind Expo Router files to screen components, normalize route params, and pass navigation callbacks.
- Location: `apps/mobile/app`
- Contains: `_layout.tsx`, tab routes, modal routes, and stack routes.
- Depends on: `expo-router`, React, and presentation exports from `@presentation/app`.
- Used by: Expo Router through `apps/mobile/package.json` main value `expo-router/entry`.

**Presentation UI:**
- Purpose: Render themed mobile screens and components while delegating business actions to services.
- Location: `apps/mobile/src/presentation/app`
- Contains: `screens`, `shared`, `auth`, `theme`, `services`, and app style contracts.
- Depends on: React Native, domain display types, application-facing services from `localAppServices`, theme tokens from `apps/mobile/src/presentation/theme`.
- Used by: Route entries in `apps/mobile/app`.

**Application:**
- Purpose: Coordinate user intents and enforce local-first, online-only, Story Words, memory, AI payload, and sync rules.
- Location: `apps/mobile/src/application`
- Contains: `useCases`, `ports`, `sync`, `ai`, and `errors`.
- Depends on: Domain models and narrow ports only.
- Used by: `apps/mobile/src/presentation/app/services/localAppServices.ts` and tests in `apps/mobile/src/application/**/*.test.ts`.

**Domain:**
- Purpose: Define app concepts without framework, SDK, persistence, or UI dependencies.
- Location: `apps/mobile/src/domain`
- Contains: model types, literal unions, and small domain helpers.
- Depends on: TypeScript only.
- Used by: Application use cases, infrastructure mappers, and presentation display contracts.

**Infrastructure:**
- Purpose: Implement application ports with concrete SDKs and local resources.
- Location: `apps/mobile/src/infrastructure`
- Contains: `audio`, `network`, `series`, `supabase`, `sync`, `time`, and `vocabulary`.
- Depends on: Application ports, domain models, `@react-native-async-storage/async-storage`, `@supabase/supabase-js`, `expo-network`, `expo-speech`, and local JSON.
- Used by: `apps/mobile/src/presentation/app/services/localAppServices.ts`.

**Supabase Edge Backend:**
- Purpose: Securely run online-only AI and moderation flows outside the mobile app.
- Location: `supabase/functions`
- Contains: Edge Function entry points and shared auth, HTTP, moderation, contract, and finalization modules.
- Depends on: Deno runtime, `npm:ai`, `npm:@ai-sdk/openai`, `npm:zod`, Supabase Auth, and OpenRouter secrets from environment.
- Used by: Supabase mobile gateway adapters in `apps/mobile/src/infrastructure/supabase`.

**Database Schema:**
- Purpose: Store authenticated cloud copies of local records and moderation state.
- Location: `supabase/migrations`
- Contains: SQL migrations for sync tables, RLS access grants, episode frames, participation mode, character profiles, and moderation tables/RPCs.
- Depends on: Supabase PostgreSQL and RLS.
- Used by: `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts` and Edge moderation code in `supabase/functions/_shared/moderation.ts`.

## Data Flow

### Primary Request Path

1. User opens a route such as `apps/mobile/app/(tabs)/index.tsx` or `apps/mobile/app/episode-reader.tsx`.
2. The route renders a presentation screen from `apps/mobile/src/presentation/app/screens` inside `RouteScreen` and themed styles from `apps/mobile/src/presentation/app/useAppStyles.ts`.
3. The screen calls a service from `apps/mobile/src/presentation/app/services/localAppServices.ts`, such as `localAppServices.createSeries.execute` or `localAppServices.submitEpisodeInteraction.execute`.
4. The service delegates to an application use case from `apps/mobile/src/application/useCases`.
5. The use case reads or writes domain records through ports from `apps/mobile/src/application/ports`.
6. Infrastructure adapters in `apps/mobile/src/infrastructure` execute concrete work: AsyncStorage writes, Oxford JSON reads, Expo network/audio calls, Supabase Edge Function calls, or Supabase table sync.
7. Local writes update AsyncStorage first, queue a sync operation through `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts`, and then background sync runs through `apps/mobile/src/application/useCases/syncLocalChanges.ts`.
8. The screen receives typed plain data and renders loading, ready, empty, offline, validation, and error states.

### Series Creation Flow

1. `HomeScreen` in `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` validates form UI state and calls `localAppServices.createSeries.execute`.
2. `createCreateSeries` in `apps/mobile/src/application/useCases/createSeries.ts` trims required text, normalizes character profiles, enforces character-mode `userRole`, optionally calls `SeriesSetupModerationGateway`, creates `Series` and `SeriesMemory`, and saves both locally.
3. `QueuedLocalSeriesStore` in `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts` queues durable upsert operations after successful local persistence.
4. `withBackgroundSync` in `apps/mobile/src/presentation/app/services/localAppServices.ts` triggers `createSyncLocalChanges` without making cloud sync mandatory for local success.

### Episode Generation Flow

1. `DailySessionScreen` in `apps/mobile/src/presentation/app/screens/DailySessionScreen.tsx` prepares Story Words and calls `localAppServices.generateEpisode.execute`.
2. `createGenerateEpisode` in `apps/mobile/src/application/useCases/generateEpisode.ts` gates generation on `NetworkStatus`, loads series, memory, existing episodes, and vocabulary, resolves selected Story Words by CEFR level, and sends bounded context to `EpisodeGenerationGateway`.
3. `SupabaseEpisodeGenerationGateway` in `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts` invokes the `generate-episode` Edge Function and validates the structured response with `parseEpisodeAiPayload`.
4. `supabase/functions/generate-episode/index.ts` validates the request with `generateEpisodeRequestSchema`, authenticates via `readAuthenticatedUserId`, checks moderation state, calls OpenRouter with decomposed structured prompts, finalizes the episode with `finalizeEpisodePayload`, and returns JSON.
5. `createGenerateEpisode` maps validated AI JSON into `Episode`, updates `SeriesMemory`, saves the episode, saves the episode word set, records learning signals, and queues sync metadata.

### Episode Interaction Flow

1. `EpisodeReaderScreen` in `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx` optimistically records a selected choice in UI state and calls `localAppServices.submitEpisodeInteraction.execute`.
2. `createSubmitEpisodeInteraction` in `apps/mobile/src/application/useCases/submitEpisodeInteraction.ts` verifies online status, loads the active episode, series, memory, and vocabulary, saves the learner answer as a local draft, and sends bounded context to `InteractionGateway`.
3. `SupabaseInteractionGateway` in `apps/mobile/src/infrastructure/supabase/supabaseInteractionGateway.ts` invokes `submit-interaction` and validates the returned payload.
4. `supabase/functions/submit-interaction/index.ts` authenticates, checks moderation, validates request shape with `submitInteractionRequestSchema`, enforces 5-10 interaction pacing, calls OpenRouter, finalizes continuation, feedback, next interaction or completion state, and returns safe JSON.
5. `createSubmitEpisodeInteraction` appends continuation sentences, frames, annotations, feedback, and possibly the next interaction to the same episode, updates bounded memory, saves learning signals, and queues sync.

### Sync Flow

1. Local writes go through `QueuedLocalSeriesStore` in `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts`, which enqueues compact upsert/delete pointers only after AsyncStorage persistence succeeds.
2. `createSyncLocalChanges` in `apps/mobile/src/application/useCases/syncLocalChanges.ts` skips when offline or unauthenticated, repairs missing queue metadata by scanning dirty records, sorts operations by dependency order, pushes records through `RemoteSeriesStore`, then loads a remote snapshot.
3. `SupabaseRemoteSeriesStore` in `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts` uses serialized rows from `remoteRecordMapper.ts` to write RLS-protected tables.
4. `remoteRecordMapper.ts` validates untrusted remote rows with Zod, checks owner ids, maps snake_case rows back to domain records, and returns `RemoteSeriesSnapshot`.
5. `resolveConflict` in `apps/mobile/src/application/sync/conflictResolver.ts` chooses local or remote records deterministically before overwriting local state.

### Vocabulary And Dictionary Flow

1. Screens call use cases such as `createBrowseVocabulary`, `createStartOrResumeEpisodeWordSelection`, `createReplaceEpisodeStoryWord`, and `createShuffleEpisodeStoryWords` from `apps/mobile/src/application/useCases`.
2. Use cases read `VocabularyCatalog` rather than importing JSON.
3. `BundledOxfordVocabularyCatalog` in `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts` parses `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`, validates CEFR levels and examples, builds id and level indexes, and returns domain `VocabularyItem` records.

**State Management:**
- Use React hooks for local screen state in `apps/mobile/src/presentation/app/screens/*`.
- Use module-level service singletons in `apps/mobile/src/presentation/app/services/localAppServices.ts` for ports and use cases.
- Use AsyncStorage-backed maps as the local source of truth in `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`.
- Use queued sync metadata and per-record `SyncMetadata` from `apps/mobile/src/domain/models/syncMetadata.ts` for remote reconciliation.
- Use Supabase Auth session state through `AuthProvider` in `apps/mobile/src/presentation/app/auth/AuthProvider/AuthProvider.tsx`.

## Key Abstractions

**Use Case Factory:**
- Purpose: Create one typed application action with injected ports.
- Examples: `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/application/useCases/generateEpisode.ts`, `apps/mobile/src/application/useCases/submitEpisodeInteraction.ts`.
- Pattern: Export `createX` factory returning `{ execute: async (...) => ... }`; inputs and outputs are plain typed data.

**Port:**
- Purpose: Isolate application logic from SDKs, transport, storage, device APIs, and remote contracts.
- Examples: `apps/mobile/src/application/ports/localSeriesStore.ts`, `apps/mobile/src/application/ports/episodeGenerationGateway.ts`, `apps/mobile/src/application/ports/interactionGateway.ts`, `apps/mobile/src/application/ports/vocabularyCatalog.ts`.
- Pattern: Type-only interface with narrow methods shaped around application scenarios.

**Adapter:**
- Purpose: Implement one port with one concrete technology.
- Examples: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`, `apps/mobile/src/infrastructure/network/expoNetworkStatus.ts`, `apps/mobile/src/infrastructure/audio/expoSpeechAudioNarrator.ts`.
- Pattern: Class implements a port and owns SDK-specific data conversion or error mapping.

**Service Composition Root:**
- Purpose: Wire domain-independent use cases to concrete production adapters.
- Examples: `apps/mobile/src/presentation/app/services/localAppServices.ts`.
- Pattern: Module-level singletons, local fallback adapters when Supabase config is missing, and sync wrappers around mutating use cases.

**Domain Record:**
- Purpose: Represent validated app state independent of storage row shape or UI state.
- Examples: `apps/mobile/src/domain/models/series.ts`, `apps/mobile/src/domain/models/episode.ts`, `apps/mobile/src/domain/models/seriesMemory.ts`, `apps/mobile/src/domain/models/wordSet.ts`.
- Pattern: Readonly TypeScript object types with explicit timestamps and sync metadata.

**AI Payload Contract:**
- Purpose: Keep mobile AI requests and responses bounded, parsed, and safe before persistence.
- Examples: `apps/mobile/src/application/ai/episodeAiPayload.ts`, `supabase/functions/_shared/episodeContracts.ts`, `supabase/functions/_shared/episodeFinalizers.ts`.
- Pattern: Zod schemas and parser functions on both the client-side adapter boundary and Edge Function boundary.

**Remote Mapper:**
- Purpose: Convert between domain records and Supabase table rows while validating ownership and shape.
- Examples: `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`.
- Pattern: `serializeSyncRecord`, `parseUpsertedRecord`, and `parseRemoteSnapshot` keep snake_case database shape out of application use cases.

## Entry Points

**Mobile app runtime:**
- Location: `apps/mobile/index.ts`, `apps/mobile/App.tsx`, `apps/mobile/package.json`
- Triggers: Expo CLI or native runtime loads `expo-router/entry` and root component registration.
- Responsibilities: Register the Expo app and hand control to Expo Router.

**Root navigation layout:**
- Location: `apps/mobile/app/_layout.tsx`
- Triggers: Expo Router root layout resolution.
- Responsibilities: Load fonts, manage splash screen, configure stack routes, and provide theme/auth/safe-area context.

**Main tabs:**
- Location: `apps/mobile/app/(tabs)/_layout.tsx`
- Triggers: Root stack screen `(tabs)`.
- Responsibilities: Render Home, Dictionary, and Settings with `SorbetTabBar`.

**Feature routes:**
- Location: `apps/mobile/app/daily-session.tsx`, `apps/mobile/app/episode-reader.tsx`, `apps/mobile/app/series-details.tsx`, `apps/mobile/app/dictionary-word-details.tsx`
- Triggers: `router.push` calls from presentation screens.
- Responsibilities: Normalize params and route to screen components.

**Mobile composition root:**
- Location: `apps/mobile/src/presentation/app/services/localAppServices.ts`
- Triggers: Imported by presentation screens.
- Responsibilities: Instantiate production adapters and expose executable application services.

**Edge Function generate episode:**
- Location: `supabase/functions/generate-episode/index.ts`
- Triggers: Supabase Function invocation named `generate-episode`.
- Responsibilities: Authenticate, moderate, validate request, generate a structured episode, finalize output, and return safe JSON.

**Edge Function submit interaction:**
- Location: `supabase/functions/submit-interaction/index.ts`
- Triggers: Supabase Function invocation named `submit-interaction`.
- Responsibilities: Authenticate, moderate, validate learner answer context, generate feedback/continuation, enforce pacing, finalize output, and return safe JSON.

**Edge Function generate series setup:**
- Location: `supabase/functions/generate-series-setup/index.ts`
- Triggers: Supabase Function invocation named `generate-series-setup`.
- Responsibilities: Fill missing setup fields while preserving user-selected genre, CEFR level, tone, and participation mode.

**Edge Function validate series setup:**
- Location: `supabase/functions/validate-series-setup/index.ts`
- Triggers: Supabase Function invocation named `validate-series-setup`.
- Responsibilities: Check setup text against moderation restrictions before local series creation or setup update.

## Architectural Constraints

- **Threading:** Mobile runtime uses the React Native JavaScript event loop. Edge Functions use Deno request handlers through `Deno.serve` in `supabase/functions/*/index.ts`.
- **Global state:** `apps/mobile/src/presentation/app/services/localAppServices.ts` creates module-level adapter and use-case singletons; keep additional global state out of feature code unless it belongs in the composition root.
- **Circular imports:** No explicit circular chain was detected during architecture sampling. Preserve one-way dependencies by importing domain into application and infrastructure, never infrastructure into domain or application use cases.
- **Path aliases:** Use aliases from `apps/mobile/tsconfig.json`: `@/*`, `@application/*`, `@domain/*`, `@infrastructure/*`, and `@presentation/*`.
- **Native code:** Do not add `apps/mobile/ios` or `apps/mobile/android`; use Expo Managed Workflow configuration in `apps/mobile/app.json`.
- **AI boundary:** Do not call OpenRouter or any LLM provider from `apps/mobile/src`; only Supabase Edge Functions in `supabase/functions` may use `OPENROUTER_API_KEY`.
- **Offline-first invariant:** Use cases that mutate series, episodes, memory, word sets, signals, preferences, or sync metadata must persist locally before cloud sync.
- **Bounded memory:** Pass compact memory from `apps/mobile/src/application/ai/episodeAiPayload.ts` and `apps/mobile/src/domain/models/seriesMemory.ts`; do not send full unbounded episode history.

## Anti-Patterns

### SDK Calls From Screens

**What happens:** A screen imports Supabase, AsyncStorage, Expo Speech, Expo Network, Oxford JSON, or Edge Function transport directly.
**Why it's wrong:** It bypasses ports, breaks offline-first composition, and leaks infrastructure details into presentation.
**Do this instead:** Add or reuse an application use case in `apps/mobile/src/application/useCases`, expose a port from `apps/mobile/src/application/ports`, implement it in `apps/mobile/src/infrastructure`, and wire it through `apps/mobile/src/presentation/app/services/localAppServices.ts`.

### Raw AI Or Remote Data In Domain Records

**What happens:** AI output, Supabase row objects, or JSON seed entries are stored or rendered without schema validation and mapping.
**Why it's wrong:** AI output, remote rows, and bundled JSON are trust boundaries that can contain invalid shape, unsafe text, or stale ownership.
**Do this instead:** Validate Edge output through `apps/mobile/src/application/ai/episodeAiPayload.ts`, Edge contracts in `supabase/functions/_shared/episodeContracts.ts`, remote rows in `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, and vocabulary JSON in `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`.

### Remote-First Mutations

**What happens:** A use case attempts Supabase writes before local persistence or blocks local user progress on cloud availability.
**Why it's wrong:** It violates the local-first invariant and makes offline-capable flows unreliable.
**Do this instead:** Save through `LocalSeriesStore`, let `QueuedLocalSeriesStore` enqueue sync operations, and run `createSyncLocalChanges` best-effort from `localAppServices.ts`.

### Broad Service Objects

**What happens:** A new feature adds a general service with many unrelated methods or exposes vendor-shaped methods to application code.
**Why it's wrong:** It weakens dependency inversion and makes use cases depend on implementation concerns.
**Do this instead:** Define narrow scenario ports like `EpisodeGenerationGateway` in `apps/mobile/src/application/ports/episodeGenerationGateway.ts` and implement one adapter per technology in `apps/mobile/src/infrastructure`.

### Direct Prompt Logic In Mobile Code

**What happens:** Mobile use cases or screens construct LLM prompts, choose models, or include provider-specific settings.
**Why it's wrong:** It exposes sensitive behavior, makes client releases responsible for prompt safety, and conflicts with the Edge Function trust boundary.
**Do this instead:** Keep prompt construction in `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/generate-series-setup/index.ts`; mobile sends bounded typed context only.

## Error Handling

**Strategy:** Convert boundary failures into safe typed or generic errors at the layer where they occur, then render user-appropriate messages in presentation.

**Patterns:**
- Use cases throw concise `Error` messages for validation, offline, missing local context, and invalid state transitions in `apps/mobile/src/application/useCases`.
- Supabase Function adapters convert Edge failures with `toSupabaseFunctionError` in `apps/mobile/src/infrastructure/supabase/supabaseFunctionError.ts`.
- Edge Functions return CORS-aware JSON responses through `supabase/functions/_shared/http.ts` and avoid exposing raw SDK or model errors.
- Sync failures are retained in the queue and summarized by `SyncLocalChangesResult` from `apps/mobile/src/application/useCases/syncLocalChanges.ts`.
- Screens catch errors, show state messages or alerts, and keep local records reloadable, as in `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`.

## Cross-Cutting Concerns

**Logging:** Use limited console diagnostics in presentation for unexpected local failures, such as `EpisodeReaderScreen.tsx`; Edge Functions log safe context through `logSafeError` and `logSafeInfo` in `supabase/functions/_shared/http.ts`.

**Validation:** Use TypeScript domain contracts in `apps/mobile/src/domain`, Zod for remote row and AI contracts in `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, `apps/mobile/src/application/ai/episodeAiPayload.ts`, and `supabase/functions/_shared/episodeContracts.ts`; use parser functions for AsyncStorage and bundled JSON in infrastructure adapters.

**Authentication:** Supabase Auth is wrapped by `SupabaseAuthSessionProvider` in `apps/mobile/src/infrastructure/supabase/supabaseAuthSessionProvider.ts`; mobile sync uses `AuthSessionProvider`, and Edge Functions authenticate requests through `supabase/functions/_shared/auth.ts`.

**Moderation and Safety:** Series setup validation and AI generation moderation live in `supabase/functions/validate-series-setup/index.ts`, `supabase/functions/generate-series-setup/index.ts`, `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/_shared/moderation.ts`.

**Theming:** Theme tokens live in `apps/mobile/src/presentation/theme/tokens.ts` and are exposed through `ThemeProvider` in `apps/mobile/src/presentation/app/theme/ThemeProvider.tsx`; screens receive generated `AppStyles` from `useAppStyles`.

**Audio:** The `AudioNarrator` port is implemented by `ExpoSpeechAudioNarrator` in `apps/mobile/src/infrastructure/audio/expoSpeechAudioNarrator.ts`; presentation should request audio through `localAppServices.audioNarrator`.

---

*Architecture analysis: 2026-07-01*
