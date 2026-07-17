---
phase: 04
slug: selection-feasibility-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-17
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test runner through `tsx 4.22.4` |
| **Config file** | `apps/mobile/package.json` (test script glob; no separate config) |
| **Quick run command** | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts"` |
| **Full suite command** | `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build` |
| **Estimated runtime** | ~30 seconds for the quick selection suite; full suite runtime varies by build cache |

---

## Sampling Rate

- **After every task commit:** Run the quick selection suite plus `cd apps/mobile && npm run typecheck`.
- **After every plan wave:** Run `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build`.
- **Before `$gsd-verify-work`:** The full suite must be green and physical-device evidence must have an explicit GO or NO-GO verdict.
- **Max feedback latency:** 60 seconds for automated selection checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SELC-01 | — | Synthetic fixture content is used; no user episode data is embedded in evidence. | unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SELC-01, SELC-02 | — | Range ownership remains scoped to one rendered episode and rejects invalid or stale offsets. | unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | SELC-01, SELC-02 | — | Probe code does not persist selected story text or send it across a trust boundary. | structural + unit | `cd apps/mobile && npm run typecheck && npm test` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | SELC-01, SELC-02, SELC-04 | — | Evidence uses synthetic content and records only the minimum device/scenario metadata needed for the gate. | manual physical-device gate | `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build` | ❌ W0 | ⬜ pending |

*Task IDs are provisional until PLAN.md files are generated; the planner must reconcile this map with final task IDs.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts` — frame inclusion/exclusion, separators, annotations, repeated text, and punctuation for SELC-01.
- [ ] `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts` — valid, empty, reversed, fractional, out-of-bounds, stale, and Unicode ranges for SELC-01 and SELC-02.
- [ ] `.planning/phases/04-selection-feasibility-gate/04-FEASIBILITY-EVIDENCE.md` — device metadata, scenario matrix, linked recordings/screenshots, escaped selected ranges, and one explicit gate verdict.
- [ ] A deterministic real-reader fixture that loads at least two synthetic episodes with narration, dialogue, repeated annotated words, punctuation, interactions, and enough text to scroll.

No new component-test or E2E framework is required. Automated tests protect deterministic document/range contracts; they cannot replace the roadmap's physical iOS and Android proof.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Select and adjust an exact non-empty continuous passage in the single-episode reader while scrolling. | SELC-01, SELC-04 | Native selection handles, gesture arbitration, and observable offsets differ by platform and require representative hardware. | On representative physical iOS and Android devices, load the synthetic fixture, select across narration/dialogue and multiple sentences, adjust both handles, scroll, record escaped selected text plus offsets, and capture evidence. |
| Select inside any one episode in the multi-episode reader, including an earlier episode, without active-header ownership. | SELC-02, SELC-04 | Virtualization, mounted episode boundaries, and active-header changes require the real multi-episode surface on hardware. | Load at least two episodes, select within the earlier and later episode independently, scroll until the active header changes, adjust handles, and verify the emitted episode ID still owns the exact selected range. |
| Preserve narration, dialogue, annotation taps, reader controls, Dynamic Type, and scrolling while selection is enabled. | SELC-04 | Native gesture and accessibility interactions are not fully represented by unit tests. | Run the interaction matrix on both platforms at default and enlarged Dynamic Type settings; exercise narration, dialogue presentation, annotation taps, reader controls, and scrolling before and after selection. |
| Issue a single GO or NO-GO verdict for the Expo Managed core approach. | SELC-01, SELC-02, SELC-04 | The roadmap explicitly forbids Phase 5 until representative physical-device evidence proves stable observable ranges. | Complete every required evidence row. Record GO only if both platforms pass all required reader modes; otherwise record NO-GO and stop for explicit approval before any EAS development build or native adapter work. |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or an explicit manual physical-device gate.
- [ ] Sampling continuity: no three consecutive tasks lack automated verification.
- [ ] Wave 0 covers all missing test and evidence references.
- [ ] No watch-mode flags are used.
- [ ] Automated feedback latency is under 60 seconds for the quick suite.
- [ ] Physical iOS and Android evidence is complete for both reader modes.
- [ ] One explicit GO or NO-GO verdict is recorded before Phase 5.
- [ ] `nyquist_compliant: true` and `wave_0_complete: true` are set only after all sign-off items pass.

**Approval:** pending
