# Architecture Guide for AI Agents - Context-English Series MVP

This document is the implementation architecture contract for AI coding agents. It describes the architecture, boundaries, dependency direction, runtime flows, and non-negotiable product rules for the redesigned AI-series MVP.

This is an architecture document, not a folder-structure document.

## Source Of Truth

Follow the project artifacts in this priority order:

1. `concept/prd_concept_mvp.md` - canonical product scope and MVP behavior.
2. `stack/tech_stack_mvp.md` - canonical technology choices and runtime constraints.
3. `architecture/architecture_for_ai.md` - canonical implementation boundaries and dependency rules.
4. `architecture/architecture_for_developer.html` - supporting visual architecture reference.
5. `design/design_system.html` and `design/design_system_guidelines.md` - visual and interaction rules.
6. `concept/concept.html` - supporting product explanation.
7. `words/oxford-5000.json` - bundled read-only vocabulary seed.

If these artifacts conflict, do not silently resolve the conflict. Stop and ask for clarification.

## Product Architecture Summary

The MVP is no longer a flashcard-first vocabulary trainer. The main product object is a personal English AI series.

The core loop is:

```text
Create or continue a personal series
  -> choose a small set of Story Words
  -> generate a short level-safe episode
  -> read and listen
  -> interact through a choice or short reply
  -> receive concise story-friendly feedback
  -> persist episode, memory, words, and learning signals locally first
  -> sync when possible
```

The product must feel like continuing a personal series, not like servicing a vocabulary queue.

## Architectural Style

Use a pragmatic Clean Architecture variant adapted to React Native, Expo, Supabase, and server-side AI generation.

Dependency direction:

```text
Presentation -> Application -> Domain <- Infrastructure
       |              |             ^
       |              v             |
       +------ uses ports ----------+
```

Rules:

- Domain depends on no app-specific framework, SDK, persistence, or UI code.
- Application depends on Domain and ports.
- Presentation depends on Application contracts, view models, and design tokens.
- Infrastructure implements ports and may depend on concrete SDKs.
- Supabase Edge Functions are a backend AI boundary, not a hidden mobile layer.

React Native components must not call Supabase tables, Edge Functions, AsyncStorage, Expo Speech, network APIs, or Oxford JSON parsing directly. They must call application use cases or presentation-facing facades that use application use cases.

## Core Domain Model

Keep the domain explicit and close to the MVP.

### Series

A user-created story container:

- id;
- owner id when authenticated;
- title;
- genre;
- CEFR level;
- tone or mood;
- premise;
- participation mode;
- main characters or user role;
- compact series memory;
- sync metadata.

Domain rules:

- A series is the continuity root for episodes.
- New episodes continue the same series instead of starting unrelated texts.
- Series memory is compact and bounded; do not model full unbounded chat history as required AI context.
- Series settings must support safe original stories, not direct copies of copyrighted worlds.
- Participation mode is either `director` or `character`.
- `director` is the internal code value for Producer mode and means learner input directs events from outside the story.
- `character` means learner input is interpreted as the user's character speech, action, question, or plan.
- Participation mode can be changed only before the first generated episode. After the first episode exists, it is read-only for that series.
- Series setup text fields are required before saving: title, premise, main characters, and `userRole` for `character`.
- Generate setup draft is an online-only AI action before the first episode. It may generate missing text fields, including title, but must not generate or change CEFR level, genre, tone, or participation mode.
- Character mode requires `userRole` before episode generation. If role or setup context is missing before the first episode, Generate may create a complete bounded setup draft; the user may regenerate or edit that draft before the first episode.
- Opening an existing series must expose a setup menu with the same fields. It is editable only while the series has no episodes and read-only after the first generated episode.

### Episode

A generated learning unit linked to a series:

- episode id;
- series id;
- optional "previously" recap;
- main scene or dialogue;
- sentence list;
- selected Story Words;
- inline translation annotations;
- ordered interaction turns;
- user choices or short replies for completed turns;
- concise feedback or correction for each completed turn;
- current episode completion state;
- cliffhanger or unresolved hook;
- summary update for future memory;
- sync metadata.

Domain rules:

