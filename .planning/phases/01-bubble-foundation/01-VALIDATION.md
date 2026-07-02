# Phase 1: Bubble Foundation - Validation

**Phase:** 01-bubble-foundation  
**Created:** 2026-07-02  
**Validation scope:** Nyquist coverage for VIS-01, VIS-02, VIS-03, VIS-04, MOT-01, MOT-02, and QUAL-01.

## Validation Architecture

Phase 1 is a presentation-foundation phase. Validation must prove that shared Bubble/Sorbet primitives, theme contracts, motion contracts, and floating tab spacing are planned with enough evidence to support later screen refresh phases without adding UI test dependencies.

## Requirement Evidence Map

| Requirement | Planned Evidence | Automated Checks | Manual Checks | Risk-Based Sampling |
|-------------|------------------|------------------|---------------|---------------------|
| VIS-01 | `RouteScreen` continues to own route-level `SorbetBackground`; shared tokens preserve Sorbet background roles. | `cd apps/mobile; npm run typecheck && npm run build` | Inspect at least one top-level route in light and dark appearance after Plan 03 to confirm the Sorbet gradient and floating fields remain visible behind content. | Sample one short content screen and one scroll-heavy screen because background issues are most likely to hide behind dense content. |
| VIS-02 | `BubbleSurface`, `BubbleButton`, `BubblePill`, and `BubbleSheet` exist in focused shared folders with public `index.ts` exports; `LevelBadge` and `DictionaryWordDetailsSheet` prove consumer wiring. | `cd apps/mobile; npm run lint && npm run typecheck` | Inspect badge, sheet, and one button/pill consumer to confirm rounded bubble surfaces, pill controls, compact badges, and soft card treatment match the Bubble/Sorbet language. | Sample one passive primitive, one pressable primitive, and one sheet frame because these cover the major reusable presentation shapes. |
| VIS-03 | New shared primitives consume semantic light/dark tokens from `@presentation/theme` rather than screen-local one-theme colors. | `cd apps/mobile; npm run lint && npm run typecheck && npm run build` | Toggle light and dark appearances and inspect text, icons, badges, sheets, and primary/secondary controls for readable contrast. | Prioritize selected, disabled, danger, warning, and sheet states because contrast regressions concentrate in state variants. |
| VIS-04 | `layout.ts` exposes pure floating tab metrics and content padding helpers; `SorbetTabBar` and scroll/list content use those helpers. | `cd apps/mobile; npm run test -- src/presentation/theme/layout.test.ts && npm run typecheck` | On a small mobile viewport or simulator, scroll to the final item/action on at least one list-like screen and one route-level screen; confirm the floating capsule does not cover final content. | Test bottom inset `0` and iPhone-style large bottom inset in automated helper tests, then manually sample a short screen and a long list. |
| MOT-01 | `BubbleButton` and pressable `BubblePill` use `JellyPressable`; tab items keep existing JellyPressable selected/press behavior. | `cd apps/mobile; npm run lint && npm run typecheck && npm run build` | Press primary button, secondary/ghost control, chip/pill, tab item, and list-row-like control where available; confirm scale feedback is subtle and does not shift layout. | Sample one control from each planned primitive family because wrapper prop forwarding can regress per component. |
| MOT-02 | Motion tokens exist for selected/sheet states; `BubbleSheet` and selected pill/button states expose stable minimal-motion style contracts. | `cd apps/mobile; npm run typecheck && npm run build` | Open/close the dictionary word detail sheet, switch active tabs, and toggle selected pill-like state; confirm feedback is soft, brief, and non-distracting. | Prioritize active tab, selected chip, and sheet frame because these are the Phase 1 state surfaces later screens will reuse. |
| QUAL-01 | Shared component folders each expose `index.ts`; shared barrel exports Bubble primitives; primitives stay presentation-only. | `cd apps/mobile; npm run lint && npm run typecheck && npm run test && npm run build` | Review changed imports to confirm shared primitives are reusable from public barrels and do not import domain, application, infrastructure, Supabase, persistence, sync, AI, or Story Words ranking code. | Inspect every new shared primitive folder and each consumer touched by Plan 03 because architecture drift is most likely at integration points. |

## Execution Checkpoints

| Plan | Validation Focus | Required Evidence |
|------|------------------|-------------------|
| 01-01 | Token contracts and pure floating-tab helper logic | `layout.test.ts` exists and passes; `tokens.ts`, `layout.ts`, and `theme/index.ts` typecheck. |
| 01-02 | Reusable Bubble primitives | New shared primitive folders exist, each folder has `index.ts`, and lint/typecheck pass. |
| 01-03 | Integration, exports, and full phase gate | `SorbetTabBar`, `MobileApp.styles.ts`, shared consumers, and shared barrel are wired; full lint/typecheck/test/build gate runs. |

## Manual Review Protocol

Manual validation is required because Phase 1 deliberately does not add a React Native component test renderer dependency. Manual checks should be performed after Plan 03 automated commands pass or after any automated blocker is documented.

1. Start the mobile app with `cd apps/mobile; npm run start`.
2. Inspect light and dark theme rendering for shared background, primitive surfaces, badges, sheet, and tab bar.
3. Press at least one primary control, secondary control, pill/chip, tab item, and list-row-like control.
4. Scroll to the bottom of a short route and a long list-like screen; final content must remain visible above the floating capsule tab bar.
5. Open the dictionary word detail sheet and confirm the sheet frame, handle, close affordance, and content readability.

## Risk-Based Sampling Rules

- **High risk:** VIS-03 and VIS-04. Sample both themes and multiple safe-area/content-height situations because these regressions affect basic usability.
- **Medium risk:** VIS-02, MOT-01, MOT-02, and QUAL-01. Sample every primitive family once and every integration consumer touched by Plan 03.
- **Lower risk:** VIS-01. Sample route-level background preservation after integration because the existing `SorbetBackground` already centralizes the behavior.

## Nyquist Completion Gate

Phase 1 validation is complete when:

- Each Phase 1 requirement has at least one automated check and one planned manual observation path in this file.
- `layout.test.ts` covers the pure safe-area/tab-bar helper behavior introduced by Plan 01.
- Plan 03 runs the canonical mobile gate: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Any manual or automated failure is documented in the relevant plan summary with the failed requirement ID and observed evidence.
