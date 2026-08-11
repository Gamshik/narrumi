# Technical Stack & Architecture Document
## Project: Context-English App (MVP)

### 1. Developer Environment & Constraints
- **OS Development Machine:** Windows 11 (No local macOS/Xcode available).
- **Target Testing Device:** iOS (iPhone) via **Expo Go**.
- **Budget Target:** $0 for infrastructure (Free tiers only).
- **Scalability Requirement:** The stack must use standard, highly scalable technologies (PostgreSQL, React Native) to prevent architectural dead-ends during future expansion.

---

### 2. Core Technology Stack

#### Frontend: React Native + Expo (Managed Workflow)
- **Framework:** React Native (TypeScript).
- **Tooling:** Expo SDK (Managed Workflow).
- **Development Tool:** Expo Go app for iOS (allows local testing on iPhone from a Windows host without local compilation).
- **Build System:** EAS (Expo Application Services) remote cloud builds for production `.ipa` compilation.
- **Native Project Rule:** Absolutely NO modifications to native `/ios` or `/android` directories. All native configurations must be handled via `app.json` or Expo Config Plugins.
- **Bundled Vocabulary:** `words/oxford-5000.json` and its compact Russian translation sidecar `words/oxford-5000-ru.json` are shipped with the application bundle as read-only seed data. The app must support dictionary browsing, lightweight Story Words suggestions, simple word-set assembly, and non-LLM dictionary lookups from these files without network access.
- **Local Store:** User-created series, creative briefs, setup provenance, setup drafts, episodes, series memory, selected word sets, learning signals, preferences, and sync metadata must be written locally first. Use a lightweight Expo-compatible local store: prefer `@react-native-async-storage/async-storage` for MVP key-value records; move to `expo-sqlite` only if structured querying, larger episode history, or complex local indexing becomes necessary.
- **Network Awareness:** Use Expo/React Native network status detection to gate server-only actions. Series-setup generation, episode generation, AI correction, and grammar-style explanation screens must render explicit offline states instead of silently failing. Editing and locally saving a setup draft must remain available offline.

#### Backend & Database: Supabase (Free Tier)
- **Database:** PostgreSQL (Fully relational, scalable).
- **Authentication:** Supabase Auth (JWT, Email/Password onboarding).
- **Database Access:** Supabase JS Client client-side library with Row Level Security (RLS) enabled.
- **Storage:** Supabase Storage (Bucket for storing assets if needed later).
- **Remote Store:** Supabase stores the canonical cloud copy of user-created series, creative briefs, setup provenance, episodes, word sets, learning signals, preferences, and sync metadata for backup and cross-device use. RLS must ensure users can only read and write their own records.

