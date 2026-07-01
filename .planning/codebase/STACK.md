# Technology Stack

**Analysis Date:** 2026-07-01

## Languages

**Primary:**
- TypeScript - Used for the Expo React Native app in `apps/mobile/src`, Expo Router entry files in `apps/mobile/app`, and Supabase Edge Functions in `supabase/functions`.
- SQL - Used for Supabase PostgreSQL schema, RLS policies, triggers, and RPC functions in `supabase/migrations`.

**Secondary:**
- JavaScript - Used only for tool configuration in `apps/mobile/eslint.config.js` and `apps/mobile/metro.config.js`.
- JSON - Used for Expo/package configuration in `apps/mobile/app.json`, `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, and bundled vocabulary data in `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`.
- HTML/Markdown - Used for product, architecture, stack, and design artifacts in `concept/`, `architecture/`, `stack/`, and `design/`.

## Runtime

**Environment:**
- Node.js - Required for Expo CLI, ESLint, TypeScript, `tsx --test`, and package scripts in `apps/mobile/package.json`; no `.nvmrc` or `engines.node` pin is present.
- Expo Managed Workflow - Required by `stack/tech_stack_mvp.md`; native `ios/` and `android/` projects are intentionally absent.
- React Native 0.86.0 - Mobile runtime declared in `apps/mobile/package.json`.
- React 19.2.3 - UI runtime declared in `apps/mobile/package.json`.
- Deno 2.0+ - Required by `stack/tech_stack_mvp.md` for Supabase Edge Functions in `supabase/functions`.
- PostgreSQL - Supabase database runtime represented by migrations in `supabase/migrations`.

**Package Manager:**
- npm - `apps/mobile/package-lock.json` is present and `apps/mobile/package.json` scripts use npm-compatible commands.
- Lockfile: present at `apps/mobile/package-lock.json`; root `package-lock.json` is an empty lockfile shell and there is no root `package.json`.

## Frameworks

**Core:**
- Expo SDK 57 (`expo` `^57.0.1`) - Managed mobile runtime and development tooling in `apps/mobile/package.json`.
- Expo Router (`expo-router` `~57.0.2`) - File-based navigation; app routes live under `apps/mobile/app`.
- React Native 0.86.0 - Mobile UI framework for presentation code in `apps/mobile/src/presentation`.
- Supabase JS (`@supabase/supabase-js` `^2.107.0`) - Auth, PostgREST, and Edge Function client in `apps/mobile/src/infrastructure/supabase`.
- Supabase Edge Functions - Serverless backend boundary under `supabase/functions`.
- Vercel AI SDK via Deno npm specifiers (`npm:ai`, `npm:@ai-sdk/openai`) - AI orchestration in `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/generate-series-setup/index.ts`.

**Testing:**
- Node test runner through `tsx --test` - Configured by `apps/mobile/package.json` as `npm run test`, targeting `src/**/*.test.ts`.
- `tsx` `^4.22.4` - Executes TypeScript tests without a separate Jest/Vitest config.
- Edge Function tests also use TypeScript test files under `supabase/functions/**/*.test.ts`, but no dedicated Supabase/Deno test script is declared in `apps/mobile/package.json`.

**Build/Dev:**
- Expo CLI - `npm run start`, `npm run ios`, `npm run android`, `npm run web`, and `npm run build` are defined in `apps/mobile/package.json`.
- TypeScript `~6.0.3` - Strict typechecking via `npm run typecheck`.
- ESLint `^9.39.4` with `eslint-config-expo` `~57.0.0` - Linting via `apps/mobile/eslint.config.js`.
- Metro - Expo Metro config in `apps/mobile/metro.config.js` watches the repo root so the app can consume files from the workspace.

## Key Dependencies

**Critical:**
- `expo` `^57.0.1` - Core managed runtime for the mobile MVP in `apps/mobile`.
- `expo-router` `~57.0.2` - Navigation entry point declared as `expo-router/entry` in `apps/mobile/package.json`.
- `@supabase/supabase-js` `^2.107.0` - Required for Supabase Auth, table sync, and Edge Function invocation in `apps/mobile/src/infrastructure/supabase`.
- `@react-native-async-storage/async-storage` `2.2.0` - Local-first storage for sessions, series, episodes, word sets, learning signals, preferences, and sync queue in `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`, and `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
- `zod` `^4.4.3` - Runtime validation for AI payloads, remote records, and gateway responses in `apps/mobile/src/application/ai/episodeAiPayload.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, and `apps/mobile/src/infrastructure/supabase/supabaseSeriesSetupDraftGateway.ts`.
- `expo-speech` `~57.0.0` - Native device TTS boundary implemented by `apps/mobile/src/infrastructure/audio/expoSpeechAudioNarrator.ts`.
- `expo-network` `~57.0.0` - Connectivity checks implemented by `apps/mobile/src/infrastructure/network/expoNetworkStatus.ts`.

**Infrastructure:**
- `expo-font`, `@expo-google-fonts/baloo-2`, `@expo-google-fonts/nunito` - Font loading and typography support for the presentation theme in `apps/mobile/src/presentation/theme`.
- `expo-blur`, `expo-linear-gradient`, `expo-splash-screen`, `expo-status-bar` - Expo UI/runtime helpers declared in `apps/mobile/package.json` and configured in `apps/mobile/app.json`.
- `react-native-safe-area-context`, `react-native-screens`, `@react-native-segmented-control/segmented-control` - Mobile UI primitives declared in `apps/mobile/package.json`.
- `react-native-web` and `react-dom` - Web target support for `npm run web` and `expo export`.
- `npm:ai`, `npm:@ai-sdk/openai`, `npm:zod`, `npm:@supabase/supabase-js` - Deno-native npm imports used directly by Supabase Edge Functions in `supabase/functions`.

## Configuration

**Environment:**
- Mobile Supabase public config is read from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`.
- Server AI config is read from `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/generate-series-setup/index.ts`.
- Edge Function Supabase Auth/database config is read from `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase/functions/_shared/auth.ts` and `supabase/functions/_shared/moderation.ts`.
- `supabase/functions/README.md` documents the required public Expo variables and server secrets by name only.
- No `.env` files were detected at the repo root during this scan.

