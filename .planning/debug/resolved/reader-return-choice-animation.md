---
status: resolved
trigger: "да нет же. я возвращаюсь продолжить, нажимаю и нет  ни какой анимации"
created: 2026-07-16T00:57:48+03:00
updated: 2026-07-16T01:02:58+03:00
---

# Debug Session: Reader Return Choice Animation

## Symptoms

- **Expected:** After reopening an unfinished series and pressing a new story
  choice, the continuation animation appears immediately and remains visible
  while the response is generated.
- **Actual:** The choice was submitted after returning, but no continuation
  animation appeared.
- **Errors:** No error message reported.
- **Timeline:** Observed after adding the next-scene animation.
- **Reproduction:** Leave an unfinished series before making its next choice,
  reopen it from series history or the full-series reader, and press a choice.

## Current Focus

- **hypothesis:** Confirmed. A reopened reader can carry `isReadOnly=true`; after
  the optimistic answer is inserted, `EpisodeInteractionBlock` took its
  read-only saved-answer branch and hardcoded `isGenerating={false}` even though
  `isSubmittingInteraction` was true.
- **test:** Model the presentation state for a saved answer submitted from a
  reopened reader and require the generation flag to remain true.
- **expecting:** A newly selected answer always renders the continuation prelude
  while its request is active, regardless of the route used to reopen the
  unfinished episode.
- **next_action:** None; the corrected fix and verification are complete.

## Evidence

- timestamp: 2026-07-16T00:57:48+03:00
  observation: `submitChoice` already set `isSubmittingInteraction` to true and
  optimistically inserted `selectedChoiceId` plus the visible reply.
  implication: The animation had all required state immediately after the tap.
- timestamp: 2026-07-16T00:57:48+03:00
  observation: Episode history and full-series routes can open the reader with
  `readOnly=true`, while the latest unfinished interaction remains answerable.
  implication: Returning through either route can combine a submitted answer,
  active request, and read-only route flag.
- timestamp: 2026-07-16T00:57:48+03:00
  observation: The first saved-answer branch checked `isReadOnly &&
  hasSavedAnswer` and always passed `isGenerating={false}` before the normal
  pending-answer branch could use `isSubmitting`.
  implication: The read-only branch masked the animation specifically after a
  choice was made in a reopened reader.
- timestamp: 2026-07-16T01:02:58+03:00
  observation: The focused regression test failed before the presentation rule
  existed and passed after active submission was given priority over read-only
  settling.
  implication: The corrected state transition directly protects the reported
  return-then-press interaction.

## Eliminated

- hypothesis: The selected choice is not inserted until the network response.
  reason: `applyOptimisticChoice` updates the visible interaction before the
  request is awaited.
- hypothesis: The animation component fails to mount after navigation.
  reason: Its mount was gated by the incorrect presentation branch, not by its
  own animation lifecycle.
- hypothesis: The user exits while generation is already active and the request
  must be restored on remount.
  reason: The user clarified that generation begins only after returning and
  pressing a new choice; the prior recovery implementation was removed.

## Resolution

- **root_cause:** The read-only saved-answer branch had higher priority than the
  active-submission branch, so a choice made after reopening was rendered as
  settled with `isGenerating={false}` while its request was still running.
- **fix:** Added a focused presentation-state rule that treats read-only saved
  answers as settled only while idle. During submission, the existing pending
  answer branch now receives `isSubmitting=true` and renders the continuation
  prelude. Removed the previous unrelated request-restoration implementation.
- **verification:** Focused regression tests passed, followed by `npm run lint`,
  `npm run typecheck`, `npm test` (107 passed), and `npm run build` in
  `apps/mobile`.
- **files_changed:** `EpisodeReaderScreen.tsx`,
  `episodeInteractionPresentation.ts`,
  `episodeInteractionPresentation.test.ts`, and the continuation prelude source
  contract test.
