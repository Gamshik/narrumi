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
- optional creative brief;
- per-field setup provenance;
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
- Series setup is a single progressive-disclosure screen, not a wizard. CEFR level, genre, tone, and participation mode are explicit selected constraints.
- `CreativeBrief` contains optional `idea` (shown as `Your idea`), `worldAndSetting`, `backstory`, `storyDriver`, `preferredCastSize` (`1`-`4` or AI choice), `mustInclude`, and `avoid`, plus `draftStrategy` as `fill-missing`, `refine`, or `rebuild`. `fill-missing` is the safe default. Existing character profiles remain editable setup fields.
- Setup provenance records whether each generated-capable field is `user` or `ai`. A manual edit to an AI field changes that field to `user` provenance.
- Series setup text fields are required before saving a ready series: title, premise, main characters, and `userRole` for `character`. An incomplete form may be persisted locally as a draft.
- The AI setup action is online-only before the first episode and obeys `draftStrategy`. The mobile request normalizes completed character profiles separately from `emptyCharacterSlotCount`, so visible blank rows remain explicit generation work. `fill-missing` preserves populated final fields exactly and, when cast size is AI-chosen, may append distinct profiles until the model-selected final cast is complete. It never removes completed profiles, so a smaller numeric preference resolves to the existing count and UI must explain the conflict. `refine` sends the current draft for evaluation and lets the model omit any strong field, except that a numeric `preferredCastSize` is exact and requires resizing the cast, while a visible blank slot without an exact smaller target makes a complete cast response mandatory. `rebuild` also treats numeric cast size as exact, excludes current final fields from model context, and resolves every required field from protected anchors or, when anchors are empty, from selected constraints.
- A transient setup-generation transport failure is retried once with the same durable `generationRequestId`. The retry must stay inside the original loading state and rely on server idempotency, so one learner tap cannot duplicate model work and does not require a second manual tap.
- Every strategy must preserve creative anchors and must not generate or change CEFR level, genre, tone, or participation mode. Character mode still requires a resolved `userRole` matching one character profile.
- The response includes `changedFields`, computed by the Edge Function from the resolved draft rather than trusted from model output. The client uses it for provenance and keeps one in-memory pre-generation snapshot for Undo.
- Creative brief and setup provenance are local-first series data and participate in remote sync. Backward-compatible reads map missing or legacy strategy data to `fill-missing` and treat already-persisted setup text without provenance as `user`.
- The setup form and draft are offline-capable; the AI setup action is online-only and exposes an explicit offline state.
- Opening an existing series must expose a setup menu with the same fields. It is editable only while the series has no episodes and read-only after the first generated episode.

### Episode

A generated learning unit linked to a series:

