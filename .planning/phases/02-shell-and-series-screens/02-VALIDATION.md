---
phase: 02
slug: shell-and-series-screens
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-05
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node `tsx --test` through `npm run test`; ESLint; TypeScript; Expo export |
| **Config file** | `apps/mobile/package.json`, `apps/mobile/eslint.config.js`, `apps/mobile/tsconfig.json`, `apps/mobile/app.json` |
| **Quick run command** | `cd apps/mobile; npm run lint && npm run typecheck` |
| **Full suite command** | `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build` |
| **Estimated runtime** | Approximately 120-300 seconds, depending on Expo export cache |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/mobile; npm run lint && npm run typecheck`.
- **After every plan wave:** Run the plan-specific automated command, then `cd apps/mobile; npm run lint && npm run typecheck`.
- **Before `$gsd-verify-work`:** Full suite must be green: `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build`.
- **Max feedback latency:** One task commit for static checks; one wave for focused tests; final phase gate for Expo export and visual UAT.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MOT-03 | T-02-01 / T-02-SC | Status primitive stays presentation-only and does not import services, SDKs, persistence, sync, AI, navigation, or domain use cases. | static + typecheck | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-01-02 | 01 | 1 | SCR-01, MOT-03 | T-02-02 | Auth remains behind `useAuthSession`; UI preserves disabled/loading/error/success behavior. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-01-03 | 01 | 1 | SCR-01, MOT-03 | T-02-01 / T-02-02 | Auth/status boundary audit confirms no direct Supabase or service leakage into status display. | static + typecheck | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-02-01 | 02 | 2 | SCR-02 | T-02-03 | Home create action still uses existing create modal path and local app services. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-02-02 | 02 | 2 | SCR-02 | T-02-03 | Saved series cards preserve open/delete behavior and loading state. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-02-03 | 02 | 2 | SCR-02, MOT-03 | T-02-04 | Home state feedback and floating tab clearance stay stable on small viewports. | unit + static + manual visual | `cd apps/mobile; npm run test -- src/presentation/theme/layout.test.ts && npm run lint && npm run typecheck` | yes | pending |
| 02-03-01 | 03 | 3 | SCR-03 | T-02-05 | Create setup keeps validation and existing AI setup-assist boundary. | use-case tests + static + manual visual | `cd apps/mobile; npm run test -- src/application/useCases/generateSeriesSetupDraft.test.ts src/application/useCases/createSeries.test.ts && npm run lint && npm run typecheck` | yes | pending |
| 02-03-02 | 03 | 3 | SCR-03 | T-02-06 | Edit setup keeps read-only lock and update behavior after the first episode. | use-case tests + static + manual visual | `cd apps/mobile; npm run test -- src/application/useCases/updateSeriesSetup.test.ts && npm run lint && npm run typecheck` | yes | pending |
| 02-03-03 | 03 | 3 | SCR-03, MOT-03 | T-02-05 / T-02-06 | Character card extraction, if used, remains display-only and preserves disabled/read-only styling. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-04-01 | 04 | 4 | SCR-04 | T-02-07 | Continue/prep actions preserve route callbacks and do not move navigation ownership into cards. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-04-02 | 04 | 4 | SCR-04 | T-02-08 | Memory is hidden only when empty and never invents series memory content. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-04-03 | 04 | 4 | SCR-04, MOT-03 | T-02-09 | Episode read/delete actions preserve confirmation and disabled/deleting state. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-05-01 | 05 | 5 | SCR-09 | T-02-13 | Learning preferences still update through existing application services and optimistic rollback. | static + typecheck + manual visual | `cd apps/mobile; npm run lint && npm run typecheck` | yes | pending |
| 02-05-02 | 05 | 5 | SCR-09, MOT-03 | T-02-14 | Sync result display uses existing safe labels and preserves manual sync/sign-out behavior. | sync tests + static + manual visual | `cd apps/mobile; npm run test -- src/application/useCases/syncLocalChanges.test.ts src/application/sync/conflictResolver.test.ts src/application/sync/syncQueuePolicy.test.ts && npm run lint && npm run typecheck` | yes | pending |
| 02-05-03 | 05 | 5 | SCR-01, SCR-02, SCR-03, SCR-04, SCR-09, MOT-03 | T-02-15 | Full Phase 2 gate passes before verify-work; visual UAT confirms screenshot parity and tab clearance. | full suite + blocking human visual | `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build` | yes | pending |

*Status: pending, green, red, flaky.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- No new test framework dependency is required for Phase 2.
- No screenshot/component-test harness is added without explicit approval.
- Existing `tsx --test`, ESLint, TypeScript, and Expo export commands are sufficient for automated sampling.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth visual parity with `design/bubble/auth.png` | SCR-01, MOT-03 | No React Native screenshot harness exists, and the requirement is visual alignment. | Inspect centered panel, pill mode switch, rounded inputs, submit disabled/loading state, and status badge in light and dark themes. |
| Home create-first layout and mini-cards | SCR-02, MOT-03 | Visual hierarchy, empty-state placement, and tab clearance need device inspection. | Compare home to `design/bubble/home.png`; verify create hero, saved series mini-cards, connected/status badge, delete state, and final content above floating tab bar. |
| Create/edit setup modal visual parity | SCR-03, MOT-03 | Segmented controls, character cards, read-only state, and validation placement are visual. | Compare setup flows to `design/bubble/newseries.png`; verify one Generate action, rounded fields, cards, validation, generating, saving, and read-only feedback. |
| Series details visual parity | SCR-04, MOT-03 | Continue/prep priority, conditional memory, and episode card hierarchy are visual. | Compare to `design/bubble/series.png`; verify header, primary card, memory hidden/shown rules, episode read/delete states, and empty-history feedback. |
| Settings visual parity and state feedback | SCR-09, MOT-03 | Learning-first grouping and compact sync/status row are visual and interactive. | Compare to `design/bubble/settings.png`; verify learning preferences first, compact account/sync row, manual sync, theme controls, disabled/offline/error/success states, and tab clearance. |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only rationale.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency is bounded by task/wave/full-suite gates.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-05 for planning; execution remains pending.