#### AI Layer & Serverless: Supabase Edge Functions + OpenRouter
- **Serverless Compute:** Supabase Edge Functions (Deno 2.0+ / TypeScript runtime) handle secure LLM API orchestration. Client applications must never call LLM APIs directly.
- **AI Aggregator:** OpenRouter API provides one server-side key, exact model-version routing, provider privacy controls, and endpoint failover across cost-efficient models.
- **AI SDK:** Vercel AI SDK with the official OpenRouter provider (via pinned Deno native `npm:` specifiers for `ai` and `@openrouter/ai-sdk-provider`) produces schema-bound structured outputs for generated episodes, interaction choices, correction payloads, translation annotations, and series-memory updates. Complex continuation flows are decomposed into smaller model calls and assembled by the Edge Function into one final validated response.
- **Role-Based Model Routing:** The default production pipeline uses exact OpenRouter slugs per responsibility: `google/gemini-3.5-flash-lite` with low reasoning for low-latency creative prose; `openai/gpt-5.4-nano` with low reasoning for prompts and choices; `openai/gpt-5.4-mini` with low reasoning for independent workflow-specific semantic review and one evidence-based repair or structural fallback; and `openai/gpt-5.4-nano` with minimal reasoning for learner feedback, compact memory, semantic reader framing, and bounded translation. These defaults may be changed only through server secrets, never by the client.
- **Creative Quality Gate:** Series setup, episode opening, and interaction continuation are not trusted after structural parsing alone. A separately prompted Reviewer checks only the issue taxonomy relevant to the current workflow and may report only a high-confidence violation supported by concrete candidate evidence. It checks CEFR fit, concrete grammar and sentence-construction errors, continuity, scenario and learner-action alignment, repetition, participation mode, part-of-speech-aware Story Word use, meaningful continuation development, logical closure, choice diversity, direct-speech formatting, canonical character identity, disconnected instruction-like or causally incoherent fragments, safety, and copyright rules where applicable. A deterministic pre-review also blocks high-confidence pinned-speaker utterances that appear without quotation marks. Episode timing is not a subjective reviewer verdict: deterministic policy prevents completion before interaction 5, permits a Writer-selected logical ending on interactions 5-9, and forces completion on interaction 10. A complete rejected candidate receives at most one targeted edit by the stronger Fallback model using the original candidate, issue codes, evidence, and repair instructions. When the only issues are `choice_mismatch` or `choice_similarity`, the story contract is removed from the repair output schema: the accepted prose remains immutable and only the decision is regenerated from its final actionable state. When the only issue is `dialogue_format`, recovery receives only the mutable prose fields and may correct quotation marks without returning choices, summaries, titles, or completion state. A structurally failed writer pipeline with no complete candidate may receive one complete fallback generation instead. The recovery candidate must pass the same Reviewer, and every unresolved issue remains blocking. Deterministic schemas and finalizers still must pass.
- **Creative Dependency Order:** Episode openings and incomplete continuations generate story prose first and freeze it before the structure-focused Decision model creates the prompt and choices. This dependency prevents choices from inventing a different scenario. After review, semantic English reader framing runs without any translation instruction; the server finds Story Word occurrences in those stable blocks, then a separate Utility call returns only Russian annotation translations. Learner feedback and compact memory remain combined as one Validator task.
- **Decision Prompt Boundary:** The highlighted interaction prompt is a concise concrete question or short choice cue, never a repeated story paragraph. Decision and review prompts forbid quoting, summarizing, paraphrasing, or copying the final story blocks. Before persistence, deterministic policy removes an exactly repeated story-sentence prefix and replaces a wholly duplicated or near-duplicated prompt with a participation-aware short fallback without another model request.
- **Generated Language Boundary:** Every learner-facing story, summary, feedback, prompt, choice, and reader block must be predominantly English. Russian Cyrillic is permitted only in annotation translation values and explicit selected-text translation responses. Prompts, Zod schemas, and final response validation enforce this invariant independently.
- **Latency Budget:** An incomplete episode opening or continuation normally uses five sequential provider waves: Story Writer, Decision Builder, semantic Reviewer, parallel Validator plus English reader framing, then Story Word translation when targets exist. A completed interaction skips the decision call, and a turn without Story Word occurrences skips translation. The rare repair path adds one targeted editor call and one re-review; it does not repeat the full pipeline. Each provider call has a short server-side timeout, hidden SDK retries are disabled, and small enrichment contracts may perform one explicit schema-repair retry. Exhausted Story Word translation is fail-soft: return the accepted story without unresolved annotations, log a safe server warning, and do not expose a client error or regenerate creative stages.
- **Semantic Reader Blocks:** Reader and TTS units are grouped by meaning, paragraph, or action beat rather than mechanically split at every sentence boundary. A narration block may contain several related sentences; the Writer wraps direct speech in ASCII double quotation marks, and dialogue turns remain separate, carry pinned speaker metadata, and contain all directly quoted words but only words actually spoken aloud. Speaker attribution, reported speech, actions, and stage directions remain narration. A deterministic non-failing policy rejects dialogue classification unless the frame wording occurs inside a quoted source span, splits pinned-speaker attribution plus quoted speech out of a mixed narration frame, downgrades other non-spoken content mislabeled as dialogue, removes a sufficiently long dialogue block copied from the immediately preceding narration tail, and remaps Story Word annotations to the normalized blocks. Existing `sentences` field names are retained only for client contract compatibility.
- **Separated Feedback:** The creative writer never evaluates the learner's English. Interaction feedback is generated independently by the validator model from the bounded prompt and learner answer. Persisted tutor feedback is stripped from previous-decision context before any Writer, Decision, Reviewer, repair, or memory request; those requests receive only the causal prompt and learner answer needed to continue the story.
- **Moderation Attribution:** A user warning may be created only from new learner-authored text at the current trust boundary. Replayed setup, compact memory, summaries, generated prompts, generated choices, Oxford examples, and other AI-authored context are never strike evidence. Selecting a generated choice is not treated as authorship. Warning persistence is idempotent per stable setup-generation or episode-interaction identity, so retries cannot turn one policy decision into several strikes.
- **Provider Privacy And Capability Policy:** OpenRouter routing must require support for requested structured-output parameters, deny provider data collection, allow endpoint-level availability fallback, and retain OpenRouter's default price-aware uptime load balancing. Do not force explicit price sorting because that disables normal load balancing. Strict zero-data-retention routing is an operator opt-in because it must not make every model endpoint unavailable by default. Semantic fallback remains explicit Edge Function logic and must not be delegated to availability routing.
- **Online-Only AI:** Series-setup generation, episode generation, AI continuation, AI correction, selected-text translation, and grammar-style explanations require an internet connection. Do not attempt to run LLM generation on device for the MVP.
- **Controlled Context:** Edge Functions must send only the bounded context required by the action: participation mode and the visible idea, characters, learner identity, and title context for card-local setup generation; backward-compatible creative-brief values only when an existing-series editor explicitly supplies them; episode-level genre and CEFR, compact series memory, recent episode summary, selected Story Words with exact Oxford id, headword, part of speech, level, and at most two short examples from that entry, already encountered Story Word ids, safety constraints, and output schema for episode generation; or only the exact selected episode excerpt for translation, with no surrounding sentence or paragraph context. Do not send unbounded full series history.
- **Idempotent Generation:** Episode and series-setup generation requests carry a stable `generationRequestId`. Edge Functions atomically claim a user-owned generation scope, cache only validated output, and return the cached result for transport retries instead of calling OpenRouter again. Completed or actively generating scopes reject different inputs, while failed or expired scopes may be reclaimed atomically with a new fingerprint.

