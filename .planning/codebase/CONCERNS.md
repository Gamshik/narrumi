# Codebase Concerns

**Analysis Date:** 2026-07-01

## Tech Debt

**Oversized presentation modules:**
- Issue: Several React Native screen and style modules combine rendering, local UI state, validation helpers, modal composition, and copy. `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx` is 993 lines, `apps/mobile/src/presentation/app/screens/HomeScreen.tsx` is 906 lines, `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx` is 595 lines, and `apps/mobile/src/presentation/app/MobileApp.styles.ts` is 1041 lines.
- Files: `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx`, `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`, `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`, `apps/mobile/src/presentation/app/MobileApp.styles.ts`
- Impact: UI changes have a large review surface and can accidentally mix product rules, layout behavior, and local state transitions. Style edits are especially fragile because many unrelated screen keys live in one file.
- Fix approach: Split screens into focused feature folders under `apps/mobile/src/presentation/app/screens/<screen>/components/`, move non-trivial form validation and state helpers into screen-local helpers, and split style creation by screen or component while preserving the shared `AppStyles` contract.

**Large Edge Function handlers:**
- Issue: Edge Function entry files combine HTTP handling, request validation, moderation, model prompting, JSON extraction, retry loops, assembly, and response finalization in one module. `supabase/functions/generate-episode/index.ts` is 904 lines and `supabase/functions/submit-interaction/index.ts` is 923 lines.
- Files: `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, `supabase/functions/generate-series-setup/index.ts`
- Impact: AI behavior changes are hard to isolate, and repeated helpers such as `parseJsonObject`, `containsWord`, prompt builders, and OpenRouter setup can drift between generation and interaction paths.
- Fix approach: Extract shared AI transport, JSON extraction, annotation targeting, prompt fragments, and pipeline step helpers into `supabase/functions/_shared/` modules. Keep each `index.ts` focused on Deno request handling and orchestration.

**Local service composition as a module-level singleton graph:**
- Issue: `apps/mobile/src/presentation/app/services/localAppServices.ts` builds all production adapters and use cases at module load time, catches all Supabase configuration errors, and exports a single global object.
- Files: `apps/mobile/src/presentation/app/services/localAppServices.ts`, `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`
- Impact: Tests and future alternate runtime configurations have to work around a fixed service graph. Missing Supabase config degrades into local-only fallback, which is useful for development but can hide production misconfiguration unless the UI surfaces it consistently.
- Fix approach: Keep a composition root, but expose a factory such as `createAppServices(environment)` for tests and runtime initialization. Preserve `createSupabaseServices` as the only place that decides whether remote adapters or unavailable adapters are used.

**Embedded character setup model still marked for promotion:**
- Issue: `SeriesCharacter` remains an embedded setup value with a TODO to promote it to a standalone synced entity.
- Files: `apps/mobile/src/domain/models/seriesCharacter.ts`
- Impact: Character profiles are duplicated inside series and series memory rows, so future character editing or cross-episode character state requires coordinated updates across `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, and Supabase migrations.
- Fix approach: Keep character profiles embedded until a feature requires independent character lifecycle. When that feature is added, introduce a domain model, local store methods, sync record kind, RLS table, mapper, and migration in one coherent change.

**Root project manifest is incomplete:**
- Issue: The root has `package-lock.json` but no root `package.json`, while the actual app manifest is `apps/mobile/package.json`.
- Files: `package-lock.json`, `apps/mobile/package.json`
- Impact: Tooling run from the repository root has no canonical npm scripts, and the root lockfile can confuse dependency updates or automation.
- Fix approach: Either remove the root `package-lock.json` if it is accidental, or add an intentional root workspace manifest that delegates to `apps/mobile`.

## Known Bugs

**Root `.gitignore` is absent:**
- Symptoms: The repository root does not contain `.gitignore`; only `apps/mobile/.gitignore` exists. Generated root-level files, planning outputs, or local tooling artifacts are not protected by a repo-wide ignore policy.
- Files: `apps/mobile/.gitignore`, `package-lock.json`
- Trigger: Running tools from the repository root can create unignored generated files outside `apps/mobile/`.
- Workaround: Keep generated files inside `apps/mobile/` or manually check `git status` before commits.

**Background sync failures are intentionally swallowed:**
- Symptoms: Wrapped actions call `void sync.execute().catch(() => undefined)` and pre-sync reads also ignore failures.
- Files: `apps/mobile/src/presentation/app/services/localAppServices.ts`
- Trigger: Any network, auth, RLS, validation, or remote parsing failure during background sync.
- Workaround: Manual retry is available only through later actions that trigger sync again; no user-visible retry queue or diagnostics surface is wired to presentation state.

