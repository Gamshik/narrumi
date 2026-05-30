# Architecture Guide for AI Agents — Context-English MVP

This document is the implementation architecture contract for AI coding agents. It explains the intended architecture, boundaries, dependency direction, and runtime flows without prescribing a concrete folder structure.

## Source Of Truth

When implementing the app, follow these artifacts in this priority order:

1. `concept/prd_concept_mvp.md` — product scope and MVP behavior.
2. `stack/tech_stack_mvp.md` — technology choices and hard constraints.
3. `design/design_system.html` — visual and interaction reference.
4. `concept/concept.html` — supporting product explanation.
5. `words/oxford-5000.json` — bundled read-only vocabulary seed.

If this architecture conflicts with those artifacts, stop and ask for clarification instead of silently choosing one side.

## Architectural Style

Use a pragmatic Clean Architecture variant adapted for React Native and Supabase Edge Functions.

The architecture is organized by responsibility, not by UI screens:

```text
Presentation -> Application -> Domain <- Infrastructure
       |              |             ^
       |              v             |
       +------ uses ports ----------+
```

The dependency rule is strict:

- Domain depends on nothing app-specific.
- Application depends on Domain abstractions and use-case inputs/outputs.
- Presentation depends on Application contracts and view models.
- Infrastructure implements Application/Domain ports and may depend on external SDKs.
- Supabase Edge Functions are a separate backend boundary, not a hidden part of the mobile app.

Do not let UI components call Supabase tables, Edge Functions, AsyncStorage, Expo Speech, network status APIs, or Oxford JSON parsing directly. They must go through application-level use cases or facades.

## Core Domain Model

Keep the domain small and explicit. The MVP domain consists of:

- Learner profile: user id when authenticated, selected CEFR level, learning preferences.
- Vocabulary item: word, part of speech, CEFR level, phonetics, examples, source id.
- Daily learning session: selected 5-7 words, selected genre, story state, quiz state, completion state.
- Learned word progress: local status, review metadata, last update timestamp, dirty/sync metadata.
- Generated story: 100-150 words, sentence list, target word annotations, context-aware translations, quiz questions.
- Grammar explanation: sentence input and concise explanation output.
- Connectivity state: online/offline capability used to gate server-only actions.

Domain objects should encode invariants where practical:

- A daily target word set contains 5-7 words.
- A generated story belongs to a CEFR level and selected genre.
- Story text shown to the user has already passed the Writer -> Validator pipeline.
- Progress changes are persisted locally before remote sync is attempted.
- LLM outputs are untrusted until validated.

## Application Layer

The application layer coordinates user actions as use cases. It owns flow logic, not SDK details.

Required MVP use cases:

- Load bundled vocabulary and build local indexes.
- Browse/filter vocabulary by CEFR level and learning status.
- Start or resume a daily learning session.
- Select 5-7 daily words.
- Mark word practice progress locally.
- Select text genre.
- Generate Text of the Day through an Edge Function when online.
- Open inline translation for any story word.
- Play/pause story audio sentence by sentence.
- Request grammar explanation for a selected sentence when online.
- Submit micro-quiz answer and mark session completion.
- Queue local progress for sync.
- Sync local progress with Supabase when online and authenticated.

Use case inputs and outputs should be plain typed data. Avoid leaking React state, Supabase responses, storage keys, or SDK-specific errors into use-case boundaries.

## Ports And Dependency Inversion

Define application-facing ports for external capabilities:

| Port | Responsibility | Typical implementation |
| --- | --- | --- |
| VocabularyCatalog | Load and query bundled Oxford 5000 data | Local JSON adapter |
| LocalProgressStore | Read/write progress immediately on device | AsyncStorage adapter |
| RemoteProgressStore | Read/write authenticated cloud progress | Supabase adapter |
| ProgressSyncQueue | Store pending local operations | AsyncStorage metadata adapter |
| StoryGenerationGateway | Generate and validate story payloads | Supabase Edge Function client |
| GrammarGateway | Explain selected sentence grammar | Supabase Edge Function client |
| AudioNarrator | Speak sentences and report completion | `expo-speech` adapter |
| NetworkStatus | Report online/offline state | Expo/React Native network adapter |
| AuthSessionProvider | Expose authenticated user state | Supabase Auth adapter |
| Clock | Provide timestamps for deterministic conflict handling | System clock adapter |

Ports protect the app from SDK churn and make behavior testable. Keep interfaces small and shaped around use cases, not around vendor APIs.

## Presentation Layer

React Native screens and components should be thin:

- Render current state.
- Forward user intent to application actions.
- Show loading, empty, offline, success, and error states.
- Preserve iOS-friendly interaction patterns from `design/design_system.html`.
- Never own business rules such as word-count constraints, sync conflict handling, grammar availability, or story validation.

Use React hooks or a lightweight state container such as Zustand only as a delivery mechanism for application state. State management must not become the domain model.

Recommended presentation state categories:

- Screen state: loading, ready, error, offline.
- User input state: selected genre, selected word, selected sentence, quiz selection.
- Playback state: playing, paused, current sentence index.
- Derived display state: highlighted sentence, inline hint, disabled server action.

## Infrastructure Layer

Infrastructure implements ports and is the only mobile-app layer allowed to know concrete SDKs and persistence mechanics.

Rules:

- `words/oxford-5000.json` is loaded from the app bundle and treated as read-only.
- Vocabulary parsing must validate external shape before creating domain values.
- `@react-native-async-storage/async-storage` is preferred for MVP progress and sync metadata.
- Supabase JS client uses only public environment variables in the app.
- LLM API keys, prompts, model selection, and validation logic never appear in mobile code.
- All LLM calls go through Supabase Edge Functions.
- All cloud user progress is protected by Supabase RLS.
- Offline-capable actions must not fail the learning flow because the network is unavailable.

## Backend Boundary: Supabase Edge Functions

Treat Edge Functions as the AI backend. They are not a generic business layer for all app behavior.

Edge Function responsibilities:

- Authenticate the request with the user JWT when needed.
- Validate request payloads.
- Run the two-agent Writer -> Validator generation pipeline.
- Call OpenRouter using server-side secrets only.
- Use Vercel AI SDK structured JSON output.
- Validate generated story shape before returning it to the client.
- Enforce story length, CEFR grammar constraints, target word coverage, genre selection, and quiz consistency.
- Generate concise grammar explanations for selected sentences.
- Return typed error categories the app can present safely.

The mobile app must assume Edge Function responses are untrusted until client-side shape validation also succeeds.

## Offline-First Progress Architecture

Progress writes follow this invariant:

```text
User action -> Local write succeeds -> UI updates -> pending sync recorded -> remote sync attempted when possible
```

Offline rules:

- Vocabulary browsing works from bundled Oxford 5000 data.
- Flashcards and simple local practice work from local state.
- Word progress is written locally first.
- Pending changes are retained in a sync queue.
- Story generation and grammar explanations show explicit offline states.
- The app must not call LLM APIs directly or try on-device LLM generation.

Online rules:

- Local state remains the immediate UI source for progress.
- Remote Supabase progress is a backup and cross-device copy.
- Sync reconciles pending local changes with remote rows.
- Conflicts are resolved deterministically using per-record timestamps or operation ordering.
- Newer local offline progress must not be overwritten by stale remote data.

## Main Runtime Flows

### Daily Learning Flow

```text
Open app
  -> load local vocabulary index
  -> load local progress
  -> choose/resume 5-7 daily words
  -> practice words locally
  -> persist progress locally
  -> choose genre
  -> if online: call story generation Edge Function
  -> if offline: show unavailable generation state
  -> read/listen/translate
  -> complete quiz
  -> update streak/session locally
  -> queue sync
```

### Story Generation Flow

```text
Presentation intent
  -> GenerateTextOfDay use case
  -> NetworkStatus check
  -> StoryGenerationGateway
  -> Supabase Edge Function
  -> Writer agent
  -> Validator agent
  -> structured story payload
  -> client-side validation
  -> render story
```

### Audio Flow

```text
Story sentence list
  -> AudioNarrator.speak(sentence[index])
  -> set currentSentenceIndex
  -> expo-speech onDone
  -> speak next sentence
  -> stop at final sentence or user pause
```

### Sync Flow

```text
Local progress change
  -> write local progress
  -> append pending operation
  -> when online + authenticated
  -> push pending operations
  -> fetch remote state if needed
  -> reconcile deterministically
  -> clear applied operations
```

## SOLID Guidance

- Single Responsibility: UI renders, use cases orchestrate, domain validates, adapters talk to SDKs.
- Open/Closed: Add new storage or AI providers by implementing ports, not by rewriting use cases.
- Liskov Substitution: Port implementations must preserve use-case expectations, especially local-first writes and typed errors.
- Interface Segregation: Prefer narrow ports such as `AudioNarrator` and `GrammarGateway` over broad service objects.
- Dependency Inversion: Use cases depend on ports; adapters depend on SDKs.

Avoid over-engineering. Do not add repositories, mediators, event buses, CQRS, or global service locators unless a concrete MVP requirement demands them.

## Error And State Policy

Every user-facing flow must model:

- loading;
- empty;
- success;
- validation error;
- recoverable network error;
- explicit offline state for server-only actions;
- unexpected error with safe generic message.

Use typed application errors. Do not show raw Supabase, OpenRouter, storage, or parsing errors directly to users.

## Security And Trust Boundaries

Trust boundary rules:

- Oxford JSON is bundled but still parsed as external data.
- Local storage is mutable and must be validated on read.
- Supabase data is remote and must be validated on read.
- LLM output is untrusted and must be validated in the Edge Function and again on the client.
- Client input to Edge Functions is untrusted.
- Authenticated user ownership is enforced by RLS and checked in backend logic where applicable.

## Non-Goals For MVP

Do not implement:

- placement testing;
- saving arbitrary text words into a personal dictionary;
- native iOS or Android directories;
- direct client calls to OpenRouter or any LLM provider;
- Redux;
- remote loading of Oxford 5000 seed data at runtime;
- broad analytics/event platforms;
- complex local databases unless AsyncStorage becomes demonstrably insufficient.

## Implementation Checklist For AI Tasks

Before coding:

- Read the relevant product, stack, and design artifacts.
- Identify available verification commands from docs, CI, and manifests.
- Determine which use case and port boundaries are affected.
- Confirm whether the affected flow is offline-capable or online-only.

During coding:

- Keep changes scoped to the affected use case.
- Preserve dependency direction.
- Validate data at boundaries.
- Persist progress locally before remote sync.
- Keep UI components thin.

Before completion:

- Run available lint, typecheck, build, and relevant tests.
- Verify affected user flows against the artifacts.
- Report commands run and any unavailable verification.