- episode id;
- series id;
- optional "previously" recap;
- main scene or dialogue;
- semantic reader-block list stored under the legacy sentence field;
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
- A new episode may be generated only when the latest episode is absent or has `isComplete = true`. This rule must be enforced locally and by the `generate-episode` Edge Function against the synced `episodes.is_complete` value.
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
- Save an incomplete setup draft locally.
- Generate missing or AI-authored setup fields through an Edge Function when online while preserving user-authored fields.
- Mark an AI-generated setup field as user-authored when the learner edits it.
- List local series.
- Open a series and load its episodes, memory, word sets, and learning signals.
- Build lightweight Story Words suggestions from vocabulary, series context, prior signals, and level.
- Apply Story Words actions: use in episode, know it, later, remove.
- Assemble Episode Words for the next episode.
- Generate an episode through an Edge Function when online.
- Assign a stable generation request id. A root presentation context owns the episode-generation Promise and observable state above route lifetimes; setup generation keeps its own single-flight action.
- Validate and persist generated episode locally first.
- Play or pause episode audio one semantic reader block at a time.
- Open inline translation for prepared Story Words and story-critical annotations.
- Select visible episode story or interaction copy and request a plain Russian translation of exactly that selection when online.
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
| LocalSeriesStore | Persist setup drafts, creative briefs, provenance, series, episodes, memory, word sets, signals, preferences | AsyncStorage adapter |
| RemoteSeriesStore | Read/write authenticated cloud records, including creative briefs and provenance | Supabase adapter with RLS |
| SyncQueue | Store pending local operations and sync metadata | AsyncStorage metadata adapter |
| SetupGenerationGateway | Generate validated suggestions only for missing or AI-authored setup fields | Supabase Edge Function client |
| EpisodeGenerationGateway | Generate validated episode payloads | Supabase Edge Function client |
| InteractionGateway | Continue episode and correct short user input | Supabase Edge Function client |
| ExcerptTranslationGateway | Translate exactly the selected episode text into Russian without adjacent context | Supabase Edge Function client |
| GrammarGateway | Provide grammar-style explanation when requested | Supabase Edge Function client |
| AudioNarrator | Speak semantic reader blocks and report progress | `expo-speech` adapter |
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
- Keep story reading, inline word translation, native excerpt selection, the floating selection action panel, audio controls, Story Words selection, and bottom sheets accessible.

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
- setup state: collapsed or expanded anchors, local draft status, per-field `user` or `ai` provenance, and setup generation status;
- series state: selected series, selected episode, memory summary preview;
- Story Words state: suggested words, selected words, warning about difficulty;
- episode reader state: selected word hint, exact selected excerpt and owner, excerpt source/translation result, selected sentence, current sentence index, restored continuation loading target, and first generated semantic-block target;
- interaction state: choice selected, reply draft, feedback visible;
- sync state: local only, syncing, synced, failed.

## Infrastructure Layer

Infrastructure implements ports and owns concrete SDK details.

Rules:

- Load `words/oxford-5000.json` and its Russian translation sidecar from the app bundle only.
- Validate bundled vocabulary shape before creating domain values.
- Prefer `@react-native-async-storage/async-storage` for MVP local records.
- Move to `expo-sqlite` only if AsyncStorage becomes insufficient for local episode history or indexing.
- Instantiate Supabase client with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Keep all LLM secrets, prompts, provider settings, model choices, and validation logic out of the mobile app.
- All AI calls go through Supabase Edge Functions.
- All cloud records are protected by Supabase RLS.
- Treat local storage, remote records, user input, and AI output as untrusted at boundaries.

Selected-text translation is an ephemeral reader action: it does not mutate episode or series records. The client sends only the exact selected fragment through `ExcerptTranslationGateway`, validates the one-field AI response, and pairs the locally retained source text with the Russian translation in the result sheet. Translation completion and result-sheet dismissal preserve the selected source range; a tap elsewhere in the reader or real reader scroll clears it. The request never sends adjacent sentence or paragraph context. To avoid stale mobile reachability data blocking a valid request, the use case attempts the gateway first and checks offline status only after transport fails. The Edge Function owns the prompt, provider configuration, authentication, request limits, and response validation.

## Backend Boundary: Supabase Edge Functions

Edge Functions are the AI backend and trust boundary for model access.

Responsibilities:

