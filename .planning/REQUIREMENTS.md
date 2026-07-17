# Requirements: Context-English

**Defined:** 2026-07-17
**Core Value:** The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## v1.2 Requirements

Requirements for the Contextual Passage Translation milestone. Each requirement maps to exactly one roadmap phase.

### Passage Selection

- [ ] **SELC-01**: User can select any non-empty continuous passage within an episode in the single-episode reader.
- [ ] **SELC-02**: User can select a passage within any individual episode displayed in the multi-episode reader.
- [ ] **SELC-03**: A selection belongs to one episode, and selecting text in another episode replaces the previous selection.
- [ ] **SELC-04**: User can select and adjust a passage on supported physical iOS and Android devices without breaking reader scrolling or existing reader interactions.

### Selection Controls

- [ ] **CTRL-01**: User sees a compact Bubble/Sorbet action panel for an active selection without the panel obscuring the selected text or native selection handles.
- [ ] **CTRL-02**: User sees one active Translate action and two inactive question-mark placeholders in the selection panel.
- [ ] **CTRL-03**: User sees restrained animation on both question-mark placeholders while they remain disabled and perform no action.

### Contextual Translation

- [ ] **TRAN-01**: User receives a natural Russian translation of the selected passage that uses the owning episode's relevant context.
- [ ] **TRAN-02**: User sees only the translation, without labels, explanations, alternatives, Markdown, or repetition of the selected English source.
- [ ] **TRAN-03**: User never sees a translation detached from its exact selection because changing the selection or owning episode invalidates the previous result.

### States and Reliability

- [ ] **STAT-01**: User sees a non-blocking loading state that preserves the selection and prevents duplicate translation requests.
- [ ] **STAT-02**: User sees that translation is unavailable while offline while selection and reading remain usable.
- [ ] **STAT-03**: User sees a safe error state and can retry translation for the same preserved selection.
- [ ] **STAT-04**: User's ephemeral selection and translation state clears when the selection is dismissed or replaced or when the user leaves the reader.

### Accessibility and Motion

- [ ] **A11Y-01**: User can operate the selection panel with accessible labels and touch targets across supported light and dark themes and Dynamic Type sizes.
- [ ] **A11Y-02**: User receives accessible announcements for translation loading, success, and failure states.
- [ ] **A11Y-03**: User's system reduced-motion preference is respected by the selection panel and question-mark animations.

### Trusted AI Boundary

- [ ] **SAFE-01**: User's translation request is processed only through an authenticated Supabase Edge Function without a direct client call to an LLM provider.
- [ ] **SAFE-02**: User's request sends only the selected passage and bounded relevant context resolved from its stable owning episode ID.
- [ ] **SAFE-03**: User is protected from invalid AI output because request and response data are strictly validated, explanation-bearing output is rejected, and raw selected passages are not written to logs.

## Future Requirements

Deferred beyond v1.2 and excluded from the current roadmap.

### Extended Selection

- **SELC-05**: User can create one selection that spans an episode boundary in the multi-episode reader.

### Future Controls

- **CTRL-04**: User can invoke defined future actions from the two question-mark control slots.

### Translation Expansion

- **TRAN-04**: User can choose a translation target language other than Russian.
- **TRAN-05**: User can translate a selected passage without a network connection.

### Translation History

- **HIST-01**: User can save and revisit passage translations.
- **HIST-02**: User can copy, share, or export a passage translation through dedicated product actions.

## Out of Scope

Explicitly excluded from milestone v1.2 to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Grammar explanations, vocabulary analysis, alternative translations, transliteration, or confidence scores | The approved interaction returns only one contextual Russian translation. |
| Automatic, whole-episode, or persistent bilingual translation | The feature is a deliberate comprehension aid for an explicit user selection, not a new reading mode. |
| Story Word creation, learning-signal mutation, translation history, or sync writes | Passage translation is ephemeral and read-only for this milestone. |
| Defined behavior for the two question-mark placeholders | Their animation and disabled presentation are included, but their future actions are intentionally unspecified. |
| Direct client calls to OpenRouter or another LLM provider | Prompts, secrets, provider configuration, and output validation must remain inside the trusted Edge boundary. |
| Committed native `ios/` or `android/` projects, a WebView reader, or silent replacement of arbitrary selection with sentence-only actions | The project remains in Expo Managed Workflow and any native fallback requires a separate explicit decision after the feasibility gate. |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SELC-01 | — | Pending |
| SELC-02 | — | Pending |
| SELC-03 | — | Pending |
| SELC-04 | — | Pending |
| CTRL-01 | — | Pending |
| CTRL-02 | — | Pending |
| CTRL-03 | — | Pending |
| TRAN-01 | — | Pending |
| TRAN-02 | — | Pending |
| TRAN-03 | — | Pending |
| STAT-01 | — | Pending |
| STAT-02 | — | Pending |
| STAT-03 | — | Pending |
| STAT-04 | — | Pending |
| A11Y-01 | — | Pending |
| A11Y-02 | — | Pending |
| A11Y-03 | — | Pending |
| SAFE-01 | — | Pending |
| SAFE-02 | — | Pending |
| SAFE-03 | — | Pending |

**Coverage:**
- v1.2 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after milestone scope confirmation*