**Invalid local storage maps drop malformed records silently:**
- Symptoms: `parseRecordMap` drops invalid entries, `AsyncStorageSyncQueue.read` drops malformed operations, and only preferences are deleted on parse failure.
- Files: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`
- Trigger: Corrupted AsyncStorage JSON, schema drift, or partially written local records.
- Workaround: The app continues with remaining valid data, but the user has no recovery path for dropped records.

## Security Considerations

**Local `.env` exists:**
- Risk: `apps/mobile/.env` is present in the workspace. It is ignored by `apps/mobile/.gitignore`, but there is no root `.gitignore` to protect equivalent root-level env files.
- Files: `apps/mobile/.env`, `apps/mobile/.gitignore`
- Current mitigation: `apps/mobile/.gitignore` ignores `.env` and `.env*.local` within the mobile app folder. The file contents were not read.
- Recommendations: Add a root `.gitignore` that ignores `.env`, `.env.*`, secret files, generated folders, and dependency folders across the whole repository.

**Wildcard Edge Function CORS:**
- Risk: Edge Functions return `Access-Control-Allow-Origin: *` and allow `authorization`, `apikey`, and `content-type` headers.
- Files: `supabase/functions/_shared/http.ts`
- Current mitigation: Function handlers call `readAuthenticatedUserId` and database tables use RLS policies in `supabase/migrations/20260606190000_create_sync_tables.sql`.
- Recommendations: Keep auth and RLS mandatory for all user-owned operations. For production, restrict CORS origins if the client surface becomes web-accessible beyond local Expo/mobile use.

**Moderation uses rule-based keyword matching:**
- Risk: Copyright and safety checks depend on static regex patterns and can miss paraphrases, alternate spellings, or non-English references.
- Files: `supabase/functions/_shared/moderation.ts`, `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, `supabase/functions/generate-series-setup/index.ts`, `supabase/functions/validate-series-setup/index.ts`
- Current mitigation: Moderation state, warnings, bans, and soft blocks are backed by RPCs and tables from `supabase/migrations/20260610090000_create_user_restrictions.sql`, `supabase/migrations/20260610094000_create_user_moderation_state.sql`, `supabase/migrations/20260610110000_create_user_moderation_events.sql`, and `supabase/migrations/20260610113000_create_series_setup_moderation_attempts.sql`.
- Recommendations: Treat regex moderation as a first-pass guard. Add model/provider moderation or a stronger server-side classifier before scaling AI generation traffic.

**Client-authored timestamps decide sync conflicts:**
- Risk: Conflict resolution trusts `updatedAt` and `pendingOperationId` authored by the client and mirrored to `client_updated_at` and `last_operation_id`.
- Files: `apps/mobile/src/application/sync/conflictResolver.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, `supabase/migrations/20260606190000_create_sync_tables.sql`
- Current mitigation: RLS restricts rows to the authenticated owner, and the database trigger `public.keep_newest_client_write()` keeps deterministic newest client writes.
- Recommendations: Continue treating this as owner-scoped reconciliation, not security ordering. For abuse-resistant ordering, add server-issued versioning or per-device operation logs.

## Performance Bottlenecks

**Whole-map AsyncStorage persistence:**
- Problem: Every save reads and rewrites a complete JSON object map for series, episodes, memories, word sets, learning signals, and sync metadata.
- Files: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`
- Cause: Records are stored under coarse keys such as `@context-english/episodes` and rewritten with object spreads.
- Improvement path: Keep this for small MVP datasets. Move high-growth records such as episodes and learning signals to per-record AsyncStorage keys or `expo-sqlite` when episode history grows.

**Remote snapshot loads every user row:**
- Problem: Sync reads every visible row from six tables on each snapshot load.
- Files: `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`, `apps/mobile/src/application/useCases/syncLocalChanges.ts`
- Cause: `loadSnapshot` calls `.select('*')` without `client_updated_at` paging or changed-since filters.
- Improvement path: Add incremental sync cursors keyed by `server_updated_at` or `client_updated_at`, and load deleted records through tombstones instead of relying only on current table contents.

