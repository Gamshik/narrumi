# Narrumi (Context-English)

<p align="center">
  <strong>An open-source, offline-first interactive AI narrative engine & context-driven language acquisition platform.</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react&logoColor=black" alt="React Native" /></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-57-000020.svg?logo=expo" alt="Expo" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Edge%20Functions-3ECF8E.svg?logo=supabase&logoColor=white" alt="Supabase" /></a>
</p>

---

## 💡 Overview

**Narrumi** replaces rote flashcard memorization and rigid SRS review queues with **interactive, personal AI-driven narrative series**. Instead of reviewing isolated vocabulary words out of context, learners create and participate in dynamic, multi-episode English stories where target vocabulary (*Story Words*) is seamlessly woven into meaningful narrative situations.

### Core Philosophy & Research Focus
* **Contextual Acquisition over Isolated Memorization:** Words are learned naturally when encountered within emotional, high-stakes, or engaging narrative arcs.
* **Elimination of Review Debt:** Traditional spaced repetition often punishes missed days with an overwhelming backlog. Narrumi replaces backlog anxiety with cliffhangers and story curiosity.
* **Bounded Context & Compact Episodic Memory:** Investigating structured state serialization and memory boundaries to maintain long-term narrative consistency without unbounded LLM token growth.
* **Offline-First Architecture:** Ensures full local reading, vocabulary lookups, and audio interactions even without an internet connection, synchronizing with the cloud seamlessly when connected.

---

## ✨ Key Features

- 🎭 **Personal AI Series Creation:** 
  Create customizable series across two interaction modes:
  - **Producer Mode:** Direct and influence the plot and character decisions from the director's seat.
  - **Character Mode:** Experience the narrative from a direct second-person perspective (`you`), engaging in natural dialogue and decision-making.
- 📚 **Contextual Story Words Integration:**
  Dynamically incorporates curated vocabulary from the bundled [Oxford 5000](words/oxford-5000.json) dataset according to target CEFR proficiency levels.
- 🗣️ **Granular Direct Speech & Audio:**
  Semantic paragraph parsing separating direct dialogue from narrative beats, complete with tap-to-translate and context-aware lexical definitions.
- 🧠 **Bounded Series Memory Engine:**
  Structured memory serialization preserving character arcs, unresolved plot hooks, and learned vocabulary across multiple episodes.
- 📱 **Sorbet Soft-Pop Design System:**
  Tailored mobile design system featuring dimensional bubble surfaces, fluid micro-interactions, and accessible typography built with React Native Reanimated.
- 🔒 **Privacy-Preserving & Offline-First:**
  Complete local data persistence via AsyncStorage with secure, RLS-protected remote backup via Supabase.

---

## 🏗 Architecture

Narrumi is built following strict **Clean Architecture** principles to ensure modularity, maintainability, and testability across platforms:

```
apps/mobile/src/
├── domain/            # Enterprise business rules, entities, and value objects
│   ├── episode/       # Episode generation models, direct speech contracts
│   ├── series/        # Series entities, memory representations, participation modes
│   └── word/          # Vocabulary, CEFR levels, and learning signal types
├── application/       # Use cases, orchestrators, and port definitions
│   ├── use-cases/     # Series creation, episode progression, vocabulary lookup
│   └── ports/         # Repository interfaces, AI generation contracts, sync interfaces
├── infrastructure/    # Adapters, external clients, persistence & edge sync
│   ├── storage/       # Local AsyncStorage repositories & offline cache
│   └── supabase/      # Supabase client, Edge Function adapters, RLS sync
└── presentation/      # React Native UI components, screens, and design tokens
    ├── components/    # Reusable Sorbet Soft-Pop dimensional bubble components
    ├── hooks/         # Custom state & interaction hooks
    └── screens/       # Series setup, episode reader, interactive dialogue flow
```

For detailed architectural specifications and data flow diagrams, see [architecture/architecture_for_ai.md](architecture/architecture_for_ai.md) and [architecture/architecture_for_developer.html](architecture/architecture_for_developer.html).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Framework** | [React Native 0.86](https://reactnative.dev/) with [Expo 57](https://expo.dev/) (Managed Workflow) |
| **Language** | [TypeScript (Strict Mode)](https://www.typescriptlang.org/) |
| **Navigation** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing) |
| **Animations & UI** | [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/), [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| **Backend & Sync** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Edge Functions) |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) & OpenRouter Edge endpoints |
| **Local Persistence** | `@react-native-async-storage/async-storage` |
| **Bundled Dataset** | Oxford 5000 CEFR-mapped lexical seed |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- npm or yarn / pnpm
- Expo Go app on iOS / Android or a configured simulator

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Gamshik/narrumi.git
   cd narrumi
   ```

2. **Install mobile application dependencies:**
   ```bash
   cd apps/mobile
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file inside `apps/mobile/`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the Development Server:**
   ```bash
   npm run start
   ```

5. **Run Quality Checks & Tests:**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

---

## 🧪 Open-Source Research & Roadmap

- [x] **Core Architecture & Offline-First Storage Engine**
- [x] **Oxford 5000 Lexical Integration & CEFR Filtering**
- [x] **Bounded Memory & Multi-turn Narrative Flow**
- [ ] **Automated LLM Pedagogical Evaluation Harness:** Benchmark pipeline for measuring vocabulary retention and narrative coherence across model families (Claude 3.7 / 3.5 Sonnet, etc.).
- [ ] **Multi-Agent Conversational Roleplay:** Dynamic NPC generation and dialogue adaptation for Character Mode.
- [ ] **Pronunciation & Acoustic Feedback:** Offline and edge-assisted speech evaluation.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Gamshik/narrumi/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/amazing-feature`)
3. Commit your Changes (`git commit -m 'feat(narrative): add adaptive branch evaluation'`)
4. Push to the Branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
