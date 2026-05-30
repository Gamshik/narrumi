# Product Requirements Document (PRD) — Concept Stage
## Project: Context-English App (MVP)

### 1. Role & Context
This document contains the finalized core concept and scope of the MVP for a language learning application. It describes the product idea, user value, and expected learning experience without prescribing technical implementation details.

### 2. Core Philosophy
The app solves the "illusion of competence" problem in vocabulary learning: users often recognize words in isolated exercises but fail to understand or use them in real text.

**The Core Loop:** Learn words -> Receive a short story integrating these exact words -> Read, listen, and test comprehension.

---

### 3. Target User Flow
1. **Learn:** User memorizes 5-7 new words.
2. **Context Selection:** User selects a genre/setting for today's text.
3. **Read & Listen:** User reads an interactive personalized text, listens to it, and can check translations without leaving the text.
4. **Verify & Learn:** User takes a micro-quiz and can request grammar explanations for complex sentences.
5. **Complete:** Daily streak updated.

---

### 4. Feature Specifications (Strict MVP Scope)

#### FEATURE A: Personalized Text Generation
- The story is based on the words the user has just learned, the user's grammar level, and the selected genre.
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

#### FEATURE C: Inline Translation (Tap-to-Translate)
- Tapping *any* word opens an inline hint showing its translation and transcription.
- **Context-Aware Translation:** For the target 5-7 learned words, translations and transcriptions must match the meaning of the word in the current story. Other words may use a general dictionary-style translation.
- The user must NOT leave the text view screen to see translations.

#### FEATURE D: Audio Assistant
- **Karaoke Sync Effect:** The story is played sentence by sentence. The active sentence is highlighted on screen while others are slightly dimmed.
- A central "Play/Pause" audio controller controls the playback state.

#### FEATURE E: Grammar Helper
- Long-pressing or selecting a sentence opens a concise grammar explanation.
- **Output:** A concise, clear breakdown of the grammatical structure used in that sentence.

#### FEATURE F: Comprehension Micro-Quiz
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
