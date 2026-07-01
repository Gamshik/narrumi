# External Integrations

**Analysis Date:** 2026-07-01

## APIs & External Services

**AI Generation:**
- OpenRouter - Server-side LLM access for series setup drafts, episode generation, interaction continuation, correction feedback, translation annotations, sentence frames, and compact memory updates.
  - SDK/Client: Vercel AI SDK via `npm:ai` and `npm:@ai-sdk/openai` in `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/generate-series-setup/index.ts`.
  - Auth: `OPENROUTER_API_KEY`; optional model selector `OPENROUTER_MODEL` defaults to `openai/gpt-4o-mini` in Edge Functions.
  - Endpoint: OpenAI-compatible `https://openrouter.ai/api/v1` configured in the `createOpenAI` provider inside the Edge Function files.

**Backend API Boundary:**
- Supabase Edge Functions - Mobile app invokes server-only actions through `client.functions.invoke` instead of direct AI calls.
  - SDK/Client: `@supabase/supabase-js` in `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`, `apps/mobile/src/infrastructure/supabase/supabaseInteractionGateway.ts`, `apps/mobile/src/infrastructure/supabase/supabaseSeriesSetupDraftGateway.ts`, and `apps/mobile/src/infrastructure/supabase/supabaseSeriesSetupModerationGateway.ts`.
  - Auth: Supabase Auth bearer JWT propagated by the Supabase client; Edge Functions validate it through `supabase/functions/_shared/auth.ts`.
  - Functions: `generate-episode`, `submit-interaction`, `generate-series-setup`, and `validate-series-setup`.

**Device Services:**
- Expo Speech - Native device text-to-speech for episode sentence playback.
  - SDK/Client: `expo-speech` in `apps/mobile/src/infrastructure/audio/expoSpeechAudioNarrator.ts`.
  - Auth: Not applicable.
- Expo Network - Device connectivity checks for online-only generation, interaction, correction, and sync flows.
  - SDK/Client: `expo-network` in `apps/mobile/src/infrastructure/network/expoNetworkStatus.ts`.
  - Auth: Not applicable.

**Local Vocabulary Source:**
- Bundled Oxford 5000 JSON - Offline dictionary, Story Words suggestions, and non-LLM word lookup.
  - SDK/Client: Static JSON import in `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`.
  - Auth: Not applicable.
  - Source files: canonical seed at `words/oxford-5000.json`; app-bundled copy at `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`.

## Data Storage

**Databases:**
- Supabase PostgreSQL - Authenticated cloud copy for series, episodes, memory, word sets, learning signals, preferences, sync metadata, moderation state, restrictions, and moderation events.
  - Connection: Mobile uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`; Edge Functions use `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase/functions/_shared/auth.ts` and `supabase/functions/_shared/moderation.ts`.
  - Client: `@supabase/supabase-js` in `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts` and Deno `npm:@supabase/supabase-js` in `supabase/functions/_shared/auth.ts` and `supabase/functions/_shared/moderation.ts`.
  - Tables: `series`, `series_memory`, `episodes`, `word_sets`, `learning_signals`, and `preferences` in `supabase/migrations/20260606190000_create_sync_tables.sql`.
  - Moderation tables: `user_restrictions`, `user_moderation_state`, `user_moderation_events`, and `user_moderation_soft_block_state` in `supabase/migrations/20260610090000_create_user_restrictions.sql`, `supabase/migrations/20260610094000_create_user_moderation_state.sql`, `supabase/migrations/20260610110000_create_user_moderation_events.sql`, and `supabase/migrations/20260610113000_create_series_setup_moderation_attempts.sql`.
  - RLS: Enabled for user data tables in `supabase/migrations/20260606190000_create_sync_tables.sql`; policies restrict records to `(select auth.uid()) = user_id`.

**File Storage:**
- Local filesystem/app bundle only for vocabulary and static assets.
  - App assets live in `apps/mobile/assets`.
  - Vocabulary seed is bundled at `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`.
  - Supabase Storage is mentioned as a future-capable service in `stack/tech_stack_mvp.md`, but no Storage bucket integration or `storage` API usage was detected in app or Edge Function source.

**Caching:**
- AsyncStorage - Durable local-first store for app data and auth session persistence.
  - Client: `@react-native-async-storage/async-storage`.
  - Local records: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`.
  - Sync queue: `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`.
  - Supabase auth session persistence: `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
  - Theme preference persistence: `apps/mobile/src/presentation/app/theme/ThemeProvider.tsx`.
- No Redis, CDN cache, service worker cache, or server-side cache integration was detected.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password account creation, sign-in, sign-out, session restore, and auth-state subscription.
  - Implementation: `apps/mobile/src/infrastructure/supabase/supabaseAuthSessionProvider.ts` implements both `AuthGateway` and `AuthSessionProvider`.
  - Session storage: Supabase client persists sessions in AsyncStorage through `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
  - Edge validation: `supabase/functions/_shared/auth.ts` reads the `Authorization` bearer token and validates it with `client.auth.getUser()`.
  - Database ownership: RLS policies in `supabase/migrations/20260606190000_create_sync_tables.sql` bind user data rows to `auth.uid()`.

