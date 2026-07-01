# Codebase Structure

**Analysis Date:** 2026-07-01

## Directory Layout

```text
learn-english/
├── AGENTS.md                         # Repository operating rules for Codex and GSD
├── package-lock.json                 # Root npm lock placeholder
├── apps/
│   └── mobile/                       # Expo React Native app
│       ├── app/                      # Expo Router route files and layouts
│       ├── assets/                   # App icons and splash assets
│       ├── src/
│       │   ├── application/          # Use cases, ports, AI contracts, sync policies
│       │   ├── domain/               # Framework-free domain model types
│       │   ├── infrastructure/       # AsyncStorage, Supabase, Expo, vocabulary adapters
│       │   └── presentation/         # Theme, app screens, shared components, auth UI
│       ├── app.json                  # Expo Managed Workflow configuration
│       ├── eslint.config.js          # ESLint configuration
│       ├── metro.config.js           # Metro bundler configuration
│       ├── package.json              # Mobile dependencies and scripts
│       └── tsconfig.json             # Strict TypeScript and path aliases
├── supabase/
│   ├── functions/                    # Deno Edge Functions and shared backend modules
│   └── migrations/                   # Supabase PostgreSQL schema migrations
├── architecture/                     # Canonical implementation architecture artifacts
├── concept/                          # Product scope, PRD, concept, and flow artifacts
├── design/                           # Visual system and screen reference artifacts
├── stack/                            # Technology stack artifact
├── words/                            # Root Oxford 5000 seed source
├── analysis/                         # Market or research artifacts
└── .planning/codebase/               # Generated codebase maps for GSD workflows
```

## Directory Purposes

**`apps/mobile`:**
- Purpose: Expo Managed Workflow mobile application for Context English.
- Contains: Expo Router routes in `apps/mobile/app`, production source in `apps/mobile/src`, assets in `apps/mobile/assets`, package/config files, generated `dist`, installed `node_modules`, and local Expo metadata.
- Key files: `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/tsconfig.json`, `apps/mobile/index.ts`, `apps/mobile/App.tsx`, `apps/mobile/app/_layout.tsx`.

**`apps/mobile/app`:**
- Purpose: File-based route layer for Expo Router.
- Contains: Root stack layout, tab layout, home/dictionary/settings tabs, series detail route, daily session route, episode reader route, and dictionary detail sheet route.
- Key files: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(tabs)/dictionary.tsx`, `apps/mobile/app/(tabs)/settings.tsx`, `apps/mobile/app/daily-session.tsx`, `apps/mobile/app/episode-reader.tsx`, `apps/mobile/app/series-details.tsx`, `apps/mobile/app/dictionary-word-details.tsx`.

**`apps/mobile/src/domain`:**
- Purpose: Define application concepts without React Native, Supabase, AsyncStorage, Expo, or AI SDK dependencies.
- Contains: `models` folder and `index.ts` barrel.
- Key files: `apps/mobile/src/domain/models/series.ts`, `apps/mobile/src/domain/models/episode.ts`, `apps/mobile/src/domain/models/seriesMemory.ts`, `apps/mobile/src/domain/models/wordSet.ts`, `apps/mobile/src/domain/models/learningSignal.ts`, `apps/mobile/src/domain/index.ts`.

**`apps/mobile/src/application`:**
- Purpose: Hold use cases, ports, sync policies, AI payload contracts, and application-level errors.
- Contains: `useCases`, `ports`, `sync`, `ai`, `errors`, and `index.ts` barrel.
- Key files: `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/application/useCases/generateEpisode.ts`, `apps/mobile/src/application/useCases/submitEpisodeInteraction.ts`, `apps/mobile/src/application/useCases/syncLocalChanges.ts`, `apps/mobile/src/application/ports/localSeriesStore.ts`, `apps/mobile/src/application/ai/episodeAiPayload.ts`.

**`apps/mobile/src/infrastructure`:**
- Purpose: Implement application ports with concrete adapters.
- Contains: `audio`, `network`, `series`, `supabase`, `sync`, `time`, `vocabulary`, and `index.ts` barrel.
- Key files: `apps/mobile/src/infrastructure/series/asyncStorageLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/queuedLocalSeriesStore.ts`, `apps/mobile/src/infrastructure/sync/asyncStorageSyncQueue.ts`, `apps/mobile/src/infrastructure/supabase/supabaseClient.ts`, `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`, `apps/mobile/src/infrastructure/vocabulary/bundledOxfordVocabularyCatalog.ts`.

**`apps/mobile/src/presentation`:**
- Purpose: Render React Native UI, app theme, auth shell, shared UI, and screen-level state.
- Contains: `theme` tokens/fonts, `app` folder with screens, shared components, auth components, services, styles, and app exports.
- Key files: `apps/mobile/src/presentation/app/services/localAppServices.ts`, `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`, `apps/mobile/src/presentation/app/screens/DailySessionScreen.tsx`, `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`, `apps/mobile/src/presentation/app/screens/SeriesDetailsScreen.tsx`, `apps/mobile/src/presentation/theme/tokens.ts`, `apps/mobile/src/presentation/app/useAppStyles.ts`.

**`apps/mobile/src/presentation/app/shared`:**
- Purpose: Store reusable presentation components used across routes.
- Contains: Folder-based reusable components with `index.ts` exports and simple shared files.
- Key files: `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`, `apps/mobile/src/presentation/app/shared/SorbetBackground/SorbetBackground.tsx`, `apps/mobile/src/presentation/app/shared/SorbetTabBar/SorbetTabBar.tsx`, `apps/mobile/src/presentation/app/shared/RouteScreen.tsx`, `apps/mobile/src/presentation/app/shared/LevelBadge.tsx`, `apps/mobile/src/presentation/app/shared/index.ts`.

**`supabase/functions`:**
- Purpose: Deno Edge Functions for AI, moderation, auth-bound backend logic, and shared Edge helpers.
- Contains: Function directories and `_shared` modules.
- Key files: `supabase/functions/README.md`, `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, `supabase/functions/generate-series-setup/index.ts`, `supabase/functions/validate-series-setup/index.ts`, `supabase/functions/_shared/episodeContracts.ts`, `supabase/functions/_shared/episodeFinalizers.ts`, `supabase/functions/_shared/auth.ts`, `supabase/functions/_shared/moderation.ts`, `supabase/functions/_shared/http.ts`.

