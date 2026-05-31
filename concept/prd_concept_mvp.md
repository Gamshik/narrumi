# Product Requirements Document (PRD) — Concept Stage
## Project: Context-English App (MVP)

### 1. Role & Context
This document contains the finalized core concept and scope of the MVP for a language learning application. It describes the product idea, user value, and expected learning experience without prescribing technical implementation details.

### 2. Core Philosophy
The app solves the "illusion of competence" problem in vocabulary learning: users often recognize words in isolated exercises but fail to understand or use them in real text.

**The Core Loop:** Set a daily goal -> Learn words through cards -> Review words on schedule -> Receive a short story integrating today's learned words -> Read, listen, and test comprehension.

---

### 3. Target User Flow
1. **Daily Goal:** User sets a preferred number of new words per day once in settings and can change it later.
2. **Card Session:** User starts a session from the main screen and studies words through swipe cards with usage examples.
3. **Review:** Words marked as learned enter a scheduled review cycle until they reach the user's mastery target.
4. **Context Selection:** User selects a genre/setting for today's text.
5. **Read & Listen:** User reads an interactive personalized text, listens to it, and can check translations without leaving the text.
6. **Verify & Learn:** User takes a micro-quiz and can request grammar explanations for complex sentences.
7. **Complete:** Daily streak updated.

---

### 4. Feature Specifications (Strict MVP Scope)

#### FEATURE A: Personalized Text Generation
- The story is based on the words the user moved into the review cycle today, the user's grammar level, and the selected genre.
- The generated learning material includes:
  - a short story;
  - context-aware translations and phonetic transcriptions for the learned words;
  - 1-2 comprehension questions.
- **Constraints:** Total text length must be roughly **100-150 words**. 
- **Grammar Control:** Strict compliance with the target CEFR level. No complex grammatical structures allowed above the user's current level.

#### FEATURE B: Genre Personalization
- Pre-defined list of settings for text generation:
  - Daily Life / General
  - Work & IT / Business
  - Travel & Leisure
  - Short Fiction (Detective / Fantasy)

#### FEATURE C: Card-Based Word Learning
- The user starts a card session from the main screen.
- Each card shows a word and usage examples.
- The daily new-word goal is configured in settings: **3-20 new words per day**, default **5**.
- New-word card behavior:
  - Swipe left: the user already knows the word, so it is skipped and not added to learning.
  - Swipe right: the word is added to today's learning session.
- Same-day learning card behavior:
  - Swipe left: the user is confident the word is learned, so it enters the review cycle.
  - Swipe right: the user keeps learning the word, and it can appear again in the same session until marked as learned.

#### FEATURE D: Scheduled Review Cycle
- Each learned word has its own review cycle.
- A word first becomes available for review about 30 minutes after it is marked as learned.
- The user can configure how many successful review cycles are required for mastery: **2-8 repetitions**, default **5**.
- Review card behavior:
  - Swipe left: the user remembers the word, so it advances to the next review cycle.
  - Swipe right: the user forgot the word, so it returns to the previous review cycle.
- When a word returns to a previous review cycle, its next review becomes available after the delay assigned to that previous cycle.
- Exact review delays after the first 30-minute review are intentionally left open for a later product decision.
- A fully mastered word no longer appears in regular review.

#### FEATURE E: Inline Translation (Tap-to-Translate)
- Tapping *any* word opens an inline hint showing its translation and transcription.
- **Context-Aware Translation:** For today's learned words, translations and transcriptions must match the meaning of the word in the current story. Other words may use a general dictionary-style translation.
- The user must NOT leave the text view screen to see translations.

#### FEATURE F: Audio Assistant
- **Karaoke Sync Effect:** The story is played sentence by sentence. The active sentence is highlighted on screen while others are slightly dimmed.
- A central "Play/Pause" audio controller controls the playback state.

#### FEATURE G: Grammar Helper
- Long-pressing or selecting a sentence opens a concise grammar explanation.
- **Output:** A concise, clear breakdown of the grammatical structure used in that sentence.

#### FEATURE H: Comprehension Micro-Quiz
- 1-2 short comprehension questions with answer options based *only* on the text content to ensure active reading.

---

### 5. Grammar Quality Control
To ensure grammar safety and avoid incorrect or overly complex text, the product concept uses a two-step creation process:

1. **Writer:** Creates the story based on the selected words, genre, and user level.
2. **Validator:** Reviews the story, removes grammar that is too advanced for the user's level, and corrects weak or unsuitable sentences before the user sees the text.

---

### 6. Out of Scope (Backlog for v2.0)
- *Do NOT implement:* Placement testing on onboarding (users select level manually for now).
- *Do NOT implement:* "Save word from text to dictionary" feature.
