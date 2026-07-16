# Product Requirements Document (PRD) — Concept Stage
## Project: Context-English App (MVP)

### 1. Role & Context
This document contains the finalized core concept and strict MVP scope for a language learning application. It describes the product idea, user value, and expected learning experience without prescribing low-level implementation details.

The MVP has been redesigned from a card-first vocabulary trainer into an interactive AI-series learning product. The application must no longer treat flashcards or scheduled review queues as the primary learning experience.

---

### 2. Core Philosophy
The app solves two common problems in vocabulary learning:

- users recognize isolated words in cards but fail to understand or use them in real situations;
- scheduled review systems can create review debt, where missed days become a large backlog that discourages returning.

**The Core Loop:** Create or continue a personal English series -> Choose a small set of Story Words -> Read and listen to a short AI-generated episode -> Influence the story through a choice or short reply -> Receive concise correction and context support -> End on a cliffhanger that motivates the next episode.

The product should feel like creating and watching a personal English series, not like completing a vocabulary queue.

---

### 3. Target User Flow
1. **Series Creation:** User creates a series by choosing a title, genre, CEFR level, tone, participation mode, and initial premise or role.
2. **Continue Series:** User opens an existing series or creates a new one.
3. **Story Words:** Before generating an episode, the app proposes a small word set from the bundled vocabulary.
4. **Word Choice:** User accepts the proposed words or makes light edits: add, remove, skip, or keep words.
5. **Episode Generation:** The app generates a short episode that continues the series, uses selected Story Words naturally across the episode arc, respects the user's level, and ends with a narrative hook.
6. **Read & Listen:** User reads the episode, listens to sentence-by-sentence audio, and can tap words for translation and transcription without leaving the episode.
7. **Interact:** User influences the same episode through several choices or short replies while the scene continues.
8. **Feedback And Continuation:** After every reply, the app provides concise correction or support, continues the same episode, and presents another interaction when the episode arc is not complete.
9. **Episode Completion:** The AI decides when the current episode has reached a meaningful ending. An episode normally contains 5-10 learner interactions and must not end after only a few routine choices.
10. **Persist Memory:** The app stores the complete episode, all learner replies, series memory, selected words, and learning signals locally first, then syncs when possible.

---

### 4. Feature Specifications (Strict MVP Scope)

#### FEATURE A: Personal AI Series
- A user can create multiple personal series.
- Each series has:
  - title;
  - genre;
  - CEFR level;
  - tone or mood;
  - premise;
  - participation mode;
  - main characters or user role;
  - current story memory.
- A series supports two participation modes:
  - **Producer mode:** the user influences how events unfold from outside the story;
  - **Character mode:** the user plays a specific role inside the story.
- Participation mode is selected during series setup and becomes read-only after the first episode is generated.
- In Producer mode, interaction prompts and choices must ask how events unfold, what a character does next, or how the scene changes.
- In Character mode, interaction prompts and choices must address what the user's character says, does, asks, or plans.
- Series setup text fields are required before a series can be saved: title, premise, main characters, and user role for Character mode.
- The setup screen provides a Generate action that can fill all missing text fields, including title, while preserving any text fields the user already entered. Generate must not create or change list-selected fields: CEFR level, genre, tone, or participation mode; it may only use them as constraints.
- Character mode requires a user role before the first episode is generated. If the user leaves role or setup details blank, Generate may create a complete AI setup draft before the first episode. This draft may be regenerated until the first episode is created.
- Opening an existing series must provide a setup menu with the same fields. The menu is editable only while the series has no generated episodes and read-only after the first episode.
- A series can contain any number of episodes.
- Each new episode continues the same series instead of starting an unrelated text.
- The primary motivation is narrative curiosity: every episode should end with a clear reason to continue.

#### FEATURE B: Episode Generation
- Each episode is a short learning unit.
- The generated episode must include:
  - optional short "previously" recap when useful for continuity;
  - main scene or dialogue;
  - selected Story Words used naturally across the episode arc;
  - several interaction points that let the user influence the same episode;
  - concise feedback or correction after each user input when applicable;
  - an AI-controlled episode completion decision;
  - a cliffhanger or unresolved narrative hook when the episode ends;
  - structured summary update for future episodes.
- An episode normally contains 5-10 meaningful learner interactions.
- The AI may choose the ending within this range when the current episode arc reaches a meaningful closing beat, but it must not end after only a few routine interactions.
- Every continuation and next interaction must be paced toward this 5-10 interaction ending. Early turns establish and complicate the local goal, middle turns develop consequences, and late turns converge toward closure instead of opening large new branches.
- Episode completion means the current episode ends; it does not mean the personal series is permanently complete.
- The next episode cannot be generated until the current episode is marked complete. Returning to episode setup while generation is active must show the same active request, and returning after an unfinished episode is saved must resume that episode.
- **Episode Length:** The episode should be concise enough for a comfortable learning session, but substantial enough to develop the scene, use Story Words naturally across the episode arc, and lead to meaningful interaction. Do not enforce a fixed word-count range; adapt length to the user's CEFR level, the current scene, and narrative needs.
- **Story Word Distribution:** The initial generated scene may use only part of the selected Episode Words when the set is large. Later same-episode continuations should introduce remaining selected words naturally instead of forcing all selected words into the first scene.
- **Grammar Control:** Strict compliance with the target CEFR level. No complex grammatical structures above the user's current level.
- **Controlled Freedom:** The user can influence the story, but the app must keep level, safety, continuity, word usage, and episode structure under control.