**`supabase/migrations`:**
- Purpose: Versioned PostgreSQL schema for user-owned sync records and moderation state.
- Contains: Timestamped SQL migrations.
- Key files: `supabase/migrations/20260606190000_create_sync_tables.sql`, `supabase/migrations/20260607013000_add_episode_sentence_frames.sql`, `supabase/migrations/20260610090000_create_user_restrictions.sql`, `supabase/migrations/20260610113000_create_series_setup_moderation_attempts.sql`, `supabase/migrations/20260611010000_add_series_participation_mode.sql`, `supabase/migrations/20260630040000_add_series_character_profiles.sql`.

**`architecture`:**
- Purpose: Canonical and supporting architecture references for agents and developers.
- Contains: Markdown implementation contract and HTML visual architecture reference.
- Key files: `architecture/architecture_for_ai.md`, `architecture/architecture_for_developer.html`.

**`concept`:**
- Purpose: Product scope and user-flow references.
- Contains: MVP PRD, concept HTML, and user flow schema.
- Key files: `concept/prd_concept_mvp.md`, `concept/concept.html`, `concept/user_flow_schema.md`.

**`design`:**
- Purpose: Design system, UI guidelines, and screen HTML references.
- Contains: Visual system HTML/Markdown and screen reference subdirectories.
- Key files: `design/design_system.html`, `design/design_system_guidelines.md`, `design/main_screen/index.html`, `design/dictionary_screen/index.html`, `design/story_dialogue_ui/index.html`.

**`stack`:**
- Purpose: Canonical technology stack and runtime constraints.
- Contains: MVP technical stack document.
- Key files: `stack/tech_stack_mvp.md`.

**`words`:**
- Purpose: Root read-only Oxford 5000 seed artifact.
- Contains: Source JSON vocabulary seed.
- Key files: `words/oxford-5000.json`.

**`.planning/codebase`:**
- Purpose: GSD-consumable codebase maps generated by mapper agents.
- Contains: Architecture and structure documents for this focus, plus other focus documents when generated.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

## Key File Locations

**Entry Points:**
- `apps/mobile/package.json`: Declares `expo-router/entry` as the mobile app main entry and defines scripts.
- `apps/mobile/index.ts`: Registers the root component for Expo.
- `apps/mobile/App.tsx`: Exists as the registered component shim; Expo Router owns actual UI through `app`.
- `apps/mobile/app/_layout.tsx`: Root layout, providers, stack routes, fonts, and splash handling.
- `apps/mobile/app/(tabs)/_layout.tsx`: Main tab shell and custom tab bar.
- `supabase/functions/generate-episode/index.ts`: Edge Function entry point for episode generation.
- `supabase/functions/submit-interaction/index.ts`: Edge Function entry point for episode continuation and feedback.
- `supabase/functions/generate-series-setup/index.ts`: Edge Function entry point for setup draft generation.
- `supabase/functions/validate-series-setup/index.ts`: Edge Function entry point for setup moderation.

