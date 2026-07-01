# Coding Conventions

**Analysis Date:** 2026-07-01

## Naming Patterns

**Files:**
- Use camelCase for application, domain, infrastructure, and hook modules: `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/application/sync/conflictResolver.ts`, `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`.
- Use PascalCase for React component implementation files and matching component folders: `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`, `apps/mobile/src/presentation/app/auth/AuthGate/AuthGate.tsx`, `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`.
- Use `.test.ts` next to tested logic for mobile application tests: `apps/mobile/src/application/useCases/createSeries.test.ts`, `apps/mobile/src/application/ai/episodeAiPayload.test.ts`.
- Use `.test.ts` next to Supabase Edge Function helpers for Deno tests: `supabase/functions/_shared/episodeFinalizers.test.ts`, `supabase/functions/generate-series-setup/regeneration.test.ts`.
- Use `index.ts` as a public barrel for folders intended to be imported from other layers: `apps/mobile/src/application/index.ts`, `apps/mobile/src/presentation/app/shared/SorbetTabBar/index.ts`, `apps/mobile/src/infrastructure/sync/index.ts`.

**Functions:**
- Use camelCase for functions and factory helpers: `createCreateSeries` in `apps/mobile/src/application/useCases/createSeries.ts`, `resolveConflict` in `apps/mobile/src/application/sync/conflictResolver.ts`, `jsonResponse` in `supabase/functions/_shared/http.ts`.
- Prefix application use case factories with `create`: `createGenerateEpisode` in `apps/mobile/src/application/useCases/generateEpisode.ts`, `createManageAuthSession` in `apps/mobile/src/application/useCases/manageAuthSession.ts`.
- Name React components in PascalCase and return `ReactElement`: `HomeScreen` in `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`, `JellyPressable` in `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`.
- Keep local helper names imperative and specific: `requireText`, `createDirtySync`, `applyMemoryUpdate`, and `resolveStoryWords` in `apps/mobile/src/application/useCases/generateEpisode.ts`.

**Variables:**
- Use camelCase with domain-specific nouns: `seriesId`, `episodeWordSet`, `compactSeriesMemory`, and `generationGenre` in `apps/mobile/src/application/useCases/generateEpisode.ts`.
- Use `readonly` array/object contracts for input, output, and domain data passed across layers: `CreateSeriesInput` in `apps/mobile/src/application/useCases/createSeries.ts`, `VersionedSyncRecord` in `apps/mobile/src/application/sync/conflictResolver.ts`.
- Use `is`, `has`, and `should` prefixes for boolean state and decisions: `isOnline` through `NetworkStatus` in `apps/mobile/src/application/useCases/generateEpisode.ts`, `isCreateOpen` and `isSaving` in `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`.

**Types:**
- Use PascalCase for exported types and interfaces: `CreateSeriesInput`, `CreateSeriesResult`, `ApplicationError`, `EpisodeAiPayload`, and `ModerationReview`.
- Name use case contracts after the action they expose: `CreateSeries` in `apps/mobile/src/application/useCases/createSeries.ts`, `GenerateEpisode` in `apps/mobile/src/application/useCases/generateEpisode.ts`.
- Name ports by capability, not implementation: `LocalSeriesStore`, `EpisodeGenerationGateway`, `NetworkStatus`, and `VocabularyCatalog` in `apps/mobile/src/application/ports/`.
- Use discriminated or literal unions for stable cross-layer categories: `ApplicationErrorKind` in `apps/mobile/src/application/errors/applicationError.ts`, `ConflictWinner` in `apps/mobile/src/application/sync/conflictResolver.ts`.

## Code Style

**Formatting:**
- Formatting tool: Not detected. There is no `.prettierrc`, `prettier.config.*`, or `biome.json` in the repository.
- Preserve the local file's existing quote style. Most mobile files use single quotes, such as `apps/mobile/src/application/useCases/createSeries.ts`; some files use double quotes, such as `apps/mobile/src/application/useCases/generateEpisode.ts` and `supabase/functions/_shared/http.ts`.
- Use two-space indentation in TypeScript and TSX files: `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`.
- Prefer multi-line object and function arguments once a call carries several fields: `createCreateSeries(...)` in `apps/mobile/src/application/useCases/createSeries.test.ts`, `buildEpisode(...)` in `apps/mobile/src/application/useCases/generateEpisode.ts`.
- Keep exported contracts explicitly annotated and accompanied by English comments. This project rule appears throughout `apps/mobile/src/application/useCases/createSeries.ts`, `apps/mobile/src/application/sync/conflictResolver.ts`, and `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`.

**Linting:**
- Tool: ESLint 9 flat config through `apps/mobile/eslint.config.js`.
- Base rules come from Expo: `eslint-config-expo/flat` in `apps/mobile/eslint.config.js`.
- `dist/**` is ignored by ESLint in `apps/mobile/eslint.config.js`.
- React hook lint overrides are explicit: `react-hooks/purity` and `react-hooks/set-state-in-effect` are disabled in `apps/mobile/eslint.config.js`.
- Run from `apps/mobile`: `npm run lint`.

## Import Organization

**Order:**
1. Runtime imports from Node, React, Expo, React Native, Supabase, Zod, and other external packages.
2. Type-only imports from the same external or alias groups when useful, using `import type`.
3. Application aliases by architectural layer: `@application/*`, `@domain/*`, `@infrastructure/*`, `@presentation/*`.
4. Relative imports from the current feature folder, usually after alias imports.

