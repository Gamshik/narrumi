---
status: complete
quick_id: 260715-wne
commit: none
---

# Story Word suggestions slider refresh

Reworked the Settings control into a restrained editorial-style slider after rejecting the first toy-gel direction.

## Delivered

- thin semantic-color track and compact thumb;
- one-line title and live value without helper or endpoint copy;
- short spring scale only during direct manipulation, with Reduce Motion support;
- three tiny token-colored bubbles that rise and scatter around the thumb on each stepped change;
- immediately visible particle starts that remain readable during rapid stepped dragging;
- direction-aware particle drift that disappears after 320 ms without duplicating the value;
- one consistent JS animation driver for thumb position, scale, and particle motion;
- tap, drag, and screen-reader increment/decrement behavior;
- focused slider math regression tests;
- unchanged local-first preference persistence boundary.

## Verification

- `npm run lint` — passed;
- `npm run typecheck` — passed;
- `npm test` — passed, 100 tests;
- `npm run build` — passed for web, iOS, and Android;
- `git diff --check` — passed.

No commit was created because the target Settings file already contains intertwined user-authored CEFR changes and the worktree includes other unrelated edits.