- Episode length is adaptive. It must be concise enough for a comfortable learning session and substantial enough to develop the scene, use Story Words naturally across the episode arc, and support meaningful interaction. Do not enforce a fixed word-count range.
- The episode must respect the series CEFR level.
- The episode must use selected Story Words naturally across the full episode arc. The initial generated scene may use only part of the selected set, and later same-episode continuations should introduce remaining words naturally.
- An episode normally contains 5-10 meaningful learner interactions and must not end after only a few routine decisions.
- Every AI continuation must consider the remaining interaction budget so the same episode can close inside the 5-10 interaction window.
- The AI decides when the current episode arc is complete.
- Completing an episode does not complete the overall personal series.
- A completed episode must end with a reason to continue the series.
- AI output is untrusted until validated.

### Word And Word Sets

Vocabulary source:

- Oxford 5000 JSON is bundled locally and read-only.
- It powers dictionary browsing, lightweight Story Words suggestions, and non-LLM dictionary lookups.

Word-set concepts:

- Today's Words;
- Episode Words;
- Series Words.

Domain rules:

- Story Words selection is not a flashcard session or a full vocabulary management module.
- Story Words are chosen for the next episode, not scheduled into a review debt queue.
- The app should not hard-block the number of selected words.
- If the user selects many new words, warn about difficulty.
- "Know it" lowers future suggestion priority but does not create permanent mastery.
- "Later" skips without a negative learning state.

### Learning Signals

Track non-punitive vocabulary events internally:

- encountered;
- selected;
- translated;
- understood;
- used;
- corrected;
- resurfaced;
- stable.

Rules:

- Do not expose a punitive "due reviews" queue.
- Do not create scheduled SRS review debt.
- Missed days must not accumulate backlog.
- Previously encountered words may resurface naturally when they fit the story, level, and selected word set.

### Series Memory

Compact continuity state:

- premise;
- genre;
- tone;
- participation mode;
- main characters;
- user role;
- current conflict;
- known facts;
- open questions;
- important objects or locations;
- last episode summary;
- unresolved cliffhanger;
- recurring Story Words.

Rules:

- Use memory and summaries for model context.
- Do not send unbounded full episode history to the model.
- Memory updates are generated by AI but validated before storage.

## Application Layer

Application use cases coordinate user intent. They own flow logic and depend on ports, not SDKs.

Required MVP use cases:

- Load bundled vocabulary and build deterministic indexes.
- Browse/search vocabulary for dictionary and Story Words selection.
- Create a series.
- Update series settings when allowed by product scope.
- List local series.
- Open a series and load its episodes, memory, word sets, and learning signals.
- Build lightweight Story Words suggestions from vocabulary, series context, prior signals, and level.
- Apply Story Words actions: use in episode, know it, later, remove.
- Assemble Episode Words for the next episode.
- Generate an episode through an Edge Function when online.
- Validate and persist generated episode locally first.
- Play or pause episode audio sentence by sentence.
- Open inline translation for any episode word.
- Record translation/usage/correction learning signals locally.
- Submit a choice or short reply for an episode interaction.
- Request AI continuation/correction through an Edge Function when online.
- Persist user reply, feedback, episode continuation, memory update, and signals locally first.
- Queue local changes for sync.
- Sync series, episodes, memory, word sets, signals, preferences, and sync metadata with Supabase.

Use case inputs and outputs must be typed plain data. Do not leak React state, Supabase response shapes, AsyncStorage keys, Edge Function transport details, or raw SDK errors through use-case boundaries.

## Ports And Dependency Inversion

Define narrow application-facing ports for external capabilities.

| Port | Responsibility | Typical MVP implementation |
| --- | --- | --- |
| VocabularyCatalog | Load/query bundled Oxford 5000 data | Local JSON adapter |
| LocalSeriesStore | Persist series, episodes, memory, word sets, signals, preferences | AsyncStorage adapter |
| RemoteSeriesStore | Read/write authenticated cloud records | Supabase adapter with RLS |
| SyncQueue | Store pending local operations and sync metadata | AsyncStorage metadata adapter |
| EpisodeGenerationGateway | Generate validated episode payloads | Supabase Edge Function client |
| InteractionGateway | Continue episode and correct short user input | Supabase Edge Function client |
| GrammarGateway | Provide grammar-style explanation when requested | Supabase Edge Function client |
| AudioNarrator | Speak sentence list and report progress | `expo-speech` adapter |
| NetworkStatus | Report online/offline capability | Expo/React Native network adapter |
| AuthSessionProvider | Expose user and JWT state | Supabase Auth adapter |
| Clock | Provide timestamps for conflict handling | System clock adapter |
| IdGenerator | Create local ids before sync | UUID or platform-safe generator |