#### Audio (TTS): Native Device Integration
- **Implementation:** Expo Speech (`expo-speech`) API.
- **Cost Optimization & UX:** Uses the device's native on-device Text-to-Speech engine. It is free and avoids extra API cost.
- **Playback Synchronization:** Episodes are rendered as semantic reader-block lists. The frontend plays blocks sequentially by invoking the next block's playback inside the `onDone` callback of the current block, dynamically updating the legacy `currentSentenceIndex` to highlight the active block.

---

### 3. System Architecture & Data Flow

All AI interactions must pass through Supabase Edge Functions to protect API secrets.

```text
[ React Native App (Expo Go on iPhone) ]
                   |
                   | (1) Secure HTTPS Request + User JWT
                   v
     [ Supabase Edge Functions ]
                   |
                   | (2) Injects OpenRouter API Key
                   v
         [ OpenRouter API ] --(3) Sends Prompt--> [ Selected LLM ]
                   |                                     |
                   v                                     v
     [ Parses Structured JSON ] <--(4) Returns Text -----'
                   |
                   | (5) Validates + returns episode payload
                   v
[ React Native App (Renders Interactive Episode) ]
```

#### Hybrid Offline/Online Data Flow

The app has two persistence layers:

1. **Local data:** Written immediately on the device for series, creative briefs, setup provenance and drafts, episodes, series memory, selected word sets, learning signals, preferences, and offline reading state.
2. **Remote data:** Synced to Supabase when the device is online and the user is authenticated.

```text
[ Bundled Oxford 5000 JSON ]
              |
              v
[ React Native App ] --writes first--> [ Local Store ]
              |                              |
              | online + authenticated       | queued sync metadata
              v                              v
        [ Supabase User Tables ] <---- sync/reconcile
```

Offline behavior:

- Existing series and already-generated episodes remain readable.
- A new or existing setup form can be edited and saved locally as a draft.
- Story Words selection can use the bundled Oxford 5000 list.
- Locally saved word sets, learning signals, and preferences remain available.
- Series-setup AI strategy actions, new AI episode generation, AI continuation, AI correction, and grammar-style explanation actions are disabled or replaced with explicit offline messages until connectivity is restored. Selected-text translation attempts its secure request before classifying a transport failure as offline, because cached mobile reachability must not block a valid request.
- Local changes are retained with sync metadata such as `updated_at`, dirty flags, or pending operations.

Online behavior:

- Local data remains the immediate source of truth for UI responsiveness.
- Supabase receives pending local changes in the background or at clear sync points.
- If local and remote records conflict, resolve deterministically using per-record timestamps or explicit operation ordering. Do not overwrite newer local offline records with stale remote data.

#### Series, Episode, And Word State

User preferences stored locally and synced when possible:

- Preferred CEFR level selected manually and used for each series' first episode.
- Legacy preferred genre retained only for backward-compatible preference sync.

Core records must be modeled explicitly:

