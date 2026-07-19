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
- **Bundled Vocabulary:** `words/oxford-5000.json` is shipped with the application bundle as read-only seed data. The app must support dictionary browsing, lightweight Story Words suggestions, simple word-set assembly, and non-LLM dictionary lookups from this file without network access.
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
- **AI Aggregator:** OpenRouter API (Access to multiple LLMs via a single API key, utilizing cost-efficient models such as DeepSeek-V3 or GPT-4o-mini when quality is acceptable).
- **AI SDK:** Vercel AI SDK (via Deno native `npm:` specifier, e.g., `npm:ai` and `npm:@ai-sdk/openai`) for structured JSON outputs such as generated episodes, interaction choices, correction payloads, translation annotations, and series-memory updates. Complex continuation flows may be decomposed into smaller model calls and then assembled by the Edge Function into one final validated response.
- **Online-Only AI:** Series-setup generation, episode generation, AI continuation, AI correction, and grammar-style explanations require an internet connection. Do not attempt to run LLM generation on device for the MVP.
- **Controlled Context:** Edge Functions must send only the bounded context required by the action: selected series constraints, creative brief, editable setup fields and provenance for setup generation; or compact series memory, recent episode summary, selected Story Words, already encountered Story Word ids, user level, safety constraints, and output schema for episode generation. Do not send unbounded full series history.
- **Idempotent Generation:** Episode and series-setup generation requests carry a stable `generationRequestId`. Edge Functions atomically claim a user-owned generation scope, cache only validated output, and return the cached result for transport retries instead of calling OpenRouter again.

#### Audio (TTS): Native Device Integration
- **Implementation:** Expo Speech (`expo-speech`) API.
- **Cost Optimization & UX:** Uses the device's native on-device Text-to-Speech engine. It is free and avoids extra API cost.
- **Playback Synchronization:** Episodes are rendered as sentence lists. The frontend plays sentences sequentially by invoking the next sentence's playback inside the `onDone` callback of the current sentence, dynamically updating `currentSentenceIndex` to highlight the active sentence.

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
- Series-setup AI strategy actions, new AI episode generation, AI continuation, AI correction, and grammar-style explanation actions are disabled or replaced with explicit offline messages until connectivity is restored.
- Local changes are retained with sync metadata such as `updated_at`, dirty flags, or pending operations.

Online behavior:

- Local data remains the immediate source of truth for UI responsiveness.
- Supabase receives pending local changes in the background or at clear sync points.
- If local and remote records conflict, resolve deterministically using per-record timestamps or explicit operation ordering. Do not overwrite newer local offline records with stale remote data.

#### Series, Episode, And Word State

User preferences stored locally and synced when possible:

- Preferred CEFR level selected manually.
- Preferred episode difficulty profile when implemented.
- Preferred default genre or series creation defaults when implemented.

Core records must be modeled explicitly:

- **Series:** User-created story container with title, genre, CEFR level, tone, premise, participation mode, characters or user role, optional creative brief, per-field setup provenance, compact memory, and sync metadata. The creative brief contains optional `idea` (shown as `Your idea`), `worldAndSetting`, `backstory`, `storyDriver`, `preferredCastSize` (`1`-`4` or AI choice), `mustInclude`, `avoid`, and `draftStrategy` (`fill-missing`, `refine`, or `rebuild`).
- **Episode:** Generated learning unit linked to a series with accumulated story text, sentences, several ordered interaction turns, learner replies, feedback, an AI-controlled completion state, cliffhanger, Story Words, and summary update.
- **Word Set:** A selected group of words for a day, series, or episode.
- **Learning Signal:** A non-punitive vocabulary event such as selected, encountered, translated, used, corrected, resurfaced, or stable.
- **Series Memory:** Compact continuity state used for future generation instead of unbounded chat history.

Story Words decisions:

- Use in episode = include the word in the next episode set.
- Know it = reduce future suggestion priority without creating permanent mastery.
- Later = skip the word for now without a negative learning state.
- Remove = remove from the current episode set.

No scheduled review backlog:

- The MVP must not create user-facing SRS due queues.
- The MVP must not punish missed days with accumulated review debt.
- Previously selected and encountered words may return naturally in future episodes when they fit the story, level, and selected word set.

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
* **Structured AI Output:** Edge Functions must return structured, validated JSON for setup suggestions, episodes, interaction options, annotations, corrections, and memory updates. The mobile app must validate the response shape before rendering. Setup generation sends completed character profiles separately from the bounded `emptyCharacterSlotCount`, then returns the complete resolved draft plus the fields that actually changed. The server enforces `fill-missing`, including AI-chosen additions and visible blank slots without deleting completed profiles; treats numeric cast size as exact for `refine` and `rebuild`; permits other discretionary field replacements for `refine`; and excludes the current final draft from model context for `rebuild`. Creative anchors and selected constraints remain immutable in every strategy.
* **Generation Concurrency:** A root React context owns one episode-generation Promise and loading/result state per `seriesId`, so navigation cannot restart or hide active work. The database keeps one generation request per authenticated scope, and the Edge Function permits a new episode only when the latest synced `episodes.is_complete` is true and the requested `orderIndex` is exactly next.
* **Series Memory Safety:** Send compact memory and summaries to the model. Do not rely on full unbounded conversation history for continuity.
* **Sync Safety:** Treat local records, remote records, user input, and AI output as untrusted inputs during reconciliation. Validate shape, user ownership, timestamps, setup provenance, and allowed state transitions before applying changes. Missing or legacy creative-brief strategy data defaults to `fill-missing`, while already-persisted setup text without provenance defaults to user-authored.
* **Copyright Safety:** Do not generate direct copies of copyrighted story worlds, characters, or plots. If a user requests one, steer toward an original story with a similar broad genre or mood.