- Authenticate requests when user state is needed.
- Validate request payloads.
- Enforce copyright and safety constraints.
- Build bounded model context from selected constraints, creative brief, eligible setup fields, provenance, safety constraints, and output schema for setup generation; or from compact series memory, recent summary, selected Story Words, user level, genre, tone, and output schema for episode generation.
- Never send unbounded full series history.
- Call OpenRouter using server-side secrets only.
- Use Vercel AI SDK structured JSON output.
- For budget models, generate episode story prose or continuation first, freeze it, and only then generate the next choice from that text. Generate semantic English reader frames without translation instructions, find Story Word targets deterministically, and only then request Russian translations for those exact targets. Keep learner feedback and compact memory together, then assemble one final validated payload inside the Edge Function.
- Route model work by responsibility behind one shared server gateway: Writer for creative setup and story prose; Decision for prompts and choices derived from frozen story text; Reviewer for workflow-specific semantic review; Validator for learner feedback and compact memory; Utility for translation and reader metadata; and Fallback for one targeted evidence-based repair or one complete replacement after structural writer failure. Give Writer, Decision, Reviewer, and Fallback a low reasoning budget while Validator and Utility use the minimal reasoning effort required by current GPT-5 endpoints.
- Run the Episode Writer and independent Language/Continuity/Safety Reviewer flow for series setup, episode openings, and every interaction continuation. Structural schema success alone is not acceptance.
- The semantic Reviewer checks only the closed issue taxonomy relevant to the current workflow. It may reject only high-confidence violations supported by concrete candidate evidence, including applicable CEFR, continuity, learner-action and scenario alignment, recent-text repetition, participation mode, Story Word naturalness, logical closure, next-choice alignment and diversity, safety, and copyright constraints. Hard episode timing is deterministic: completion is forbidden before interaction 5, forced on interaction 10, and cannot be rejected as a subjective pacing preference inside interactions 5-9. The Reviewer returns only a bounded verdict and targeted retry hints; it does not silently rewrite accepted story content.
- Permit one quality-gated Writer candidate. If a complete candidate is rejected, permit one stronger model to repair that exact candidate from reviewer issue codes, evidence, and instructions while preserving unaffected fields. If the Writer fails structurally before producing a complete candidate, permit one complete Fallback candidate instead. Review the recovery candidate once more and block persistence for every unresolved issue, including continuity, scenario, CEFR, repetition, participation, choice, safety, copyright, and protected setup violations. Do not repeat the full multi-model pipeline inside one Edge request.
- Keep incomplete episode opening and continuation latency bounded to five normal provider waves: Story Writer, Decision Builder from frozen story text, semantic Reviewer, parallel Validator plus English reader framing, then exact-target Story Word translation. Completed interactions skip the decision call, and requests without Story Word targets skip translation. The rare repair path adds only one editor call and one re-review. Apply a short per-model timeout, disable hidden SDK retries, and permit at most one explicit schema-repair retry for a small enrichment contract. If Story Word translation still fails, preserve the accepted episode or continuation, omit only unresolved annotations, log a safe enrichment warning, and never surface a client error or repeat the creative pipeline for that optional failure.
- Generate learner-language feedback separately from creative continuation. The feedback model may correct only real language problems and must not invent an error for a predefined choice or already-natural reply.
- Use deterministic server logic for ids, Story Word occurrence matching, completion bounds, request idempotency, and final contract invariants. Use the Utility model only where semantic transformation is required, such as dialogue framing or translation.
- Treat the highlighted interaction prompt as a decision cue rather than story content. It must contain one concise concrete question, or a very short cue when the available choices make the decision obvious. It must not repeat, quote, summarize, or paraphrase the final story blocks. Deterministically remove an exact copied story-sentence prefix and replace a fully duplicated or near-duplicated prompt with a participation-aware short fallback without another model call or client-visible error.
- Reader framing is semantic, not sentence-tokenization: group related narration sentences into meaningful paragraph or action-beat blocks, while keeping actual dialogue turns separate with pinned speaker metadata. Dialogue text contains all directly quoted words and only spoken words; speaker attribution, speech tags, body movement, facial expression, and stage direction remain narration. Apply a deterministic non-failing downgrade when a Utility response labels forms such as `Vlad says, leaning against the desk` as dialogue. When a narration frame contains a pinned-speaker attribution followed by quoted speech, deterministically split it into narration plus a complete dialogue frame and remap annotations by their retained surface text. Deterministically remove a dialogue block of at least four words when it repeats the normalized tail of the immediately preceding narration block. The legacy `sentences` and `continuationSentences` field names carry these semantic blocks for mobile compatibility.
- Require learner-facing generated fields to be predominantly English at prompt, schema, and finalization boundaries. Permit Russian Cyrillic only in validated annotation translation values and explicit excerpt-translation responses.
- Require OpenRouter endpoints to support requested structured-output parameters, deny provider data collection, and preserve OpenRouter's default price-aware uptime load balancing. Do not force explicit price sorting because it disables that balancing. Zero-data-retention routing is an explicit operator opt-in after compatible OpenRouter account routes are confirmed; it must not block generation by default. Provider failover addresses endpoint failure only; semantic fallback is controlled by the Edge Function pipeline.
- Validate episode length, CEFR fit, word usage, continuity, interaction point, cliffhanger, annotations, feedback, and memory update.
- Return typed error categories safe for the client.
- Atomically claim generation scopes before model access. Return cached validated output for completed retries and `generation_in_progress` for the same active lease. Return `generation_conflict` when a completed slot or a still-active lease has different input. A failed or expired slot may atomically adopt a new request id and fingerprint so corrected inputs can retry without manual database cleanup.
- Before a newly claimed episode request reaches the model, verify that the latest synced episode is complete and that the requested `orderIndex` is exactly next. Return a typed conflict when completion or sync state does not permit generation.
- Store only the request fingerprint and validated response in `generation_requests`; do not persist raw prompts in the idempotency table.