**Authorization & Abuse Controls:**
- Supabase RLS protects remote user records in `series`, `series_memory`, `episodes`, `word_sets`, `learning_signals`, and `preferences`.
- Moderation state and restriction checks are handled through RPC-backed helpers in `supabase/functions/_shared/moderation.ts`.
- Moderation RPC migrations include `supabase/migrations/20260610102000_create_moderation_rpc.sql`, `supabase/migrations/20260610104000_fix_moderation_rpc_ambiguous_user_id.sql`, and `supabase/migrations/20260610111000_update_moderation_rpc_audit.sql`.

## Monitoring & Observability

**Error Tracking:**
- None detected; no Sentry, Bugsnag, Datadog, OpenTelemetry, or hosted observability SDK dependency appears in `apps/mobile/package.json` or Edge Function imports.

**Logs:**
- Edge Functions log safe server-side diagnostics through `console.error` and `console.info` wrappers in `supabase/functions/_shared/http.ts`.
- Mobile infrastructure converts provider errors into application-safe errors in `apps/mobile/src/infrastructure/supabase/supabaseFunctionError.ts`, `apps/mobile/src/infrastructure/supabase/supabaseAuthSessionProvider.ts`, and `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`.
- Raw OpenRouter, Supabase, schema, and parsing details are not returned directly to clients by Edge Function helpers in `supabase/functions/_shared/http.ts`.

## CI/CD & Deployment

**Hosting:**
- Mobile: Expo/EAS is the intended production build path according to `stack/tech_stack_mvp.md`; no `eas.json` was detected.
- Backend: Supabase hosts PostgreSQL and Edge Functions from `supabase/migrations` and `supabase/functions`.
- AI: OpenRouter is the external AI API provider configured by Edge Function environment variables.

**CI Pipeline:**
- None detected at repo root; no root `.github/workflows`, `.gitlab-ci.yml`, or `azure-pipelines.yml` was found.
- Canonical local verification commands are documented in `apps/mobile/README.md` and implemented in `apps/mobile/package.json`.

## Environment Configuration

**Required env vars:**
- `EXPO_PUBLIC_SUPABASE_URL` - Public Supabase project URL consumed by `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase anon key consumed by `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
- `SUPABASE_URL` - Supabase project URL consumed by Edge Function auth/moderation helpers in `supabase/functions/_shared/auth.ts` and `supabase/functions/_shared/moderation.ts`.
- `SUPABASE_ANON_KEY` - Supabase anon key consumed by Edge Function auth/moderation helpers in `supabase/functions/_shared/auth.ts` and `supabase/functions/_shared/moderation.ts`.
- `OPENROUTER_API_KEY` - Server-only OpenRouter credential consumed by AI Edge Functions.
- `OPENROUTER_MODEL` - Optional deployed model selector consumed by AI Edge Functions; code defaults to `openai/gpt-4o-mini`.

**Secrets location:**
- Supabase Edge Function secrets are documented by name in `supabase/functions/README.md`; values must live in Supabase's secret management or local developer environment, not in committed files.
- Public Expo variables are documented by name in `supabase/functions/README.md` and read at runtime by `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
- No root `.env` file was detected. Do not read or commit secret-bearing files if added later.
- `supabase/.temp` exists and contains Supabase CLI local state; treat it as tooling state rather than application source.

## Webhooks & Callbacks

**Incoming:**
- Supabase Edge Function HTTP endpoints accept POST and OPTIONS requests:
  - `generate-episode` in `supabase/functions/generate-episode/index.ts`.
  - `submit-interaction` in `supabase/functions/submit-interaction/index.ts`.
  - `generate-series-setup` in `supabase/functions/generate-series-setup/index.ts`.
  - `validate-series-setup` in `supabase/functions/validate-series-setup/index.ts`.
- CORS headers allow `POST` and `OPTIONS` with `authorization`, `x-client-info`, `apikey`, and `content-type` headers in `supabase/functions/_shared/http.ts`.
- No third-party webhook receiver endpoints were detected.

**Outgoing:**
- OpenRouter API calls are made from Edge Functions through the Vercel AI SDK provider configured with base URL `https://openrouter.ai/api/v1`.
- Supabase Auth calls are made by mobile in `apps/mobile/src/infrastructure/supabase/supabaseAuthSessionProvider.ts`.
- Supabase PostgREST table operations are made by mobile in `apps/mobile/src/infrastructure/supabase/supabaseRemoteSeriesStore.ts`.
- Supabase RPC calls for moderation are made by Edge Functions in `supabase/functions/_shared/moderation.ts`.
- No outgoing webhooks or callback registrations were detected.

---

*Integration audit: 2026-07-01*
