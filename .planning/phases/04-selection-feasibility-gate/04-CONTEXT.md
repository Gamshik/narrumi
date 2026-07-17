# Phase 4: Selection Feasibility Gate - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove on representative physical iOS and Android devices that learners can select and adjust an exact, non-empty continuous passage in the single-episode reader and within any one displayed episode in the multi-episode reader. The proof must preserve native-feeling selection plus the reader's scrolling, narration, dialogue, annotations, and Dynamic Type presentation. This phase is a stop/go gate before Phase 5 or any translation backend investment. Cross-episode selection, a WebView reader, sentence-only substitution, and an unapproved native adapter remain outside the phase boundary.

</domain>

<decisions>
## Implementation Decisions

### Exact-range pass criteria
- **D-01:** The observed selection must reconstruct the exact canonical characters from the owning episode source, including punctuation. Only invisible whitespace at the two outer edges may be trimmed.
- **D-02:** Selectable canonical content consists only of story narration and spoken dialogue. A continuous selection may cross sentence and visual-layout boundaries within one episode; episode headings, speaker labels, controls, and annotation metadata are excluded.
- **D-03:** Existing annotated words remain ordinary, continuous selectable story text. A range may start, end, or pass through an annotated fragment without gaps, and selection gestures take precedence over opening the annotation while selection is active.
- **D-04:** Preserve each platform's native word and character endpoint behavior rather than forcing custom character precision or whole-word endpoints. Whatever characters the native highlight contains must be reconstructed exactly.

### Agent's Discretion
- The concrete prototype structure, range-observation mechanism, fixture corpus, and evidence-recording format may be chosen during research and planning, provided they prove D-01 through D-04 on physical iOS and Android and preserve the Phase 4 stop/go gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase contract
- `.planning/ROADMAP.md` — Defines the Phase 4 goal, success criteria, physical-device gate, prohibited silent fallbacks, and dependency on a go decision.
- `.planning/REQUIREMENTS.md` — Defines `SELC-01`, `SELC-02`, and `SELC-04`, plus the deferred cross-episode selection and milestone exclusions.
- `.planning/PROJECT.md` — Defines the v1.2 milestone boundary, local-first product constraints, and the approved trusted-AI direction that begins only after this gate.

### Product and architecture
- `concept/prd_concept_mvp.md` — Canonical AI-series reader behavior and product scope that the feasibility prototype must preserve.
- `stack/tech_stack_mvp.md` — Canonical Expo Managed Workflow, React Native, and physical-device constraints; native projects are not approved by default.
- `architecture/architecture_for_ai.md` — Canonical layer boundaries and dependency rules for any prototype code retained after the gate.

### Reader presentation
- `design/design_system.html` — Canonical reader presentation and interaction reference whose narration, dialogue, annotation, and accessibility behavior must not be silently degraded.
- `design/design_system_guidelines.md` — Mandatory Bubble/Sorbet interaction, typography, motion, and accessibility rules for any feasibility UI added without an exact screen specification.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/src/presentation/app/screens/EpisodeReaderScreen.tsx`: Existing shared reader surface for both a single loaded episode and full-series history. It already tracks the scroll-focused episode separately from the rendered episode list.
- `apps/mobile/src/presentation/app/screens/episodeReader/components/EpisodeSentence/EpisodeSentence.tsx`: Renders narration, dialogue bubbles, and nested tappable annotation fragments; this is the critical selectable-text seam.
- `apps/mobile/src/presentation/app/screens/episodeReader/episodeReaderText.ts`: Splits canonical sentence text into stable annotated and unannotated chunks and can anchor range reconstruction back to existing source text.
- `apps/mobile/src/presentation/theme/layout.test.ts`: Existing reader layout contract tests can protect structural behavior that is observable without a device, alongside the required physical-device evidence.

### Established Patterns
- The app uses Expo SDK 57, React Native 0.86, strict TypeScript, Expo Router, and Managed Workflow with no committed native projects.
- `EpisodeReaderScreen` renders all loaded episodes inside an `Animated.ScrollView`; in full-series mode, measured episode headers update the active header as the learner scrolls.
- Story text is composed from per-sentence narration or dialogue layouts with nested pressable annotation spans. Feasibility must be proven against this real composed structure rather than a simplified plain-text surrogate.
- Automated tests use Node's test runner through `tsx`; no mobile E2E or React Native interaction-test harness currently exists, so automated checks cannot replace representative physical-device evidence.

### Integration Points
- Selection observation connects at the rendered story-text layer while canonical reconstruction connects to each episode's saved sentence frames and source text.
- Multi-episode proof must identify the episode containing the selected text from the selection surface itself, not from `activeEpisodeIndex` or the currently displayed header.
- Existing annotation presses, narration highlighting, audio controls, reader scrolling, and Dynamic Type layout are regression surfaces for the feasibility gate.

</code_context>

<specifics>
## Specific Ideas

- Treat the platform-native highlight as the visible truth for endpoint placement, then require the observed range to reproduce its exact canonical characters.
- Keep story text continuous through annotated spans and through narration/dialogue layout changes, while non-story labels and controls remain outside the selectable source.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-selection-feasibility-gate*
*Context gathered: 2026-07-17*