**Path Aliases:**
- `@/*` maps to `apps/mobile/src/*` in `apps/mobile/tsconfig.json`.
- `@application/*` maps to `apps/mobile/src/application/*` in `apps/mobile/tsconfig.json`.
- `@domain/*` maps to `apps/mobile/src/domain/*` in `apps/mobile/tsconfig.json`.
- `@infrastructure/*` maps to `apps/mobile/src/infrastructure/*` in `apps/mobile/tsconfig.json`.
- `@presentation/*` maps to `apps/mobile/src/presentation/*` in `apps/mobile/tsconfig.json`.
- Use aliases for cross-layer imports, as in `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`.
- Use relative imports for same-folder helpers, as in `apps/mobile/src/application/useCases/createSeries.test.ts` importing `./createSeries`.

## Error Handling

**Patterns:**
- Use plain `Error` for application validation failures inside use cases: `requireText` and character-mode validation in `apps/mobile/src/application/useCases/createSeries.ts`.
- Use stable error categories for UI-facing contracts when a use case or adapter needs structured recovery behavior: `ApplicationErrorKind` in `apps/mobile/src/application/errors/applicationError.ts`.
- Validate untrusted AI and network payloads at boundaries with Zod schemas and parser functions: `apps/mobile/src/application/ai/episodeAiPayload.ts`, `supabase/functions/_shared/episodeContracts.ts`.
- Keep provider, schema, and transport details out of client responses from Edge Functions. Use `safeErrorResponse` and `logSafeError` in `supabase/functions/_shared/http.ts`.
- Convert Supabase function failures into app-level errors before returning to use cases: `toSupabaseFunctionError` is used by `apps/mobile/src/infrastructure/supabase/supabaseEpisodeGenerationGateway.ts`.
- UI screens catch errors and map them to local state or alerts: `HomeScreen` catches persistence, generation, and moderation errors in `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`.

## Logging

**Framework:** console

**Patterns:**
- Keep routine mobile application logic silent; mobile use cases such as `apps/mobile/src/application/useCases/createSeries.ts` and `apps/mobile/src/application/useCases/generateEpisode.ts` throw errors instead of logging.
- Use Edge Function logging only through safe helper wrappers: `logSafeError` and `logSafeInfo` in `supabase/functions/_shared/http.ts`.
- Include structured context with Edge Function logs, not raw request bodies or secrets: Edge functions call `logSafeError` from `supabase/functions/generate-episode/index.ts`, `supabase/functions/submit-interaction/index.ts`, and `supabase/functions/generate-series-setup/index.ts`.

## Comments

**When to Comment:**
- Comment exported types, functions, React props, and important parameters with English comments that explain responsibility or boundary meaning: `CreateSeriesInput` in `apps/mobile/src/application/useCases/createSeries.ts`, `JellyPressableProps` in `apps/mobile/src/presentation/app/shared/JellyPressable/JellyPressable.tsx`.
- Comment local helpers when they encode business constraints or cross-layer rules: `createDirtySync` and `resolveStoryWords` in `apps/mobile/src/application/useCases/generateEpisode.ts`.
- Comment test doubles and fixtures to explain what contract they protect: `createMemoryStore` in `apps/mobile/src/application/useCases/createSeries.test.ts`, `generateRequest` in `supabase/functions/_shared/episodeFinalizers.test.ts`.
- Do not add comments that repeat syntax. Comments should name the domain rule, trust boundary, persistence behavior, or test purpose.

**JSDoc/TSDoc:**
- Block JSDoc is not the dominant style. Use concise line comments immediately before exported contracts and helper functions, matching `apps/mobile/src/application/errors/applicationError.ts`.
- Keep comments in English for both TypeScript annotations and business rules, matching project instructions in `AGENTS.md`.

## Function Design

**Size:** Use small helpers for validation, mapping, and persistence metadata when a use case grows multiple branches. `apps/mobile/src/application/useCases/generateEpisode.ts` extracts `buildEpisode`, `applyMemoryUpdate`, `createDirtySync`, `createWordSignal`, `resolveStoryWords`, and `unique`.

**Parameters:** Prefer a single typed object parameter for helpers with several inputs, especially when values share primitive types. Examples include `buildEpisode` and `createWordSignal` in `apps/mobile/src/application/useCases/generateEpisode.ts`.

**Return Values:** Return typed domain or use case result objects rather than raw primitives across layer boundaries. Examples include `CreateSeriesResult` in `apps/mobile/src/application/useCases/createSeries.ts` and `GenerateEpisodeResult` in `apps/mobile/src/application/useCases/generateEpisode.ts`.

## Module Design

**Exports:** Export public use case factories, types, ports, domain models, and component entry points. Keep private helpers unexported unless tests or other modules need the contract, as in `applyMemoryUpdate` from `apps/mobile/src/application/useCases/generateEpisode.ts`.

**Barrel Files:** Use `index.ts` barrel files at layer and component-folder boundaries: `apps/mobile/src/application/index.ts`, `apps/mobile/src/domain/index.ts`, `apps/mobile/src/presentation/app/shared/index.ts`, `apps/mobile/src/presentation/app/screens/index.ts`.

---

*Convention analysis: 2026-07-01*