**Sync scans local records repeatedly:**
- Problem: `enqueueDirtyRecords` loads all series, memories, episodes, word sets, learning signals, and preferences before each online sync attempt.
- Files: `apps/mobile/src/application/useCases/syncLocalChanges.ts`
- Cause: The queue repairs missing dirty operations by scanning every local record.
- Improvement path: Keep repair scans as a maintenance path, but skip them when the sync queue has recent valid operations, or store a durable dirty index by record kind.

**Vocabulary and UI list growth risks:**
- Problem: The Oxford vocabulary is bundled and parsed in `BundledOxfordVocabularyCatalog`; dictionary UI depends on local list rendering.
- Files: `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`, `apps/mobile/src/presentation/app/screens/DictionaryScreen.tsx`
- Cause: The seed list is loaded from JSON and dictionary interactions run on-device.
- Improvement path: Keep deterministic local parsing, but use indexed lookup structures and virtualized lists for any screen showing broad vocabulary results.

## Fragile Areas

**Sync and conflict resolution:**
- Files: `apps/mobile/src/application/useCases/syncLocalChanges.ts`, `apps/mobile/src/application/sync/conflictResolver.ts`, `apps/mobile/src/application/sync/syncQueuePolicy.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`, `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts`
- Why fragile: Local writes, queue deduplication, delete ordering, remote upserts, snapshot reconciliation, and conflict cleanup are distributed across several files. Deletions support only `series` and `episode`, while other synced record kinds have no delete operation path.
- Safe modification: Update sync record kinds, dependency ordering, queue merge rules, remote mapper, local store methods, and tests together. Add regression tests in `apps/mobile/src/application/useCases/syncLocalChanges.test.ts` and `apps/mobile/src/application/sync/syncQueuePolicy.test.ts`.
- Test coverage: Application sync logic has tests, but concrete AsyncStorage and Supabase adapter behavior is not covered by integration tests.

**AI payload shape and finalization:**
- Files: `apps/mobile/src/application/ai/episodeAiPayload.ts`, `supabase/functions/_shared/episodeContracts.ts`, `supabase/functions/_shared/episodeFinalizers.ts`, `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`
- Why fragile: Mobile and Edge Function contracts must stay aligned across episode generation, interaction continuation, sentence frames, annotations, Story Words, and memory updates.
- Safe modification: Change shared contract fields first, update both mobile parser and Edge finalizer, then add tests in `apps/mobile/src/application/ai/episodeAiPayload.test.ts` and `supabase/functions/_shared/episodeFinalizers.test.ts`.
- Test coverage: Finalizers and mobile parsers are tested, but end-to-end Edge Function invocation with real function responses is not covered.

