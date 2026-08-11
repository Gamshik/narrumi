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
1. **Series Creation:** User creates a series through four small reversible cards: Role, Idea, Characters, and Title. Role chooses Producer or Character. Idea, Characters, and Title can each be entered manually or generated with one card-local AI action. Earlier answers remain summarized and directly editable, and the series can be saved once the four cards are complete.
2. **Continue Series:** User opens an existing series or creates a new one.
3. **Episode Setup:** Before generating an episode, the user selects its CEFR level and genre, then the app proposes a small word set from the bundled vocabulary independently of CEFR.
4. **Word Choice:** User accepts the proposed words or makes light edits: add, remove, skip, or keep words.
5. **Episode Generation:** The app generates a short episode that continues the series, uses selected Story Words naturally across the episode arc, respects the user's level, and ends with a narrative hook.
6. **Read & Listen:** User reads the episode, listens block by block using semantic paragraphs and separate dialogue turns, can tap prepared Story Words for the word, transcription, context-aware translation, and part of speech, and can select visible story or interaction copy for an exact Russian translation without leaving the episode. A dialogue turn contains only words explicitly written as direct speech in the generated source; reported speech, attribution, and character actions remain narration even if an AI framing step labels them as dialogue.
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
  - premise;
  - participation mode;
  - main characters or user role;
  - optional creative brief;
  - setup field provenance;
  - current story memory.
- A series supports two participation modes:
  - **Producer mode:** the user influences how events unfold from outside the story;
  - **Character mode:** the user plays a specific role inside the story.
- In Character mode, `userRole` must identify one canonical character profile name so the app can distinguish learner-owned dialogue from other speakers without asking an AI model to infer ownership.
- Participation mode is selected during series setup and becomes read-only after the first episode is generated.
- In Producer mode, interaction prompts and choices must ask how events unfold, what a character does next, or how the scene changes.
- In Character mode, interaction prompts and choices must address what the user's character says, does, asks, or plans.
- Character-mode story prose must address the learner character in the second person (`you` / `your`). The AI may establish circumstances, sensory information, consequences, and other characters' behavior, but must not invent the learner character's direct speech, voluntary actions, decisions, plans, thoughts, or emotions.
- A learner's submitted spoken choice or reply is rendered once as a right-aligned outgoing bubble. The continuation starts with its consequence and must not repeat or paraphrase that answer as AI-authored dialogue. Physical actions remain second-person narrative beats rather than speech bubbles.
- Series creation is one modal flow with four required reversible cards: `Role`, `Idea`, `Characters`, and `Title`. Every card shows its title, one bundled labeled PNG, controls, and actions immediately without redundant helper paragraphs, card numbering, notices, or AI-provenance captions. One compact `Series setup` surface combines the four-node path, current count, and tappable earlier-answer chips instead of stacking a separate memory ribbon. Back actions, visited progress nodes, and those summaries reopen earlier cards without discarding later answers. CEFR level and genre belong to episode setup, and Tone is not a separate product field.
- The Role card selects Producer or Character. The Idea card edits the required series premise as one plain story idea. The Characters card edits character names plus an optional role or personality note; Character mode also requires `userRole` to match one canonical cast name. The Title card edits the final series title and exposes the save action.
- Idea, Characters, and Title each provide one `Generate by AI` action. The action is online-only, replaces only the field owned by that card, and leaves all earlier and later visible values unchanged. Character generation may choose any coherent cast size from one to eight. AI suggestions remain editable, and editing a generated value changes its provenance to user-authored.
- The AI boundary still returns one complete validated setup for coherence and safety. Each request carries an explicit generation target, and the client applies only that card: `premise` for Idea, `characterProfiles` plus Character-mode `userRole` for Characters, or `title` for Title. A non-character target preserves an existing cast exactly instead of expanding it through a hidden default. New-series requests use the safe internal `fill-missing` strategy and do not expose strategy selection.
- New series creation does not expose `worldAndSetting`, `backstory`, `storyDriver`, `preferredCastSize`, `mustInclude`, `avoid`, or draft-strategy controls. These compatibility fields remain empty defaults for new drafts so hidden values cannot affect generation. When an older unsaved draft is opened, its existing premise is preserved, or its legacy `idea` is promoted to the visible premise, then removed advanced values are cleared.
- Series setup text fields are required before a series can be saved as ready: title, premise, main characters, and user role for Character mode. The incomplete four-card form may still be saved locally as a draft from any card.
- Character mode requires a user role before the first episode is generated. Character generation may create a bounded role as part of a coherent cast.
- The empty compatibility creative brief and per-field setup provenance are persisted locally first and synced with the series. Existing persisted series retain backward-compatible reads for older creative-brief data.
- The setup form, card navigation, manual editing, and local draft saving remain usable offline. Each `Generate by AI` action is disabled with an explicit online-required state until connectivity returns.
- Opening an existing series must provide a setup menu with the same fields. The menu is editable only while the series has no generated episodes and read-only after the first episode.
- A series can contain any number of episodes.
- Each new episode continues the same series instead of starting an unrelated text.
- The primary motivation is narrative curiosity: every episode should end with a clear reason to continue.