Ports should be shaped around use cases, not vendor APIs. Avoid broad service objects.

## Presentation Layer

React Native presentation code should stay thin:

- Render screen state and component state.
- Forward user intent to application actions.
- Show loading, empty, success, offline, validation, and error states.
- Preserve the Sorbet soft-pop UI language from the design artifacts: shared atmospheric background, dimensional bubble surfaces, light/dark theme support, restrained spring motion, and iOS-friendly ergonomics.
- Keep story reading, inline translation, audio controls, Story Words selection, and bottom sheets accessible.

Presentation must not own:

- story generation rules;
- CEFR constraints;
- AI prompt or validation logic;
- Story Words suggestion rules;
- sync conflict handling;
- local persistence keys;
- Supabase table contracts;
- copyright/safety enforcement.

Recommended presentation state categories:

- screen state: loading, ready, empty, offline, error;
- series state: selected series, selected episode, memory summary preview;
- Story Words state: suggested words, selected words, warning about difficulty;
- episode reader state: selected word hint, selected sentence, current sentence index;
- interaction state: choice selected, reply draft, feedback visible;
- sync state: local only, syncing, synced, failed.

## Infrastructure Layer

Infrastructure implements ports and owns concrete SDK details.

Rules:

- Load `words/oxford-5000.json` from the app bundle only.
- Validate bundled vocabulary shape before creating domain values.
- Prefer `@react-native-async-storage/async-storage` for MVP local records.
- Move to `expo-sqlite` only if AsyncStorage becomes insufficient for local episode history or indexing.
- Instantiate Supabase client with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Keep all LLM secrets, prompts, provider settings, model choices, and validation logic out of the mobile app.
- All AI calls go through Supabase Edge Functions.
- All cloud records are protected by Supabase RLS.
- Treat local storage, remote records, user input, and AI output as untrusted at boundaries.

## Backend Boundary: Supabase Edge Functions

Edge Functions are the AI backend and trust boundary for model access.

Responsibilities:

- Authenticate requests when user state is needed.
- Validate request payloads.
- Enforce copyright and safety constraints.
- Build bounded model context from compact series memory, recent summary, selected Story Words, user level, genre, tone, and output schema.
- Never send unbounded full series history.
- Call OpenRouter using server-side secrets only.
- Use Vercel AI SDK structured JSON output.
- For weak or budget models, decompose complex continuation generation into smaller model tasks such as core continuation, next-choice writing, sentence-frame labeling, and translation enrichment, then assemble one final validated payload inside the Edge Function.
- Run Episode Writer and Language/Safety Validator flow when required.
- Validate episode length, CEFR fit, word usage, continuity, interaction point, cliffhanger, annotations, feedback, and memory update.
- Return typed error categories safe for the client.

The mobile app must validate Edge Function response shape again before rendering or storing data.

## Offline-First Persistence

Local write invariant:

```text
User action
  -> validate input
  -> write local record
  -> update UI
  -> append sync operation
  -> attempt remote sync when online and authenticated
```

Offline-capable:

- Existing series list.
- Already-generated episodes.
- Episode reading and local audio playback.
- Story Words selection from bundled Oxford 5000.
- Locally saved word sets.
- Learning signals.
- Preferences.
- Local edits that do not require AI.

Online-only:

- Episode generation.
- AI continuation.
- AI correction.
- Grammar-style explanations.
- Cloud sync.

Offline UI rule:

- Server-only actions must show explicit "available when online" states.
- Do not silently fail and do not fake AI generation on device.

## Sync And Conflict Handling

Remote Supabase data is a cloud copy for backup and cross-device use. Local data remains the immediate UI source for responsiveness.

Sync rules:

- Every locally changed record carries sync metadata.
- Pending operations are replayed when online and authenticated.
- Conflicts are resolved deterministically using timestamps or explicit operation ordering.
- Do not overwrite newer local offline records with stale remote state.
- Validate user ownership before applying remote data.
- Validate allowed state transitions before applying local or remote operations.

Records that must sync when implemented:

- series;
- episodes;
- series memory;
- word sets;
- learning signals;
- preferences;
- sync metadata.

## Main Runtime Flows

### Series Creation Flow

```text
User enters title, genre, CEFR level, tone, participation mode, premise, role
  -> CreateSeries use case
  -> validate scope and safety-sensitive inputs
  -> create compact initial memory
  -> write local series
  -> queue sync
  -> show new series
```

