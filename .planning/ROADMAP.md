# Roadmap: Context-English

## Overview

Milestone v1.2 extends the existing AI-series reader with ephemeral contextual passage translation. Work begins with a physical-device selection feasibility gate, then establishes single-episode ownership and bounded context, proves the transient async lifecycle, adds the trusted Edge translation boundary, integrates the Bubble/Sorbet controls, and finishes with accessible physical-device hardening.

## Milestones

- ✅ **v1.0 Bubble/Sorbet UI refresh** — Phases 1-2 (shipped 2026-07-05)
- ✅ **v1.1 App Bootstrap Loading** — Phase 3 (shipped 2026-07-06)
- 🚧 **v1.2 Contextual Passage Translation** — Phases 4-9 (planned)

## Phases

<details>
<summary>✅ v1.0 Bubble/Sorbet UI refresh (Phases 1-2) — SHIPPED 2026-07-05</summary>

- [x] **Phase 1: Bubble Foundation** - Shared Sorbet theme and interaction primitives (5/5 plans; completed 2026-07-04)
- [x] **Phase 2: Shell And Series Screens** - Bubble/Sorbet shell, auth, series, and settings surfaces (10/9 plans; completed 2026-07-05)

</details>

<details>
<summary>✅ v1.1 App Bootstrap Loading (Phase 3) — SHIPPED 2026-07-06</summary>

- [x] **Phase 3: Bootstrap Hydration And Sync** - Local-first startup hydration, non-blocking sync, and explicit bootstrap states (4/4 plans; completed 2026-07-06)

</details>

### 🚧 v1.2 Contextual Passage Translation (Planned)

**Milestone Goal:** Let learners translate any selected passage within one episode into natural Russian using the correct episode context, without disrupting the reader or bypassing the trusted AI boundary.

- [ ] **Phase 4: Selection Feasibility Gate** - Prove exact continuous passage selection in both reader modes on physical iOS and Android before backend investment.
- [ ] **Phase 5: Selection Ownership And Context Contracts** - Bind each selection to one episode and reconstruct its exact source with bounded relevant context.
- [ ] **Phase 6: Ephemeral Translation Flow** - Keep loading, offline, retry, result, and dismissal behavior transient and protected from stale responses.
- [ ] **Phase 7: Trusted Translation Boundary** - Return validated Russian-only translations through an authenticated Supabase Edge Function.
- [ ] **Phase 8: Bubble Selection Panel** - Present compact Translate controls with two restrained animated inactive question-mark placeholders.
- [ ] **Phase 9: Accessible Device Hardening** - Verify the final interaction across accessibility settings, themes, motion preferences, and physical devices.

## Phase Details

### Phase 4: Selection Feasibility Gate

**Goal**: Learners can select and adjust an exact non-empty continuous passage in the single-episode reader and within any one episode in the multi-episode reader on supported physical iOS and Android devices without breaking core reader interactions.
**Depends on**: Phase 3
**Requirements**: SELC-01, SELC-02, SELC-04
**Success Criteria** (what must be TRUE):

  1. On physical iOS and Android devices, a learner can select and adjust any non-empty continuous passage in the single-episode reader while scrolling and existing reader interactions remain usable.
  2. In the multi-episode reader, a learner can make the same kind of selection inside any individual displayed episode, including an earlier episode, without the active header determining the selection.
  3. Selection handles and highlighting remain native-feeling and track the exact chosen passage without silently reducing selection to a whole sentence, replacing the reader with a WebView, or degrading narration, dialogue, annotation, and Dynamic Type presentation.

**Plans**: 0/5 plans completed — blocked at the Plan 04-01 physical-device readiness gate

Plans:
**Wave 1**

- [ ] 04-01-PLAN.md — Confirm physical-device readiness and record the existing reader baseline.

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-02-PLAN.md — Build exact canonical-document, range-validation, and synthetic-fixture contracts.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 04-03-PLAN.md — Implement ordered React Native core selection probes.

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 04-04-PLAN.md — Mount both probes in the real single- and multi-episode reader through a development-only route.

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 04-05-PLAN.md — Run the physical iOS/Android matrix and record the strict GO/NO-GO verdict.

**UI hint**: yes
**Gate**: Stop before Phase 5 unless representative physical-device evidence proves stable observable ranges in both reader modes. If the Expo Managed core approach fails, obtain explicit approval for an EAS development build and a narrow native adapter; do not begin backend work or silently change the interaction.
**Scope boundary**: One selection spanning an episode boundary is deferred as SELC-05 and is not part of this gate or milestone.

### Phase 5: Selection Ownership And Context Contracts

