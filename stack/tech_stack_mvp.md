# Technical Stack & Architecture Document
## Project: Context-English App (MVP)

### 1. Developer Environment & Constraints
- **OS Development Machine:** Windows 11 (No local macOS/Xcode available).
- **Target Testing Device:** iOS (iPhone) via **Expo Go**.
- **Budget Target:** $0 for infrastructure (Free tiers only).
- **Scalability Requirement:** The stack must use standard, highly scalable technologies (PostgreSQL, React Native) to prevent any architectural dead-ends during future expansion.

---

### 2. Core Technology Stack

#### Frontend: React Native + Expo (Managed Workflow)
- **Framework:** React Native (TypeScript).
- **Tooling:** Expo SDK (Managed Workflow).
- **Development Tool:** Expo Go app for iOS (allows local testing on iPhone from a Windows host without local compilation).
- **Build System:** EAS (Expo Application Services) remote cloud builds for production `.ipa` compilation.
- **Strict Rule for AI:** Absolutely NO modifications to native `/ios` or `/android` directories. All native configurations must be handled via `app.json` or Expo Config Plugins.
- **Bundled Vocabulary:** `words/oxford-5000.json` is shipped with the application bundle as read-only seed data. The app must support browsing word lists, selecting daily words, flashcards, and simple local practice from this file without network access.
- **Local Progress Store:** User learning progress must be written locally first so the learning flow works offline. Use a lightweight Expo-compatible local store: prefer `@react-native-async-storage/async-storage` for simple MVP key-value progress and sync metadata; move to `expo-sqlite` only if structured querying or larger local history becomes necessary.
- **Network Awareness:** Use Expo/React Native network status detection to gate server-only actions. Server-only screens must render explicit offline states instead of silently failing.

#### Backend & Database: Supabase (Free Tier)
- **Database:** PostgreSQL (Fully relational, scalable).
- **Authentication:** Supabase Auth (JWT, Email/Password onboarding).
- **Database Access:** Supabase JS Client Client-side library with Row Level Security (RLS) enabled.
- **Storage:** Supabase Storage (Bucket for storing assets if needed later).
- **Remote Progress Store:** Supabase stores the canonical cloud copy of user progress for backup and cross-device use. RLS must ensure users can only read and write their own progress rows.

#### AI Layer & Serverless: Supabase Edge Functions + OpenRouter
- **Serverless Compute:** Supabase Edge Functions (Deno 2.0+ / TypeScript runtime) to handle secure LLM API orchestration. Client applications must never call LLM APIs directly.
- **AI Aggregator:** OpenRouter API (Access to multiple LLMs via a single API key, utilizing cost-efficient models like DeepSeek-V3 or GPT-4o-mini).
- **AI SDK:** Vercel AI SDK (via Deno native `npm:` specifier, e.g., `npm:ai` and `npm:@ai-sdk/openai`) for structured JSON outputs (Stories, Vocabulary, and Quizzes) in a single LLM pass.
- **Online-Only AI:** Story generation and grammar explanations require an internet connection. Do not attempt to run LLM generation on device for the MVP.

#### Audio (TTS): Native Device Integration
- **Implementation:** Expo Speech (`expo-speech`) API.
- **Cost Optimization & UX:** Utilizes the device's native on-device Text-to-Speech engine. Fully free, requires $0 API budget.
- **Playback Synchronization:** Story is rendered as a list of sentences. The frontend plays sentences sequentially by invoking the next sentence's playback inside the `onDone` callback of the current sentence, dynamically updating a `currentSentenceIndex` state to highlight the active sentence.

---

### 3. System Architecture & Data Flow

All AI interactions must pass through Supabase Edge Functions to protect API secrets.

```text
[ React Native App (Expo Go on iPhone) ]
                   │
                   │ (1) Secure HTTPS Request + User JWT
                   ▼
     [ Supabase Edge Functions ]
                   │
                   │ (2) Injects OpenRouter API Key
                   ▼
         [ OpenRouter API ] ──(3) Sends Prompt──► [ Selected LLM ]
                   │                                     │
                   ▼                                     ▼
     [ Parses Structured JSON ] ◄──(4) Returns Text ─────┘
                   │
                   │ (5) Saves Log to PostgreSQL / Returns to Client
                   ▼
[ React Native App (Renders Interactive Content) ]
```

#### Hybrid Offline/Online Data Flow

The app has two progress layers:

1. **Local progress:** Written immediately on the device for learned words, daily word selection, flashcard state, and offline practice completion.
2. **Remote progress:** Synced to Supabase when the device is online and the user is authenticated.

```text
[ Bundled Oxford 5000 JSON ]
              │
              ▼
[ React Native App ] ──writes first──► [ Local Progress Store ]
              │                                  │
              │ online + authenticated           │ queued sync metadata
              ▼                                  ▼
        [ Supabase Progress Tables ] ◄──── sync/reconcile
```

Offline behavior:

- Word browsing, daily word selection, flashcards, local quizzes for individual words, and progress marking continue to work from bundled data and the local progress store.
- The "Text of the Day" generation action is disabled or replaced with an explicit offline message until connectivity is restored.
- Local changes are retained with sync metadata such as `updated_at`, dirty flags, or pending operations.

Online behavior:

- Local progress remains the immediate source of truth for UI responsiveness.
- Supabase receives pending local changes in the background or at clear sync points.
- If local and remote records conflict, resolve deterministically using per-record timestamps or explicit operation ordering. Do not overwrite newer local offline progress with stale remote data.

### 4. Implementation Guidelines for AI Code Generation
When writing code for this project, you MUST strictly adhere to these rules:

* **Language:** Always use TypeScript for both frontend (React Native) and backend (Supabase Edge Functions).
* **State Management:** Use standard React Hooks (useState, useEffect, useContext) or lightweight libraries like Zustand. Do not introduce Redux.
* **Styling:** Use standard React Native Stylesheet or Tailwind via NativeWind (if explicitly requested). Follow clean, minimalist UI design principles.
* **Supabase Client:** Always instantiate the Supabase client using environment variables (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).
* **Edge Functions Routing:** Supabase Edge Functions run on Deno 2.0+. Use modern native npm imports (e.g., `import { ... } from "npm:ai"`) for dependency resolution and package management.
* **Security:** Never hardcode API keys or secrets in the frontend codebase. All LLM configurations, prompt definitions, and validation logic belong inside the Edge Functions.
* **Offline-First Progress:** Any user action that changes vocabulary progress must be persisted locally before attempting network sync.
* **Dictionary Loading:** Load the Oxford 5000 JSON locally from the app bundle. Keep parsing and indexing deterministic, typed, and validated at the boundary.
* **Sync Safety:** Treat both local progress and remote progress as untrusted inputs during reconciliation. Validate shape, user ownership, timestamps, and allowed state transitions before applying changes.