#### FEATURE B: Episode Generation
- Each episode is a short learning unit.
- CEFR level and genre are selected for every new episode. The first episode defaults to the preferred CEFR level from Settings and the first approved genre (`daily-life`). Every later episode defaults to the previous episode's selections while remaining editable before generation.
- Genre includes daily life, comedy, romance, drama, work and IT, travel, cozy mystery, detective, adventure, thriller, fantasy, science fiction, and short fiction. Genre carries the episode's narrative feel; Tone is not a separate setting.
- The selected CEFR level and genre are persisted on the episode and must be reused for every interaction continuation inside that episode.
- Changing an episode's CEFR level must preserve the learner's current Story Words exactly. Story Word suggestions, shuffles, and Dictionary choices span every Oxford level; episode CEFR guides prose difficulty only.
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
- The hard episode window is deterministic: completion is prevented before interaction 5 and forced on interaction 10. Inside interactions 5-9, the Story Writer may end at a logical closing beat; the semantic Reviewer must not block an otherwise valid continuation only because it prefers a different turn count.
- The highlighted interaction prompt is a concise decision cue, not another story paragraph. It must ask one concrete question or use a very short cue when the choice context is already obvious, and it must never repeat, quote, summarize, or paraphrase the final story sentences.
- Episode completion means the current episode ends; it does not mean the personal series is permanently complete.
- The next episode cannot be generated until the current episode is marked complete. Returning to episode setup while generation is active must show the same active request, and returning after an unfinished episode is saved must resume that episode. Reopening a reader with a pending continuation must scroll once to the persisted answer and its visible loading state. One temporary continuation-service failure is retried silently inside that same loading state; only exhaustion may show a calm saved-answer status, never a developer console error or a transient failure popup. When generation finishes, the reader must reveal the first newly generated semantic block instead of jumping to the document end.
- **Episode Length:** The episode should be concise enough for a comfortable learning session, but substantial enough to develop the scene, use Story Words naturally across the episode arc, and lead to meaningful interaction. Do not enforce a fixed word-count range; adapt length to the user's CEFR level, the current scene, and narrative needs.
- **Story Word Distribution:** The initial generated scene may use only part of the selected Episode Words when the set is large. Later same-episode continuations should introduce remaining selected words naturally and may reuse encountered words when they fit instead of forcing all selected words into the first scene. Generation must preserve the selected Oxford entry's part of speech and meaning, using a small bounded set of that entry's examples as sense guidance rather than treating the headword alone as sufficient context.
- **Grammar Control:** Strict compliance with the target CEFR level. No complex grammatical structures above the user's current level.
- **Controlled Freedom:** The user can influence the story, but the app must keep level, safety, continuity, word usage, and episode structure under control.

#### FEATURE C: Story Words Selection
- The app uses `words/oxford-5000.json` as the bundled local vocabulary source.
- Story Word cards and Dictionary replacement results show a concise bundled Russian translation alongside the English word.
- Story Words selection is not a flashcard learning session. It is a lightweight step for choosing words that should appear in the next episode.
- Word suggestions may come from:
  - CEFR-independent suggestions from the bundled vocabulary;
  - genre-relevant words;
  - words from the bundled dictionary;
  - words previously selected for the same series.
- The Story Word goal in Settings determines how many editable word slots are proposed for each episode.
- Episode setup starts or resumes exactly that many slots. The user can replace one slot from the bundled Dictionary, replace it with a random valid candidate, or shuffle the complete set.
- Changing the Story Word goal affects the next prepared episode set. It does not create due work, review debt, or a required daily session.

#### FEATURE D: Simple Word Sets
- The MVP should support only simple word-set concepts:
  - **Today’s Words:** the internal stable daily suggestion source used to seed a new episode set;
  - **Episode Words:** words selected for a specific episode;
  - **Series Words:** words that have appeared in a specific series.