- **Series:** User-created story container with title, premise, participation mode, characters or user role, optional compatibility creative brief, per-field setup provenance, compact memory, and sync metadata. New series creation exposes only four cards: Role, Idea (stored as `premise`), Characters, and Title. Its creative brief uses empty defaults and internal `fill-missing`; older creative-brief fields and strategy values remain readable for existing data and the backward-compatible existing-series editor. Legacy genre, CEFR, and tone columns remain readable and writable only for compatibility with older clients.
- **Episode:** Generated learning unit linked to a series with its selected CEFR level and genre, accumulated story text, semantic reader blocks stored under legacy sentence fields, several ordered interaction turns, learner replies, feedback, an AI-controlled completion state, cliffhanger, Story Words, and summary update. Old episode rows without settings inherit the owning series values when read.
- **Word Set:** A selected group of words for a day, series, or episode. `LearningPreferences.storyWordGoal` determines the fixed number of editable Episode Word slots prepared for the next episode.
- **Learning Signal:** A non-punitive vocabulary event such as selected, encountered, translated, used, corrected, resurfaced, or stable.
- **Series Memory:** Compact continuity state used for future generation instead of unbounded chat history.

Story Words decisions:

- Start or resume exactly the configured Story Word goal as editable episode slots.
- Replace one slot from the bundled Dictionary or with a CEFR-independent random candidate.
- Shuffle the complete set without turning the selection step into a review session.
- Persist the resulting Episode Words locally before generation.

No scheduled review backlog:

- The MVP must not create user-facing SRS due queues.
- The MVP must not punish missed days with accumulated review debt.
- Previously selected and encountered words may return naturally in future episodes when they fit the story and selected word set; Story Word selection itself is not filtered by CEFR.

### 4. Implementation Constraints
When writing code for this project, you MUST strictly adhere to these rules:

* **Language:** Always use TypeScript for both frontend (React Native) and backend (Supabase Edge Functions).
* **State Management:** Use standard React Hooks (useState, useEffect, useContext) or lightweight libraries like Zustand. Do not introduce Redux.
* **Styling:** Use standard React Native Stylesheet or Tailwind via NativeWind only if explicitly requested. Follow the project design artifacts.
* **Supabase Client:** Always instantiate the Supabase client using environment variables (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
* **Edge Functions Routing:** Supabase Edge Functions run on Deno 2.0+. Use modern native npm imports (e.g., `import { ... } from "npm:ai"`) for dependency resolution and package management.
* **Security:** Never hardcode API keys or secrets in the frontend codebase. All LLM configurations, prompts, model selection, provider settings, and validation logic belong inside the Edge Functions.
* **Offline-First Writes:** Any user action that changes a setup draft, creative brief, setup provenance, series state, episode state, word sets, learning signals, preferences, or sync metadata must be persisted locally before attempting network sync.
* **Dictionary Loading:** Load the Oxford 5000 JSON locally from the app bundle. Keep parsing and indexing deterministic, typed, and validated at the boundary.
* **Structured AI Output:** Edge Functions must return structured, validated JSON for setup suggestions, episodes, interaction options, annotations, selected-text translations, corrections, and memory updates. A selected-text translation response contains only one bounded `translation` string. The mobile app must validate the response shape before rendering. Each new-series `Generate by AI` action sends a `fill-missing` request with an explicit generation target, receives a complete coherent setup, and applies only that target: premise, one to eight character profiles plus Character-mode role, or title. Earlier visible values remain immutable, and a non-character target must preserve an existing cast exactly. The server continues to support completed character profiles, bounded empty slots, and legacy `refine`/`rebuild` behavior for the backward-compatible existing-series editor, but those controls are not exposed during new series creation.
* **Generation Concurrency:** A root React context owns one episode-generation Promise and loading/result state per `seriesId`, so navigation cannot restart or hide active work. Before the request, the client persists one request id for `{seriesId}:{orderIndex}` and keeps it until the validated response and its local episode records are saved. The database keeps one generation request per authenticated scope, and the Edge Function permits a new episode only when the latest synced `episodes.is_complete` is true and the requested `orderIndex` is exactly next. If transport loses a completed response, the same durable request id recovers the cached episode even when visible inputs changed meanwhile; a genuinely new request id with different inputs still returns `generation_conflict`.
* **Series Memory Safety:** Send compact memory and summaries to the model. Do not rely on full unbounded conversation history for continuity. Memory generation returns the complete next compact state, carries forward stable character identities and relationships, and records newly introduced named supporting characters as concise facts. Deterministic finalization fills unused fact and recurring-anchor capacity from prior compact memory while allowing resolved open questions to disappear.
* **Sync Safety:** Treat local records, remote records, user input, and AI output as untrusted inputs during reconciliation. Validate shape, user ownership, timestamps, setup provenance, and allowed state transitions before applying changes. Missing or legacy creative-brief strategy data defaults to `fill-missing`, while already-persisted setup text without provenance defaults to user-authored.
* **Copyright Safety:** Do not generate direct copies of copyrighted story worlds, characters, or plots. If a user requests one, steer toward an original story with a similar broad genre or mood.