**Supabase schema and remote mapper alignment:**
- Files: `supabase/migrations/20260606190000_create_sync_tables.sql`, `supabase/migrations/20260630040000_add_series_character_profiles.sql`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`
- Why fragile: Database columns use snake_case JSONB rows while domain models use TypeScript contracts. Any new field requires migration, serializer, parser, snapshot mapper, local parser, and tests.
- Safe modification: Add fields through a migration with defaults, update `serializeSyncRecord`, row schemas, map functions, local storage parsers, and conflict tests in one change.
- Test coverage: Mapper behavior is indirectly exercised by sync tests; there are no Supabase integration tests that apply migrations and verify RLS/table contracts.

**Presentation-auth-sync interaction:**
- Files: `apps/mobile/src/presentation/app/auth/AuthProvider/AuthProvider.tsx`, `apps/mobile/src/presentation/app/services/localAppServices.ts`
- Why fragile: Auth restore, subscription callbacks, sign-in state, and sync startup all happen asynchronously. Sync errors are swallowed, so account state can look healthy while remote persistence fails.
- Safe modification: Add explicit sync status state before exposing remote backup claims in UI. Keep auth state and sync status separate in presentation contracts.
- Test coverage: `apps/mobile/src/application/useCases/manageAuthSession.test.ts` covers the use case, but `AuthProvider` has no React component tests.

## Scaling Limits

**AsyncStorage as primary episode database:**
- Current capacity: Suitable for small MVP histories and compact records.
- Limit: Large episode histories, many learning signals, or long generated text make full-map JSON reads/writes slower and increase corruption blast radius.
- Scaling path: Move episodes, learning signals, and word sets to `expo-sqlite` or per-record storage while preserving `LocalSeriesStore` as the application port.

**Full-snapshot cloud sync:**
- Current capacity: Suitable for early users with modest row counts.
- Limit: Sync cost grows with total historical rows per user because `loadSnapshot` selects every row from `series`, `series_memory`, `episodes`, `word_sets`, `learning_signals`, and `preferences`.
- Scaling path: Add server-side changed-since queries, deletion tombstones, and cursor persistence in sync metadata.

**Edge Function AI fan-out:**
- Current capacity: Each generation/interaction can run several model calls with up to three attempts per structured step.
- Limit: Latency and cost grow quickly when retries happen across core draft, speech extraction, frame generation, interaction writing, memory update, and translation.
- Scaling path: Measure step timings, cache deterministic steps where safe, and introduce cheaper deterministic finalization before adding more AI subtasks.

## Dependencies at Risk

**Expo/React Native version coupling:**
- Risk: `apps/mobile/package.json` uses Expo `^57.0.1`, React `19.2.3`, React Native `0.86.0`, and Expo Router `~57.0.2`. These packages must remain compatible as a managed Expo set.
- Impact: Dependency updates can break Metro, Expo Router, native module compatibility, or web export.
- Migration plan: Use Expo-managed upgrade tooling and run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `apps/mobile` after dependency changes.

**Supabase JS and Edge Function contract coupling:**
- Risk: Mobile clients use `@supabase/supabase-js` for auth, functions, and PostgREST, while Edge Functions use Deno npm imports and Supabase RPC calls.
- Impact: Auth session behavior, function error serialization, or PostgREST upsert behavior can affect generation and sync.
- Migration plan: Keep Supabase access behind `apps/mobile/src/infrastructure/supabase/` adapters and Edge Function shared modules. Add adapter tests before changing Supabase versions.

**Vercel AI SDK/OpenRouter structured output path:**
- Risk: Edge Functions use `generateText` plus custom JSON extraction instead of a strongly structured generation helper.
- Impact: Provider output formatting drift can increase retries or 502 responses.
- Migration plan: Centralize JSON generation in a shared helper under `supabase/functions/_shared/` and evaluate structured-object APIs where compatible with OpenRouter.

## Missing Critical Features

**User-visible sync status and retry management:**
- Problem: Sync exists as a background process, but presentation has no durable sync state, failed queue screen, or explicit retry surface.
- Blocks: Users cannot tell whether cloud backup is current after remote failures.

**Integration verification for Supabase RLS and migrations:**
- Problem: Migrations define RLS and triggers, but no test applies the schema and verifies authenticated user access paths.
- Blocks: Schema/RLS regressions can pass TypeScript and unit tests.

**Component-level UI regression coverage:**
- Problem: Large screens render critical flows, but tests focus on application use cases and Edge finalizers.
- Blocks: Create-series form validation, offline notices, auth gate behavior, story reader interaction controls, and dictionary UI can regress without automated coverage.

## Test Coverage Gaps

**Concrete storage adapters:**
- What's not tested: AsyncStorage parsing, whole-map write behavior, queue durability, malformed local data recovery, and per-record deletion cascades.
- Files: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`, `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts`
- Risk: Corrupted or migrated local data can be dropped silently or queued incorrectly.
- Priority: High

**Supabase remote adapter and RLS behavior:**
- What's not tested: PostgREST upsert/delete behavior, snapshot parsing against real rows, RLS policies, and newest-write triggers.
- Files: `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, `supabase/migrations/20260606190000_create_sync_tables.sql`
- Risk: Cloud sync can fail only in production-like environments.
- Priority: High

**Edge Function entrypoints:**
- What's not tested: HTTP method handling, auth errors, moderation paths, OpenRouter unavailable paths, and retry behavior around `generateText`.
- Files: `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, `supabase/functions/generate-series-setup/index.ts`, `supabase/functions/validate-series-setup/index.ts`
- Risk: Unit-tested finalizers can pass while deployed functions return wrong status codes or unsafe error responses.
- Priority: High

**Presentation flows:**
- What's not tested: React Native screen behavior for create series, setup generation errors, episode reader interactions, auth gate transitions, and offline/online user messaging.
- Files: `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`, `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx`, `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`, `apps/mobile/src/presentation/app/auth/AuthProvider/AuthProvider.tsx`
- Risk: User-facing flows can regress without failing `npm run test`.
- Priority: Medium

**Performance and load behavior:**
- What's not tested: Large local histories, large learning signal sets, broad dictionary searches, and full-snapshot sync latency.
- Files: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`, `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`
- Risk: MVP behavior may feel correct with fixtures but degrade as users accumulate episodes and signals.
- Priority: Medium

---

*Concerns audit: 2026-07-01*