**Configuration:**
- `apps/mobile/package.json`: Mobile dependencies and `start`, `ios`, `android`, `web`, `lint`, `test`, `typecheck`, and `build` commands.
- `apps/mobile/tsconfig.json`: Strict TypeScript options and path aliases.
- `apps/mobile/app.json`: Expo app metadata, plugins, icons, scheme, platform config, and Managed Workflow settings.
- `apps/mobile/eslint.config.js`: ESLint configuration.
- `apps/mobile/metro.config.js`: Metro bundler configuration.
- `apps/mobile/.env`: Present for local Expo public environment configuration; do not read or quote contents.
- `supabase/functions/README.md`: Documents Edge Function names and required env var names.

**Core Logic:**
- `apps/mobile/src/application/useCases`: Add application flows here.
- `apps/mobile/src/application/ports`: Add narrow external capability contracts here.
- `apps/mobile/src/domain/models`: Add framework-free record and value types here.
- `apps/mobile/src/infrastructure`: Add concrete adapters here.
- `apps/mobile/src/presentation/app/services/localAppServices.ts`: Wire new production use cases and adapters here.
- `supabase/functions/_shared`: Add shared Edge validation, HTTP, auth, moderation, and finalization helpers here.

**Testing:**
- `apps/mobile/src/application/**/*.test.ts`: Mobile application use case and sync tests.
- `supabase/functions/**/*.test.ts`: Deno tests for Edge helper logic and pure support modules.
- `apps/mobile/package.json`: `npm test` runs `tsx --test "src/**/*.test.ts"` for mobile tests.

**Data And Assets:**
- `apps/mobile/src/infrastructure/vocabulary/oxford-5000.json`: Bundled vocabulary copy used by the mobile app.
- `words/oxford-5000.json`: Root seed artifact.
- `apps/mobile/assets`: Expo icon, splash, favicon, and Android adaptive icon assets.

## Naming Conventions

**Files:**
- Route files use Expo Router names: `_layout.tsx`, `index.tsx`, `series-details.tsx`, `episode-reader.tsx`, and grouped folders like `app/(tabs)`.
- Screen components use PascalCase with `Screen` suffix: `HomeScreen.tsx`, `EpisodeReaderScreen.tsx`, `DailySessionScreen.tsx`.
- Reusable component folders use PascalCase with matching component file and `index.ts`: `JellyPressable/JellyPressable.tsx`, `SorbetTabBar/SorbetTabBar.tsx`.
- Use cases use camelCase action names and export `createX` factories: `createSeries.ts`, `generateEpisode.ts`, `syncLocalChanges.ts`.
- Ports use camelCase capability names: `localSeriesStore.ts`, `episodeGenerationGateway.ts`, `networkStatus.ts`.
- Domain model files use camelCase noun names: `series.ts`, `episode.ts`, `learningSignal.ts`, `seriesMemory.ts`.
- Infrastructure adapters include technology or provider in the filename: `asyncStorageLocalSeriesStore.ts`, `supabaseEpisodeGenerationGateway.ts`, `expoSpeechAudioNarrator.ts`, `bundledOxfordVocabularyCatalog.ts`.
- Tests colocate with source and use `.test.ts`: `syncQueuePolicy.test.ts`, `generateEpisode.test.ts`, `episodeFinalizers.test.ts`.
- Supabase migrations use timestamp prefix and snake_case description: `20260630040000_add_series_character_profiles.sql`.

**Directories:**
- Architecture layers are lowercase: `domain`, `application`, `infrastructure`, `presentation`.
- Application subdirectories are capability-based: `useCases`, `ports`, `sync`, `ai`, `errors`.
- Infrastructure subdirectories are provider or capability-based: `supabase`, `series`, `sync`, `vocabulary`, `audio`, `network`, `time`.
- Presentation feature folders are grouped under `screens`, `shared`, `auth`, `theme`, and `services`.
- Edge Function directories use kebab-case names matching Supabase Function names: `generate-episode`, `submit-interaction`, `generate-series-setup`, `validate-series-setup`.

## Where to Add New Code

**New Mobile Feature:**
- Primary code: Add user intent logic in `apps/mobile/src/application/useCases`.
- Domain types: Add or update framework-free records in `apps/mobile/src/domain/models`.
- Ports: Add narrow external capability contracts in `apps/mobile/src/application/ports`.
- Infrastructure: Implement ports in the relevant `apps/mobile/src/infrastructure/<capability>` directory.
- Presentation: Add route files in `apps/mobile/app` and screens/components in `apps/mobile/src/presentation/app`.
- Composition: Wire the use case and adapters in `apps/mobile/src/presentation/app/services/localAppServices.ts`.
- Tests: Add colocated `.test.ts` files under `apps/mobile/src/application`.

**New Screen Route:**
- Route entry: Add file in `apps/mobile/app`, using Expo Router naming.
- Screen implementation: Add `apps/mobile/src/presentation/app/screens/<Name>Screen.tsx`.
- Exports: Update `apps/mobile/src/presentation/app/screens/index.ts` and, when needed, `apps/mobile/src/presentation/app/index.ts`.
- Shared UI: Add reusable controls under `apps/mobile/src/presentation/app/shared/<ComponentName>` with `index.ts`.

