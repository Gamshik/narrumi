---
status: resolved
trigger: "Такое выскакивает иногда когда во время генерации выхожу. Нужно сделать так, чтобы если я выходил во время генерации ответа и возвращался, то анимация оставалась, чтобы пользователь понимал что происходит"
created: 2026-07-16T01:09:39+03:00
updated: 2026-07-16T01:20:10+03:00
---

# Debug Session: Generation Exit And Resume

## Symptoms

- **Expected:** If the user exits while an interaction continuation is being
  generated and returns to the unfinished episode, the same request remains in
  progress and the continuation animation is visible until it finishes.
- **Actual:** The remounted reader lost its in-memory submitting state; a
  Supabase remote upsert stack trace also appeared intermittently during this
  navigation sequence.
- **Errors:** Stack pointed to `SupabaseRemoteSeriesStore.upsert` at the awaited
  PostgREST upsert.
- **Timeline:** Observed with the new continuation animation.
- **Reproduction:** Submit a story choice, exit while the animation is active,
  then return to the unfinished episode.

## Current Focus

- **hypothesis:** Confirmed. The answer draft was durable but
  `isSubmittingInteraction` was component-local, so remount lost the animation.
  The completed action's background sync and a navigation-triggered sync could
  also replay the same queue concurrently.
- **test:** Require remount recovery to discover the persisted pending answer,
  join the existing interaction request, and require concurrent sync calls to
  share one serialized remote reconciliation run.
- **expecting:** One Edge Function continuation and one Supabase queue replay
  remain active; the remounted reader displays the animation and receives the
  durable result.
- **next_action:** None; fix and verification are complete.

## Evidence

- timestamp: 2026-07-16T01:09:39+03:00
  observation: `SubmitEpisodeInteraction` saves the selected answer locally
  before awaiting `InteractionGateway`.
  implication: A remounted reader can infer generation from an answer with no
  feedback without introducing a new persistence flag.
- timestamp: 2026-07-16T01:09:39+03:00
  observation: `EpisodeReaderScreen` initialized `isSubmittingInteraction` to
  false on every mount and only the original component owned the awaited result.
  implication: Navigation discarded the visible generation state even while
  the application request continued.
- timestamp: 2026-07-16T01:09:39+03:00
  observation: `withBackgroundSync` starts sync after interaction completion,
  while pre-sync reads and bootstrap actions can call the same `SyncLocalChanges`
  instance concurrently; the use case had no in-flight guard.
  implication: Returning during completion could create overlapping Supabase
  upserts for the same durable queue.
- timestamp: 2026-07-16T01:20:10+03:00
  observation: Regression tests confirm the pending answer is saved before
  vocabulary preparation, a remount shares the same continuation promise, and
  concurrent sync callers share one serialized reconciliation.
  implication: The animation can be restored promptly without duplicate AI or
  Supabase writes.

## Eliminated

- hypothesis: Generation should be cancelled when the reader unmounts.
  reason: Product intent is to keep the continuation running and show its state
  when the user returns; the local-first draft supports that behavior.
- hypothesis: A new explicit database status column is required.
  reason: The existing durable combination of a saved answer and missing
  feedback already represents a pending continuation unambiguously.

## Resolution

- **root_cause:** Generation visibility lived only in the mounted reader, while
  the durable pending answer was not interpreted on remount. Re-entry could also
  start a second sync pass over the same queue while background sync was active.
- **fix:** The reader now detects a saved answer without feedback, rejoins or
  retries its continuation, and keeps the animation visible until the result is
  stored. Interaction requests are single-flight and idempotent across the
  completion race. Sync requests are serialized with a trailing pass for writes
  queued during an active run, preventing overlapping Supabase upserts. Exited
  screens no longer present late interaction errors or update local UI state.
- **verification:** Focused regression tests passed, followed by `npm run lint`,
  `npm run typecheck`, `npm test` (115 passed), and `npm run build` in
  `apps/mobile`.
- **files_changed:** `EpisodeReaderScreen.tsx`,
  `episodeReaderContinuationResume.ts`,
  `episodeReaderContinuationResume.test.ts`,
  `submitEpisodeInteraction.ts`, `submitEpisodeInteraction.test.ts`,
  `syncLocalChanges.ts`, `syncLocalChanges.test.ts`, and the continuation
  prelude source-contract test.