- The default behavior is helpful and lightweight: the app fills the configured number of slots automatically, while the user can replace or shuffle them before generation.
- There must be no scheduled review backlog or required repetition queue.
- If the user misses several days, the app must not show accumulated review debt. Previously selected and encountered words may return naturally in future episodes when they fit the story, level, and selected word set.

#### FEATURE E: Series Memory
- The app must preserve continuity without sending full unbounded history to the AI model.
- Each series should maintain a compact memory such as:
  - premise;
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

#### FEATURE G: Inline Translation And Selected-Text Translation
- Tapping a prepared Story Word inside an episode opens a compact sliding card showing only the word, transcription, context-aware translation, and part of speech.
- **Context-Aware Translation:** For selected Story Words and story-critical words, translations must match the meaning in the current episode.
- The user can select any phrase inside visible episode prose, dialogue, a Story Choice prompt, a saved answer, or feedback. Choice option controls remain interactive and are not selectable.
- Native selection handles remain available while a compact floating action panel appears without shifting the reading layout. Repeated taps inside the selected range restore its native highlight and keep the panel visible; a tap outside that range clears both together. Completing or closing a translation keeps the exact source text selected; only a normal tap elsewhere in the reader or a real reader scroll clears the previous selection.
- The first action is `Translate`; two disabled question-mark slots remain visible after it as reserved future reader actions and use restrained alternating ambient motion unless Reduce Motion is enabled.
- `Translate` sends only the exact selected text through the authenticated AI boundary, with no adjacent sentence or paragraph context, then returns a natural Russian translation of that text alone.
- Selected-text translation must contain only the translation: no grammar notes, explanations, labels, transcription, or teaching commentary.
- The result sheet must show the exact selected source text together with its Russian translation so the learner can verify what was translated.
- Selected-text translation is online-only and must show an explicit unavailable state while offline.
- The user must not leave the episode screen to see translations.

#### FEATURE H: Audio Assistant
- **Karaoke Sync Effect:** The episode is played one semantic reader block at a time. Related narration sentences stay in one meaningful paragraph or action beat, while dialogue turns remain separate. The active block is highlighted on screen while others are slightly dimmed. Legacy fields named `sentences` carry these blocks for client compatibility.
- Dialogue turns contain all directly quoted character speech and only text spoken once. When attribution and quoted speech appear inside one source passage, attribution remains narration while the complete quoted wording becomes a character bubble. Wording already present at the end of the preceding narration block, including reported speech, must not be repeated as a separate bubble.
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

1. **Story Writer & Decision Builder:** The Story Writer creates a complete validated series setup from participation mode and the visible idea, characters, and title context supplied to the current card-local request, then creates episode prose using bounded series memory, selected Story Words, the episode's genre and CEFR level, participation mode, and required episode structure. For episode openings and incomplete continuations, a cheaper structure-focused Decision Builder generates the next prompt and choices only after the story prose is frozen so they cannot pull the scene into a different scenario.
2. **Language, Continuity & Safety Validator:** Independently reviews each creative candidate for CEFR fit, concrete grammar and sentence-construction errors, part-of-speech-aware Story Word usage, continuity, learner-action and scenario alignment, repetition, participation mode, Character-mode second-person point of view and learner agency, logical closure, meaningful continuation development, choice diversity, safety, copyright constraints, and output shape before the user sees it. It does not choose a preferred completion turn inside the valid 5-9 window.
3. **Independent Learner Feedback:** Learner correction is generated separately from story continuation so the creative writer cannot conflate language evaluation with narrative consequences or invent an error for a valid predefined choice.
4. **Bounded Recovery:** A complete writer candidate rejected by the reviewer may be edited once by a stronger model using the original candidate plus concrete issue codes, evidence, and repair instructions. The editor must preserve unaffected fields. When every reported issue concerns only choice alignment or diversity, the accepted story prose is immutable and the editor returns only a replacement decision. When the only issue is direct-speech formatting, the editor receives a prose-only contract and may repair quotation marks without regenerating choices, summaries, completion state, or other story fields. If the writer pipeline fails structurally and there is no complete candidate to repair, one complete fallback candidate is allowed instead. Every repaired or fallback candidate passes the same reviewer again, and every unresolved semantic issue remains blocking. Unreviewed or structurally invalid output is never returned or persisted, and the full pipeline is not repeated inside one request.

Structured schema validation, deterministic safety and pacing rules, and final response invariants remain mandatory in addition to the semantic Writer -> Validator pipeline.

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
- *Do NOT implement in this iteration:* A free-text per-next-episode direction field; episode-level CEFR and the approved genre list are the only episode direction controls.