**New Component/Module:**
- Implementation: Use a focused folder under `apps/mobile/src/presentation/app/shared/<ComponentName>` for reusable UI or the relevant screen subfolder for screen-local components.
- Exports: Add `index.ts` for reusable component folders and import through the public barrel.
- Styles: Follow existing `AppStyles` from `apps/mobile/src/presentation/app/types.ts` and theme tokens from `apps/mobile/src/presentation/theme/tokens.ts`.

**New Use Case:**
- Implementation: Add `apps/mobile/src/application/useCases/<actionName>.ts`.
- Contract: Export `Input`, `Result`, use-case type, and `create<ActionName>` factory returning an `execute` method.
- Ports: Depend only on port types from `apps/mobile/src/application/ports` and domain types from `apps/mobile/src/domain`.
- Exports: Update `apps/mobile/src/application/useCases/index.ts` and `apps/mobile/src/application/index.ts`.
- Wiring: Instantiate in `apps/mobile/src/presentation/app/services/localAppServices.ts`.

**New Port And Adapter:**
- Port: Add `apps/mobile/src/application/ports/<capability>.ts`.
- Adapter: Add implementation under the appropriate `apps/mobile/src/infrastructure/<provider-or-capability>` directory.
- Exports: Update `apps/mobile/src/application/ports/index.ts`, `apps/mobile/src/infrastructure/<folder>/index.ts`, and `apps/mobile/src/infrastructure/index.ts`.
- Wiring: Inject the adapter in `apps/mobile/src/presentation/app/services/localAppServices.ts`.

**New Supabase Edge Function:**
- Entry point: Add `supabase/functions/<function-name>/index.ts`.
- Shared contracts: Add reusable schemas to `supabase/functions/_shared` when more than one function needs them.
- Mobile gateway: Add a port in `apps/mobile/src/application/ports` and adapter in `apps/mobile/src/infrastructure/supabase`.
- Client validation: Parse response data in `apps/mobile/src/application/ai` or a focused application contract module before returning it to use cases.
- Docs: Update `supabase/functions/README.md` with function name and required env var names.

**Database Schema Change:**
- Migration: Add a timestamped SQL file to `supabase/migrations`.
- Mobile mapping: Update `apps/mobile/src/infrastructure/supabase/remoteRecordMapper.ts`.
- Domain contract: Update `apps/mobile/src/domain/models` only when the local domain record changes.
- Sync logic: Update `apps/mobile/src/application/ports/remoteSeriesStore.ts`, `apps/mobile/src/application/ports/syncQueue.ts`, and `apps/mobile/src/application/useCases/syncLocalChanges.ts` when record kinds or ordering change.

**Utilities:**
- Shared application helpers: `apps/mobile/src/application/<area>`.
- Domain helpers: `apps/mobile/src/domain/models` or `apps/mobile/src/domain/index.ts` only when framework-free.
- Edge-only helpers: `supabase/functions/_shared`.
- Presentation-only helpers: `apps/mobile/src/presentation/app/<area>` or screen-local subfolders.
- Avoid generic root utility folders unless a clear existing layer owns the helper.

## Special Directories

**`apps/mobile/node_modules`:**
- Purpose: Installed mobile dependencies.
- Generated: Yes.
- Committed: No.

**`apps/mobile/dist`:**
- Purpose: Output from Expo export/build.
- Generated: Yes.
- Committed: No.

**`apps/mobile/.expo`:**
- Purpose: Expo local state, logs, and development metadata.
- Generated: Yes.
- Committed: No.

**`apps/mobile/assets`:**
- Purpose: App icon, splash, favicon, and adaptive icon images.
- Generated: No.
- Committed: Yes.

**`apps/mobile/src/infrastructure/vocabulary`:**
- Purpose: Bundled app vocabulary adapter and app-local Oxford JSON copy.
- Generated: No.
- Committed: Yes.

**`words`:**
- Purpose: Root read-only vocabulary seed artifact used by project scope.
- Generated: No.
- Committed: Yes.

**`design/*`:**
- Purpose: HTML and Markdown design references for UI work.
- Generated: No.
- Committed: Yes.

**`.codex` and `.agents`:**
- Purpose: Runtime-specific GSD workflow, agent, hook, and skill definitions.
- Generated: Tooling-managed.
- Committed: Project-dependent; treat as process/tooling, not app runtime code.

**`.planning`:**
- Purpose: GSD planning state and generated codebase intelligence.
- Generated: Yes.
- Committed: Project-dependent planning artifacts.

---

*Structure analysis: 2026-07-01*
