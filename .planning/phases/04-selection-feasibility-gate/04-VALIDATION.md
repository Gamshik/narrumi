---
phase: 04
slug: selection-feasibility-gate
status: planned
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

- **After every code-producing task commit:** Run the quick selection suite plus `cd apps/mobile && npm run typecheck`; checkpoint-only Tasks 04-01-01, 04-05-01, and 04-05-02 run the full suite before evidence is accepted.
- **After every plan wave:** Run `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build`.
- **Before `$gsd-verify-work`:** The full suite must be green and physical-device evidence must have an explicit GO or NO-GO verdict.
- **Max feedback latency:** 60 seconds for automated selection checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SELC-04 | T-04-01-ID, T-04-01-SP | Device readiness and the existing-reader baseline record metadata/status only; user episode passages are not committed. | manual readiness gate + full regression | `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | SELC-01 | T-04-02-TM | Canonical documents contain exact narration/dialogue characters only and exclude labels, controls, and annotation metadata. | unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts" && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | SELC-01, SELC-02 | T-04-02-TM | Range ownership remains scoped to one episode/revision and rejects malformed, invalid, or stale offsets. | unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts" && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | SELC-01, SELC-02 | T-04-02-ID | The deterministic two-episode fixture is synthetic, in-memory, and contains no user data, persistence, or transport. | unit + lint/typecheck | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts" && npm run lint && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | SELC-01, SELC-04 | T-04-03-ID, T-04-03-EF | Probe A uses native selectable text and does not persist, transmit, or falsely claim observable offsets. | structural + unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionProbeSource.test.ts" && npm run lint && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 3 | SELC-01, SELC-02, SELC-04 | T-04-03-TM, T-04-03-ID | Probe B validates native offsets against the rendered episode/revision and keeps exact diagnostics ephemeral. | structural + unit | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionProbeSource.test.ts" "src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts" && npm run lint && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 4 | SELC-01, SELC-02, SELC-04 | T-04-04-EF, T-04-04-TM | Exact route tokens and `__DEV__` gate fixture injection; normal reader routing remains unchanged. | integration + full unit | `cd apps/mobile && npm run lint && npm run typecheck && npm test` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 4 | SELC-01, SELC-02, SELC-04 | T-04-04-EF | Structural tests protect the real scroll/header/episode surface and rendered-episode ownership without banning legitimate header state. | structural | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/episodeSelectionReaderIntegration.test.ts" "src/presentation/app/screens/episodeReader/selection/episodeSelectionProbeSource.test.ts" && npm run typecheck` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 5 | SELC-01, SELC-02, SELC-04 | T-04-05-TM, T-04-05-SP, T-04-05-ID | Physical evidence pairs synthetic exact diagnostics with visible native highlights on both named devices. | manual physical-device gate + full regression | `cd apps/mobile && npx tsx --test "src/presentation/app/screens/episodeReader/selection/**/*.test.ts" && npm run lint && npm run typecheck && npm test && npm run build` | ❌ W0 | ⬜ pending |
| 04-05-02 | 05 | 5 | SELC-01, SELC-02, SELC-04 | T-04-05-EF, T-04-05-RP | One auditable verdict releases Phase 5 only after all required physical rows pass; NO-GO authorizes no escalation. | human decision gate + full regression | `cd apps/mobile && npm run lint && npm run typecheck && npm test && npm run build` | ❌ W0 | ⬜ pending |

*Task IDs are final and match `04-01-PLAN.md` through `04-05-PLAN.md`.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Task 04-02-01 creates `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionDocument.test.ts` — frame inclusion/exclusion, separators, annotations, repeated text, and punctuation for SELC-01.
- [ ] Task 04-02-02 creates `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionRange.test.ts` — valid, empty, reversed, fractional, out-of-bounds, stale, and Unicode ranges for SELC-01 and SELC-02.
- [ ] Task 04-01-01 creates `.planning/phases/04-selection-feasibility-gate/04-FEASIBILITY-EVIDENCE.md`; Tasks 04-05-01 and 04-05-02 complete device metadata, scenario matrices, linked recordings/screenshots, escaped selected ranges, and the explicit gate verdict.
- [ ] Task 04-02-03 creates `apps/mobile/src/presentation/app/screens/episodeReader/selection/episodeSelectionFixture.ts`, and Task 04-04-01 loads its two synthetic episodes through the real reader in development mode.

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