The mobile app must validate Edge Function response shape again before rendering or storing data.

Episode generation scope is `{seriesId}:{orderIndex}`. The Edge Function returns the canonical request id for that scope, and the client includes it in the local episode id. Series-setup scope uses one request id per explicit strategy action; its fingerprint includes the strategy, current draft, protected anchors, and selected constraints.

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
- New and existing setup forms, including local draft saving.
- Already-generated episodes.
- Episode reading and local audio playback.
- Story Words selection from bundled Oxford 5000.
- Locally saved word sets.
- Learning signals.
- Preferences.
- Local edits that do not require AI.

Online-only:

- Series-setup generation through the selected draft-strategy action.
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
- creative briefs and setup provenance;
- episodes;
- series memory;
- word sets;
- learning signals;
- preferences;
- sync metadata.

## Main Runtime Flows

### Series Creation Flow

```text
User opens one progressive-disclosure setup screen
  -> select CEFR level, genre, tone, participation mode
  -> optionally enter Your idea, story anchors, and editable character profiles
  -> choose fill-missing, refine, or rebuild draft strategy
  -> save form changes locally as a draft
  -> optionally, when online, call SetupGenerationGateway through the contextual AI action
  -> Edge Function validates input, safety and copyright boundaries
  -> resolve final fields under the selected strategy; always preserve creative anchors
  -> user edits suggestions; edited fields become user-authored
  -> validate required ready-series fields
  -> create compact initial memory
  -> write local series and provenance
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
  -> if the service reports one temporary unavailable failure: retry once inside the same loading state without a popup or developer console error
  -> if the pending continuation is restored after reader re-entry: render the saved answer and scroll once after its loading state is laid out
  -> Edge Function returns concise correction, continuation, next interaction or episode-complete state, memory update
  -> client validates response and completion transition
  -> write feedback, continuation, ordered interaction turn, signals, memory locally
  -> reveal the first newly generated semantic block without jumping to the reader end
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
Episode semantic reader-block list
  -> AudioNarrator.speak(block[index])
  -> set currentSentenceIndex
  -> expo-speech onDone
  -> speak next semantic block
  -> stop at final block or user pause
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
- Setup provenance is untrusted on local or remote reads and must be validated before it controls replacement eligibility.
- Edge Function request payloads are untrusted.
- Authenticated ownership is enforced by RLS and checked where applicable.
- `generation_requests` is RLS-protected. Claim, completion, and release RPCs are callable only with the Edge runtime service role after the function has authenticated the user.

Safety rules:

- Do not generate unsafe content.
- Do not directly copy copyrighted worlds, characters, names, or plots.
- If the user requests a protected franchise, steer to an original story with a similar broad genre or mood.
- Preserve the user's original draft text locally even when generation is refused or redirected for safety or copyright reasons; preservation does not require the AI response to reproduce disallowed material.

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
- per-next-episode direction input; co-creation in this iteration applies only to initial series setup.

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