#### FEATURE C: Story Words Selection
- The app uses `words/oxford-5000.json` as the bundled local vocabulary source.
- Story Words selection is not a flashcard learning session. It is a lightweight step for choosing words that should appear in the next episode.
- Word suggestions may come from:
  - recommended words for the user's level;
  - genre-relevant words;
  - words from the bundled dictionary;
  - words previously selected for the same series.
- User actions for suggested words:
  - **Use in episode:** include the word in the next episode;
  - **Know it:** reduce future suggestion priority without marking permanent mastery;
  - **Later:** skip the word for now without a negative learning state;
  - **Remove:** remove the word from the current episode set.
- The app should not hard-block the number of selected words. If the user selects many new words, it should warn that the episode may become harder.

#### FEATURE D: Simple Word Sets
- The MVP should support only simple word-set concepts:
  - **Today’s Words:** words selected by the user during the current day;
  - **Episode Words:** words selected for a specific episode;
  - **Series Words:** words that have appeared in a specific series.
- The default behavior should be helpful and lightweight: the app may choose a reasonable set automatically, while the user can edit it before generation.
- There must be no scheduled review backlog or required repetition queue.
- If the user misses several days, the app must not show accumulated review debt. Previously selected and encountered words may return naturally in future episodes when they fit the story, level, and selected word set.

#### FEATURE E: Series Memory
- The app must preserve continuity without sending full unbounded history to the AI model.
- Each series should maintain a compact memory such as:
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
- The AI should use this memory to continue the series consistently.

#### FEATURE F: Learning Signals
- The product must avoid a simple "learned / not learned" vocabulary model as the primary user-facing concept.
- The app may track learning signals internally:
  - encountered;
  - selected;
  - translated;
  - understood;
  - used;
  - corrected;
  - resurfaced;
  - stable.
- These signals guide future word suggestions and natural resurfacing.
- The user must not be shown a punitive "due reviews" queue.

#### FEATURE G: Inline Translation (Tap-to-Translate)
- Tapping a word inside an episode opens an inline hint showing translation and transcription.
- **Context-Aware Translation:** For selected Story Words and story-critical words, translations must match the meaning in the current episode.
- The user must not leave the episode screen to see translations.

#### FEATURE H: Audio Assistant
- **Karaoke Sync Effect:** The episode is played sentence by sentence. The active sentence is highlighted on screen while others are slightly dimmed.
- A central Play/Pause audio controller controls the playback state.
- Audio should use native device TTS for the MVP.

#### FEATURE I: Interactive Reply And Feedback
- Each episode should contain several user interactions:
  - choose what happens next;
  - write a short reply;
  - ask a character a question;
  - explain a theory or plan;
  - discuss the scene with the AI in a constrained context.
- Every submitted interaction continues the same episode.
- The continuation should lead to another meaningful interaction until the AI marks the current episode complete.
- The AI should end an episode only after a coherent local story arc has developed, the learner's decisions have had visible consequences, and a closing beat or hook has been established.
- Feedback must be brief and story-friendly.
- Corrections should focus on one or two important issues rather than turning the episode into a grammar lecture.

#### FEATURE J: Safety And Copyright Boundaries
- The app must not generate unsafe content.
- The app must not encourage direct recreation of copyrighted worlds, characters, or protected franchises.
- If the user requests a copyrighted world, the app should help create an original story with a similar broad mood or genre instead of copying names, characters, or plots.

---

### 5. AI Quality Control
To keep episodes useful, safe, and level-appropriate, the product concept uses a controlled generation process:

1. **Episode Writer:** Creates the episode using series memory, selected Story Words, genre, user level, and required episode structure.
2. **Language & Safety Validator:** Reviews the episode for CEFR fit, grammar complexity, word usage, continuity, safety, and output shape before the user sees it.

For MVP implementation, the validation may start with structured JSON schema validation and explicit length/safety/level checks, then evolve into a stronger two-step Writer -> Validator pipeline.

---

### 6. Out of Scope (Backlog for v2.0)
- *Do NOT implement:* Traditional flashcard-first learning as the main product flow.
- *Do NOT implement:* Scheduled SRS review queues or user-facing review debt.
- *Do NOT implement:* Placement testing on onboarding (users select level manually for now).
- *Do NOT implement:* Public sharing or publishing of user-created series.
- *Do NOT implement:* Multiplayer or community story worlds.
- *Do NOT implement:* Voice conversation as a primary interaction mode.
- *Do NOT implement:* Image, comic, or video generation for episodes.
- *Do NOT implement:* Unvalidated arbitrary user vocabulary import.
- *Do NOT implement:* Direct copying of copyrighted story worlds or characters.