### Continue Series Flow

```text
Open series
  -> load local episodes, memory, word sets, signals
  -> build lightweight Story Words suggestions
  -> user edits Episode Words
  -> if many difficult words: warn about difficulty
  -> if online: call EpisodeGenerationGateway
  -> Edge Function writes/validates structured episode payload
  -> client validates response shape
  -> write episode, annotations, memory update, and signals locally
  -> queue sync
  -> render episode reader
```

### Episode Interaction Flow

```text
Episode reaches interaction point
  -> user picks choice or writes short reply
  -> local draft/reply saved
  -> if online: call InteractionGateway
  -> Edge Function returns concise correction, continuation, next interaction or episode-complete state, memory update
  -> client validates response and completion transition
  -> write feedback, continuation, ordered interaction turn, signals, memory locally
  -> if episode continues: render the next interaction in the same reader
  -> if episode completes: persist final hook and expose exit/next-episode action
  -> queue sync
```

### Story Words Selection Flow

```text
Load vocabulary index
  -> combine level words, genre words, and simple series words
  -> rank suggestions
  -> user actions: use, know it, later, remove
  -> update Episode Words and learning signals locally
  -> warn when difficulty is high
```

### Audio Flow

```text
Episode sentence list
  -> AudioNarrator.speak(sentence[index])
  -> set currentSentenceIndex
  -> expo-speech onDone
  -> speak next sentence
  -> stop at final sentence or user pause
```

## Error And State Policy

Every user-facing flow must model:

- loading;
- empty;
- ready;
- offline for server-only actions;
- validation error;
- recoverable network error;
- sync failed but local data preserved;
- unexpected error with a safe generic message.

Use typed application errors. Do not expose raw Supabase, OpenRouter, AsyncStorage, schema, or parsing errors directly to users.

## Security, Safety, And Trust Boundaries

Trust boundary rules:

- Bundled Oxford JSON is parsed as external data.
- Local storage is mutable and validated on read.
- Supabase data is remote and validated on read.
- User input is untrusted.
- AI output is untrusted.
- Edge Function request payloads are untrusted.
- Authenticated ownership is enforced by RLS and checked where applicable.

Safety rules:

- Do not generate unsafe content.
- Do not directly copy copyrighted worlds, characters, names, or plots.
- If the user requests a protected franchise, steer to an original story with a similar broad genre or mood.

## SOLID Guidance

- Single Responsibility: UI renders; use cases orchestrate; domain validates; adapters talk to SDKs.
- Open/Closed: new stores, AI providers, or scoring strategies are added behind ports.
- Liskov Substitution: adapters preserve use-case contracts, especially local-first writes.
- Interface Segregation: keep ports narrow and scenario-oriented.
- Dependency Inversion: use cases depend on ports; SDK adapters implement ports.

Avoid over-engineering. Do not introduce Redux, CQRS, event buses, repository layers everywhere, service locators, or large frameworks unless an MVP requirement proves the need.

## Non-Goals For MVP

Do not implement:

- flashcard-first learning as the main flow;
- scheduled SRS review queues;
- user-facing review debt;
- punitive missed-day backlogs;
- placement testing;
- public sharing or publishing of series;
- multiplayer or community worlds;
- voice conversation as the primary interaction mode;
- image, comic, or video generation;
- unvalidated arbitrary vocabulary import;
- native iOS or Android directories;
- direct client calls to OpenRouter or any LLM provider;
- remote loading of Oxford 5000 at runtime;
- direct copying of copyrighted story worlds or characters.

## Implementation Checklist For AI Tasks

Before coding:

- Read the relevant PRD, stack, architecture, and design artifacts.
- Identify verification commands from docs, CI, and manifests.
- Determine affected use cases and ports.
- Confirm whether the affected behavior is offline-capable or online-only.
- Check whether the task touches series, episode, memory, Story Words selection, signals, AI boundary, sync, or UI.

During coding:

- Keep changes scoped to the affected use case.
- Preserve dependency direction.
- Validate all data crossing boundaries.
- Persist local records before remote sync.
- Keep presentation code thin.
- Avoid reintroducing card-first or SRS assumptions.

Before completion:

- Run available lint, typecheck, build, and relevant tests.
- Verify affected flows against the product artifacts.
- Report commands run and anything that remains unverified.