**Build:**
- `apps/mobile/package.json` defines canonical commands:
  - `npm run start` - start Expo dev server.
  - `npm run ios` - start Expo for iOS through Expo Go.
  - `npm run android` - start Expo for Android.
  - `npm run web` - start Expo web.
  - `npm run lint` - run ESLint.
  - `npm run test` - run TypeScript tests with `tsx --test`.
  - `npm run typecheck` - run TypeScript with `--noEmit`.
  - `npm run build` - run `expo export`.
- `apps/mobile/tsconfig.json` extends `expo/tsconfig.base`, enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitOverride`, and defines aliases `@/*`, `@application/*`, `@domain/*`, `@infrastructure/*`, and `@presentation/*`.
- `apps/mobile/eslint.config.js` uses Expo's flat ESLint config and disables `react-hooks/purity` and `react-hooks/set-state-in-effect`.
- `apps/mobile/app.json` configures the Expo app name, slug, scheme, portrait orientation, automatic interface style, assets, and plugins `expo-router`, `expo-font`, and `expo-splash-screen`.
- `apps/mobile/metro.config.js` adds the repo root to `watchFolders`.
- `supabase/migrations/*.sql` are the database migration source of truth; no `supabase/config.toml` was detected.

## Platform Requirements

**Development:**
- Use Windows-compatible Expo development; `stack/tech_stack_mvp.md` names Windows 11 plus iPhone testing through Expo Go as the target development path.
- Use Expo Managed Workflow only; do not add native `ios/` or `android/` directories.
- Run app commands from `apps/mobile`, because that is where `package.json`, `package-lock.json`, and `node_modules` live.
- Keep Oxford vocabulary local and bundled through `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`; do not fetch the seed list at runtime.
- Keep local-first behavior through AsyncStorage adapters in `apps/mobile/src/infrastructure/series` and `apps/mobile/src/infrastructure/sync`.

**Production:**
- Mobile production builds are intended for EAS remote cloud builds per `stack/tech_stack_mvp.md`; no `eas.json` was detected in the repo.
- Backend deployment target is Supabase: PostgreSQL migrations in `supabase/migrations` and Edge Functions in `supabase/functions`.
- AI provider access is server-only through Supabase Edge Functions and OpenRouter; the mobile app must never call OpenRouter or other LLM APIs directly.
- Remote persistence depends on Supabase RLS policies in `supabase/migrations/20260606190000_create_sync_tables.sql` and moderation migrations in `supabase/migrations/20260610090000_create_user_restrictions.sql`, `supabase/migrations/20260610094000_create_user_moderation_state.sql`, and related RPC migrations.

---

*Stack analysis: 2026-07-01*
