# Requirements: Context-English Bubble/Sorbet UI Refresh

**Defined:** 2026-07-02
**Core Value:** The app must feel like continuing a personal English series that teaches words in context, not like servicing a vocabulary queue.

## v1.0 Requirements

### Visual System

- [x] **VIS-01**: User sees Sorbet-style gradient backgrounds and soft floating color fields consistently on top-level app screens.
- [x] **VIS-02**: User sees primary content grouped into rounded bubble surfaces, pill controls, compact badges, and soft cards matching the `design/bubble` references.
- [x] **VIS-03**: User can use the refreshed UI in light and dark themes without unreadable text, broken contrast, or hardcoded one-theme colors.
- [x] **VIS-04**: User can navigate with a floating capsule tab bar that stays clear of safe areas and does not cover final scroll content.

### Screen Alignment

- [x] **SCR-01**: User can sign in or create an account through an authentication screen aligned with `design/bubble/auth.png`.
- [x] **SCR-02**: User can browse and continue series from a home screen aligned with `design/bubble/home.png`.
- [x] **SCR-03**: User can create or edit a not-yet-started series through a setup screen aligned with `design/bubble/newseries.png`.
- [x] **SCR-04**: User can view an existing series, continue the latest episode, prepare the next episode, and inspect episode history through a details screen aligned with `design/bubble/series.png`.
- [x] **SCR-09**: User can manage account, sync, appearance, level, and series defaults through a settings screen aligned with `design/bubble/settings.png`.

### Motion And Feedback

- [x] **MOT-01**: User receives a subtle spring-like scale response when pressing primary buttons, secondary buttons, chips, list rows, tab items, and story choices.
- [x] **MOT-02**: User sees sheets, active tab highlights, and selected states appear with minimal motion that feels soft and does not distract from reading.
- [x] **MOT-03**: User sees success, warning, disabled, loading, and offline states expressed in the Bubble/Sorbet style without losing accessibility.

### Architecture And Quality

- [x] **QUAL-01**: Developers can reuse shared presentation primitives for bubble surfaces, pressable motion, floating tabs, pills, badges, and sheets instead of duplicating per-screen styling.

## Future Requirements

### v1.1 Requirements (Learning Screens)

- [ ] **SCR-05**: User can read an episode, see dialogue bubbles, choose the next story action, and keep navigation usable through a reader screen aligned with `design/bubble/reader.png`.
- [ ] **SCR-06**: User can choose Story Words and generate an episode through a daily/session setup screen aligned with `design/bubble/session.png`.
- [ ] **SCR-07**: User can browse Oxford vocabulary through a dictionary screen aligned with `design/bubble/dict.png`.
- [ ] **SCR-08**: User can inspect tap-to-translate word details in a bottom sheet aligned with `design/bubble/translate.png`.
- [ ] **QUAL-02**: Presentation code remains thin and does not move AI generation, persistence, sync, Story Words ranking, or domain rules into React components.
- [ ] **QUAL-03**: User-facing server-only actions still show explicit offline states after the visual refresh.
- [ ] **QUAL-04**: The refreshed app passes the documented lint, typecheck, build, and relevant test commands.

### Visual Expansion

- **FUT-01**: User can experience richer screen transition choreography after the MVP refresh is stable.
- **FUT-02**: User can customize theme accents beyond the fixed Bubble/Sorbet palette.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Flashcard-first redesign | Conflicts with the AI-series PRD and current core value |
| Scheduled review queues or review debt | Explicitly excluded by the PRD |
| New AI generation behavior | This milestone is a UI refresh, not a backend or prompt-scope change |
| Native iOS or Android code | Expo Managed Workflow forbids native project changes |
| New navigation destinations beyond existing MVP flows | The mockups guide presentation for current flows, not a product expansion |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 1 | Complete |
| VIS-02 | Phase 1 | Complete |
| VIS-03 | Phase 1 | Complete |
| VIS-04 | Phase 1 | Complete |
| MOT-01 | Phase 1 | Complete |
| MOT-02 | Phase 1 | Complete |
| QUAL-01 | Phase 1 | Complete |
| SCR-01 | Phase 2 | Complete |
| SCR-02 | Phase 2 | Complete |
| SCR-03 | Phase 2 | Complete |
| SCR-04 | Phase 2 | Complete |
| SCR-09 | Phase 2 | Complete |
| MOT-03 | Phase 2 | Complete |
| SCR-05 | Phase 3 (v1.1) | Pending |
| SCR-06 | Phase 3 (v1.1) | Pending |
| SCR-07 | Phase 3 (v1.1) | Pending |
| SCR-08 | Phase 3 (v1.1) | Pending |
| QUAL-02 | Phase 3 (v1.1) | Pending |
| QUAL-03 | Phase 3 (v1.1) | Pending |
| QUAL-04 | Phase 3 (v1.1) | Pending |

**Coverage:**

- v1.0 requirements: 13 total (13 complete)
- v1.1 requirements: 7 total (0 complete)
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-07-02*
*Last updated: 2026-07-05 after Phase 02 completion*