**Goal**: Every active passage selection has one stable owning episode, an exact canonical source, and only the bounded relevant context needed for translation.
**Depends on**: Phase 4 go decision
**Requirements**: SELC-03, SAFE-02
**Success Criteria** (what must be TRUE):

  1. Selecting text in another episode replaces the prior selection so the reader never has more than one active episode owner.
  2. A passage selected from any displayed episode, including an earlier one, remains bound to that stable episode ID rather than the currently active header or visible position.
  3. The exact selected source and bounded adjacent context are reconstructed from the owning saved episode; mixed-episode ranges, invalid bounds, and full-series context are rejected.

**Plans**: TBD
**Scope boundary**: Cross-sentence passages within one episode are supported; a single selection whose endpoints belong to different episodes remains rejected and deferred.

### Phase 6: Ephemeral Translation Flow

**Goal**: Learners keep reading through a predictable online-only translation lifecycle whose selection and result state never persists or detaches from its source.
**Depends on**: Phase 5
**Requirements**: TRAN-03, STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):

  1. Starting translation shows a non-blocking loading state, preserves the selected passage, and prevents duplicate requests for the same selection.
  2. While offline, selection and reading remain usable, translation is clearly unavailable, and no hidden request is queued.
  3. A failed translation shows a safe recoverable state from which the learner can retry the same preserved selection.
  4. Replacing or dismissing the selection, changing its owning episode, or leaving the reader clears all ephemeral translation state, and any late response is ignored.

**Plans**: TBD

### Phase 7: Trusted Translation Boundary

**Goal**: Authenticated learners receive one natural contextual Russian translation through the trusted Supabase Edge boundary, with strict validation and no direct client-provider access.
**Depends on**: Phase 6
**Requirements**: TRAN-01, TRAN-02, SAFE-01, SAFE-03
**Success Criteria** (what must be TRUE):

  1. Translating a selected passage returns a natural Russian rendering that resolves relevant meaning from the bounded owning-episode context.
  2. The visible AI content contains only the translation, with no labels, explanations, alternatives, Markdown, or repetition of the English source.
  3. Translation requests are accepted only through an authenticated Supabase Edge Function; the mobile client never calls OpenRouter or another LLM provider directly.
  4. Invalid requests, provider failures, malformed responses, and explanation-bearing output produce safe typed failures, while raw selected passages and prompts never appear in logs.

**Plans**: TBD
**Research flag**: Confirm the pinned Vercel AI SDK/OpenRouter/Deno compatibility and define production request limits before finalizing or deploying the Edge implementation.

### Phase 8: Bubble Selection Panel

**Goal**: Learners can invoke contextual translation from a compact Bubble/Sorbet panel that preserves focus on the selected story text.
**Depends on**: Phase 7
**Requirements**: CTRL-01, CTRL-02, CTRL-03
**Success Criteria** (what must be TRUE):

  1. An active selection reveals a compact safe-area-aware Bubble/Sorbet panel that does not cover the selected text or native selection handles.
  2. The panel exposes one active Translate action and exactly two visibly inactive question-mark placeholders that accept no action.
  3. Both inactive placeholders use restrained ambient animation while disabled, without making them look actionable or disrupting reading.

**Plans**: TBD
**UI hint**: yes

### Phase 9: Accessible Device Hardening

**Goal**: Learners can use the complete passage-translation interaction accessibly and reliably across supported themes, text sizes, motion preferences, assistive technologies, and physical iOS and Android devices.
**Depends on**: Phase 8
**Requirements**: A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):

  1. On physical iOS and Android devices, the panel has meaningful accessible labels and adequate touch targets in light and dark themes and at supported Dynamic Type sizes.
  2. VoiceOver and TalkBack announce translation loading, success, and failure without stealing selection or trapping focus.
  3. The system reduced-motion preference removes or reduces panel and question-mark animation while keeping every supported action and state understandable.
  4. Final physical-device verification preserves selection handles, scrolling, scroll position, episode ownership, reader interactions, and recovery behavior in both reader modes.

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bubble Foundation | v1.0 | 5/5 | Complete | 2026-07-04 |
| 2. Shell And Series Screens | v1.0 | 10/9 | Complete | 2026-07-05 |
| 3. Bootstrap Hydration And Sync | v1.1 | 4/4 | Complete | 2026-07-06 |
| 4. Selection Feasibility Gate | v1.2 | 0/5 | Blocked — Android device and narration/audio baseline unavailable | - |
| 5. Selection Ownership And Context Contracts | v1.2 | 0/TBD | Not started | - |
| 6. Ephemeral Translation Flow | v1.2 | 0/TBD | Not started | - |
| 7. Trusted Translation Boundary | v1.2 | 0/TBD | Not started | - |
| 8. Bubble Selection Panel | v1.2 | 0/TBD | Not started | - |
| 9. Accessible Device Hardening | v1.2 | 0/TBD | Not started | - |
