---
status: resolved
trigger: "Когда пользователь авторизуется, он заходит и видит хоум экран где ни чего нет и плашка большая - Create story, однако потом у него подгружается и он видит все свои сериалы - нужно это исправить и показывать скелетон"
created: 2026-07-15
updated: 2026-07-15
---

# Debug Session: Home Series Loading Flicker

## Symptoms

- **Expected:** Home shows a skeleton until the saved series have finished loading.
- **Actual:** Home briefly renders the empty `Create story` state before the saved series appear.
- **Errors:** None reported.
- **Timeline:** Reported on 2026-07-15; prior working state is unknown.
- **Reproduction:** Authenticate as a user who already has saved series and observe the first Home render.

## Current Focus

- **hypothesis:** Confirmed. Home initialized its series collection as empty and rendered the empty state before the asynchronous local-series query settled.
- **test:** Model loading, empty, and ready as mutually exclusive states and verify that loading wins over an empty initial collection.
- **expecting:** The skeleton is shown until the initial query settles; the empty CTA appears only for a settled empty result.
- **next_action:** None; fix and verification are complete.

## Evidence

- timestamp: 2026-07-15
  observation: `HomeScreen` initialized `series` to `[]`, invoked `listSeries` from `useFocusEffect`, and rendered `CreateHero` solely from `series.length`.
  implication: The first render could not distinguish unresolved data from a real empty library.
- timestamp: 2026-07-15
  observation: The list query already returned the correct saved series and did not require persistence or sync changes.
  implication: The defect was isolated to presentation state modeling.
- timestamp: 2026-07-15
  observation: The regression test confirms `getHomeContentState(true, 0)` resolves to `loading`, while settled zero and nonzero counts resolve to `empty` and `ready`.
  implication: Empty-state rendering cannot precede completion of the initial query.

## Eliminated

- hypothesis: Saved series are unavailable immediately after authentication because remote synchronization is late.
  reason: Home reads the local series store, and the existing query eventually returns the expected records without a sync-layer change.

## Resolution

- **root_cause:** Home used an empty array for both the unresolved and truly empty states, so the `Create story` empty view rendered during the asynchronous local query.
- **fix:** Added an explicit initial-loading state, a deterministic Home content-state resolver, and a theme-aware Home series skeleton. The existing CTA/list render only after the initial query settles.
- **verification:** `npm run lint`, `npm test` (84 passed), `npm run typecheck`, and `npm run build` all passed in `apps/mobile`.
- **files_changed:** `HomeScreen.tsx`, `homeContentState.ts`, `homeContentState.test.ts`, and the `HomeSeriesSkeleton` component folder.
