# Context-English: Sorbet Soft-Pop Design System Guidelines

This handbook is the canonical design ruleset for AI agents and contributors when a screen or component does not already have an exact implementation reference. The current product direction is not flat Apple liquid glass. It is a soft-pop "Sorbet" interface: dimensional rounded surfaces, playful but restrained color, and a single living background shared across routes.

## 1. Core Visual Direction

- Build around a soft-pop, tactile look. Surfaces should feel inflated, cushioned, and slightly luminous instead of flat or purely translucent.
- Keep one shared atmospheric background for the app shell. Route transitions may move content, but they must not swap to a different decorative background per screen.
- Use motion to make the interface feel alive, not busy. Background animation must stay slow, peripheral, and non-blocking.
- Prefer depth from layering, subtle gradients, and warm tinted shadows. Avoid harsh black shadows, thin sterile outlines, and empty white space that makes the UI feel unfinished.
- The product should still read as mobile-first, premium, and iOS-friendly, but not as a direct Apple HIG clone.

## 2. Typography System

The app currently uses rounded display typography and a softer body face:

- Display family: `Baloo 2`
- Body family: `Nunito`

Use them semantically:

| Style | Font Family | Weight | Typical Size | Use |
| --- | --- | --- | --- | --- |
| Hero | `Baloo 2` | `800` | `34-40` | Main screen titles, series title focus moments |
| Title | `Baloo 2` | `700` | `24-30` | Card titles, section headers, modal titles |
| Subtitle | `Nunito` | `700` | `16-20` | Supporting headings, button labels |
| Body | `Nunito` | `600` | `15-17` | Primary interface copy |
| Reading | `Nunito` | `400` | `16-18` | Episode paragraphs and long-form text |
| Caption | `Nunito` | `800` | `11-13` | Pills, badges, metadata labels |

Rules:

- Rounded display text must stay optically centered. Do not crop the top or bottom of Baloo glyphs inside pills, tabs, or cards.
- Large titles should wrap cleanly instead of shrinking unpredictably between cards.
- Body text should stay calm and readable. Do not use display fonts for long paragraphs.
- Metadata pills should use higher tracking or weight, not oversized font size, to gain presence.

## 3. Color Tokens

Use semantic tokens, not ad hoc hex values. The live token source is `apps/mobile/src/presentation/theme/tokens.ts`.

### Light Theme

| Token | Value |
| --- | --- |
| `systemBlue` | `#6b35ff` |
| `systemGreen` | `#087f69` |
| `systemRed` | `#d6326b` |
| `systemOrange` | `#a84c00` |
| `systemPurple` | `#a86bff` |
| `systemPink` | `#ff4d97` |
| `systemTeal` | `#31b8ff` |
| `backgroundPrimary` | `#f8f5ff` |
| `backgroundSecondary` | `#ffffff` |
| `backgroundTertiary` | `#eee9fa` |
| `labelPrimary` | `#211536` |
| `labelSecondary` | `#665a78` |
| `labelTertiary` | `#948aa2` |
| `separator` | `#ddd3e8` |
| `backgroundGradient` | `#fdf8ff -> #f1ecff -> #eaf9ff` |

### Dark Theme

| Token | Value |
| --- | --- |
| `systemBlue` | `#8257ff` |
| `systemGreen` | `#46e8c3` |
| `systemRed` | `#ff5f91` |
| `systemOrange` | `#ffad4d` |
| `systemPurple` | `#bd75ff` |
| `systemPink` | `#ff4f9a` |
| `systemTeal` | `#44c8ff` |
| `backgroundPrimary` | `#090615` |
| `backgroundSecondary` | `#171025` |
| `backgroundTertiary` | `#251a37` |
| `labelPrimary` | `#fffaff` |
| `labelSecondary` | `#c4b9d1` |
| `labelTertiary` | `#857992` |
| `separator` | `#332640` |
| `backgroundGradient` | `#090615 -> #120922 -> #071721` |

Usage rules:

- `systemBlue` and `systemPurple` are the main branded energy colors.
- `systemPink` and `systemTeal` are supporting accents for dialog, highlights, and decorative bubbles.
- `systemGreen`, `systemOrange`, and `systemRed` remain semantic states first and decorative accents second.
- Do not default every highlight to purple. Balance grape, pink, and teal so the interface feels richer than a single-accent theme.

## 4. Shared Background Contract

The background is an app-shell system, not a per-screen decoration.

- Use one persistent route-level `SorbetBackground` behind all main tabs and pushed screens.
- Decorative bubbles must live behind content and keep pointer events disabled.
- The background may drift during idle time, but it must not visually reset during normal route changes.
- Add motion in long asymmetric cycles. Avoid synchronized looping that reveals a mechanical pattern.
- Decorative orbs should feel buoyant and soft. Use highlight, shade, border, and shadow layers to keep them dimensional.

Current background behavior:

- A three-stop gradient fills the full screen.
- Six decorative orbs are arranged into three collision pairs.
- Only one pair performs a full collision cycle at a time.
- Other pairs keep ambient drift active so the UI never freezes visually.
- Pair selection and scenario order are randomized, but each sequence must return to rest before another pair becomes active.
- Respect Reduce Motion. When enabled, freeze collision choreography and keep only static or near-static depth cues.

## 5. Surface Construction

Use rounded "bubble" surfaces instead of flat cards.

### Shape Tokens

- `radii.sm = 12`
- `radii.md = 18`
- `radii.lg = 24`
- `radii.xl = 30`
- `radii.pill = 999`

### Surface Tokens

- `bubbleSurface` is the default elevated fill.
- `bubbleSurfaceMuted` is for quieter list containers and secondary panels.
- `bubbleSurfaceRaised` is for hero cards and stronger emphasis.
- `bubbleBorder` is the soft top-lit edge.
- `sheetSurface` and `sheetBorder` are for modal or bottom-sheet overlays.

Construction rules:

- Primary cards should combine a soft fill, a restrained top-lit gradient, a fine border, and a gentle sheen.
- Do not use flat monochrome panels unless a screen intentionally needs reduced emphasis.
- Use stronger surfaces for hero actions such as "resume episode" and calmer surfaces for histories, forms, and settings.
- Keep decorative highlights subtle. Sheen should suggest curvature, not turn into a glossy plastic effect.

## 6. Depth And Shadows

Shadow presets are part of the design language. Reuse the shared tokens from `tokens.ts`.

### Clay Shadow

- `shadowColor: #713cff`
- `shadowOffset: { width: 0, height: 16 }`
- `shadowOpacity: 0.36`
- `shadowRadius: 26`
- `elevation: 12`

Use for:

- primary CTAs;
- hero banners;
- accent cards;
- selected tab icon backing.

### Soft Shadow

- `shadowColor: #241a38`
- `shadowOffset: { width: 0, height: 10 }`
- `shadowOpacity: 0.13`
- `shadowRadius: 22`
- `elevation: 5`

Use for:

- secondary cards;
- list items;
- floating utility panels;
- form groups.

Rules:

- Keep shadows warm and tinted to the current palette. Avoid generic gray-black elevation.
- Depth should come from both shadow and internal lighting. A border-only card is too flat for this system.
- In dark mode, rely on contrast between surface fills, borders, and shadow glows instead of only increasing opacity.

## 7. Navigation And Layout

The tab bar remains a floating capsule above content.

Shared metrics:

- height: `62`
- horizontal margin: `16`
- minimum bottom inset: `12`
- bottom gap: `6`
- content gap: `24`
- active icon backing: `40`

Rules:

- Main scroll containers must reserve enough bottom padding so the floating tab bar never overlaps the final actionable card.
- The floating tab shell should use the same stylized toy-gel construction as the shared Sorbet bubbles: a translucent candy gradient, one broad oval highlight, a soft lower-right shade, a bright rounded rim, and warm colored elevation. Do not use realistic live blur or optical refraction here; the capsule should feel playful and inflated rather than like system glass.
- The active tab uses one shared circular jelly bubble that springs between destinations. Render its silhouette as an SVG circle and clip the `fill + highlight + shade` layers with that same vector circle; do not depend on a small native rounded-rectangle mask for the outer shape. Use a grape-to-sky candy fill and a white icon. Touch-down must send a restrained but readable circular wave and one faint delayed echo outward from the pressed item, including repeat presses on the active destination. The bubble may briefly swell uniformly and leave one small delayed droplet, but it must remain mathematically circular at every transition frame and settle back to the canonical `40`-point backing without moving labels or hit targets.
- Use the shared rounded vector icons for primary destinations. Do not rely on platform emoji, whose weight and color vary between operating systems.
- Tab content changes use a short directional shift and fade over the persistent background. When the operating system requests reduced motion, both the scene transition and decorative lens movement must become immediate.

## 8. Motion System

Motion should feel soft, elastic, and sequential.

Shared interaction tokens:

- `pressScale = 0.94`
- `pressedOpacity = 0.85`
- `selectedScale = 1.03`
- `sheetEnterScale = 0.96`
- `springSpeed = 34`
- `springBounciness = 1`
- `releaseSpringSpeed = 18`
- `releaseSpringBounciness = 10`

Rules:

- Use press compression on taps. Controls should depress slightly before release.
- Release motion may bounce a little, but keep it short and coherent.
- Large background motion must be sequential, not concurrent chaos. Randomness is allowed only inside bounded scenarios that return to rest cleanly.
- When animating decorative collisions, keep exact contact believable. Bubbles should appear to meet, compress, and separate, not teleport or repel from visible distance.
- Background motion must never compete with reading, translation, or form interactions.

### Theme Transition

- A user-triggered light/dark switch must apply the selected palette immediately in the same interaction beat.
- Do not add app-wide screenshots, masks, waves, overlays, or delayed palette commits to theme switching.
- Keep feedback local to the switch: its thumb performs one smooth native-driver spring without restarting when the controlled value catches up.

## 9. Screen-Level Guidance

### Home / Series List

- Use stronger contrast between the primary create action and browsing cards.
- Cards in the same list should keep a stable typography scale. Do not resize titles per item to fit.
- Keep Home as one stable library instead of splitting completed series and unfinished setups behind a switch. Place one compact, labeled `+ New series` primary action beside the `Your library` heading; the visible label must carry the meaning rather than relying on an icon-only bubble. When drafts exist, render them first under `Continue setup`, followed by completed items under `Your series`. Use spacing and section labels to express the relationship without a shared border, overlapping controls, or a floating action dock. In the fully empty state, keep the labeled create action visible and pair it with concise first-series guidance. Creation always starts a fresh form; only a draft row may resume stored form state.
- Keep draft rows laconic: one centered progress marker beside the title and one metadata line inside a single tappable bubble. Do not add a separate resume button, redundant draft badge, preview paragraph, or decorative navigation icon. Whenever text or a glyph sits inside a fixed block, center it on both axes with explicit type metrics instead of visual offset hacks. Reuse the completed-series left-swipe delete lane and confirmation sheet for explicit discard; an ordinary card tap still resumes the draft and no inline delete button is added.

### Create / Edit Series Setup

- Use one modal flow with four focused cards: Role, Idea, Characters, and Title. Render one card at a time without horizontal paging or swipe navigation. Keep Back actions on every later card and make visited progress nodes directly navigable.
- Give the flow a light mini-game rhythm through a compact four-node path, one labeled Sorbet PNG per card, and restrained card-entry motion that respects Reduce Motion. Do not add scores, streak pressure, failure states, or decorative motion that competes with the form.
- Use one compact `Series setup` surface for both navigation and memory. Keep its title, four-node path, and count on one line, with short answer chips beneath a quiet divider. Show the live Role choice immediately on the first card; on later cards, show earlier answers. Do not add a separate `Story so far` panel or heading. Truncate long idea text and let every chip reopen its source card without clearing later values.
- Each card contains only its title, bundled illustration, fields or choices, and buttons. The illustration carries the short visual hint through embedded labels; do not repeat it with helper paragraphs, card numbering, notices, or AI-provenance captions. Interactive controls retain complete accessibility labels. The Role card owns only Producer/Character selection. The Idea card owns one required multiline `Story idea` field. The Characters card owns repeatable name plus optional role/personality rows and, in Character mode, one `Your character` field. The Title card owns one `Series title` field and the final `Save series` action.
- Show every card's fields immediately. Do not add optional gates, story-detail accordions, AI-permission screens, review screens, CEFR, Genre, or Tone to new series creation.
- Idea, Characters, and Title each use the same secondary `Generate by AI` action directly under their field group. Keep the manual fields visible at all times; do not add explanatory copy beneath the action.
- During AI generation, replace that action in place with one equal-height Sorbet capsule containing three softly staggered candy dots and a concise card-specific label. Do not repeat generation status elsewhere in the card, use a generic spinner, or shift the surrounding layout. Freeze the dots when Reduce Motion is enabled.
- AI suggestions remain editable but do not add a separate provenance caption or review stage. Manual edits still return the value to user-authored provenance internally.
- Character rows remain compact and repeatable, with a maximum of eight. Each row contains a character name and one fixed-height optional `Role or personality` field. In Character mode, validation enforces that `Your character` matches one cast name without persistent helper copy.
- Keep multiline setup inputs at their specified fixed height before and after AI generation. Long text scrolls inside the focused input; generated content must not reflow the card by growing or shrinking fields.
- Offline setup editing, card navigation, manual completion, and local draft saving must remain usable. Disable only the three `Generate by AI` actions and use their button label to report the online requirement.
- Reuse this four-card presentation when editing an existing series before its first episode. Existing-series editing preserves backward-compatible stored setup values, but neither creation nor editing exposes advanced creative anchors, cast-size controls, or draft-strategy controls. After episode one, the setup remains read-only.

### Series Detail / Episode History

- The continue/resume module should be concise and elevated, not oversized.
- Episode history cards must share one consistent height system unless content length genuinely requires expansion.
- Action buttons must never overlap title or summary text. Vertical rhythm wins over squeezing more chrome into the card.

### Episode Preparation

- Match the create-series header hierarchy with one fixed centered `Create an episode` title and a Back icon on the left. Do not add a `Next episode` eyebrow, repeat the series title beneath it, or duplicate the title as a large scrolling hero.
- Treat episode preparation as a compact two-step launch sequence rather than a settings page or a copy of the four-card series wizard. Step one, `Scene`, owns CEFR and Genre; step two owns Story Words and generation. Keep only one focused primary card visible at a time.
- Use one compact two-node `Episode setup` surface above the active card. Show the selected Level and Genre immediately beneath the progress path as the same short, horizontally scrollable answer chips used by series setup, so changing steps never moves the active card. The chips reopen Scene without clearing or regenerating the selected words. Keep prior reached nodes tappable and use the same restrained vertical card-entry motion as series setup.
- Keep the active step's actions in a fixed Sorbet footer so they remain reachable on narrow screens. Scene has one `Continue` action. Story Words has `Back` and `Generate episode`. Replace the generation action in place with three softly staggered candy dots and `Writing your episode...`; returning during generation must restore that same locked progress state. Freeze every Story Words mutation while generation owns its captured word set: dictionary picking, single-word replacement, and full-set shuffle remain disabled until the request settles.
- Keep this repeated flow fast: do not add a review step, Save or draft-management controls, large repeated illustrations, free-text episode direction, or setup ceremony borrowed from one-time series creation.
- Show CEFR and Genre as explicit controls before Story Words and generation. Do not show a separate Tone control.
- The first episode displays the preferred CEFR from Settings and the first genre option. Later episodes display the preceding episode's selections.
- Changing CEFR must not replace, remove, hide, or filter Story Words. CEFR applies to episode prose difficulty only; Dictionary choices and shuffle suggestions remain available across every Oxford level.
- Keep the expanded genre list wrapped inside the shared bubble surface and preserve readable tap targets at narrow widths.

### Reader / Interactive Episode

- Reading panels must prioritize legibility first.
- Translation, grammar, and audio controls may be decorative, but they must not overpower the episode text.
- A single tap on a prepared Story Word must open a compact sliding Sorbet card containing only the canonical word, transcription, context-aware translation, and part of speech. Give the word primary emphasis, keep part of speech in a quiet capsule, and place the translation in one soft accent surface; do not add examples, CEFR level, explanations, or actions.
- Long-press selection must use familiar native text handles and must not compress, depress, or reflow the selected sentence. Remove whole-sentence press feedback where it conflicts with selection.
- Make episode prose, dialogue, Story Choice prompt copy, saved answers, and feedback selectable. Keep choice option controls untouched and interactive.
- When a non-empty excerpt is selected, show one compact floating Sorbet action bubble above the bottom safe area. Keep `Translate` dominant and place exactly two muted, disabled question-mark slots after it for future reader actions.
- The selection bubble should enter with one restrained lift-and-scale soft pop, remain stationary while handles move, and leave with a shorter downward fade-and-scale motion after genuine deselection. Both transitions become immediate when Reduce Motion is enabled. Give the two question marks subtle staggered breathing motion so they feel intentionally reserved rather than broken; freeze them when Reduce Motion is enabled.
- Show selected-text translation in the existing Sorbet sheet language. Place the exact source selection in a grape-soft rounded surface, connect it quietly to a larger Russian result, and do not add explanatory copy, grammar notes, or transcription.
- Keep the source range and floating selection bubble synchronized across repeated taps and native handle adjustments: a stationary tap inside the range restores its highlight, while a tap outside the range or a collapsed handle clears both together. Keep the source range visibly selected after translation succeeds and after its result sheet closes. While the result sheet is open, it owns the top overlay layer and temporarily hides the floating selection bubble; closing it restores the bubble for the preserved range. Clear the range only when the learner taps elsewhere in the reader or actually scrolls it.
- Speaker bubbles may use accent color tints, but sentence blocks should remain readable at a glance.
- In Character mode, use the canonical learner character identity from series data to render that character's dialogue as a right-aligned outgoing bubble with the shared green learner accent and an outgoing top-right corner. Keep other speakers left-aligned with their assigned accents. Never infer ownership from prose or color order.
- Keep learner-authored speech visible exactly once on the outgoing side. Character-mode continuations begin with second-person consequences and must not duplicate the saved answer as a second AI dialogue bubble. Render a submitted physical action as a second-person narrative beat, not as speech.
- Keep the two or three generated choices as the fastest path, then place one quiet `Write my own answer` control beneath them. Expanding it must not hide the choices. Character mode exposes compact `Say` and `Do` pills; Producer mode shows a quiet `Direct the scene` label.
- Use one fixed-height multiline Sorbet field with a short character counter, local-save reassurance, and one primary `Continue story` action. Preserve the draft across navigation and connectivity loss. When input needs revision, keep the composer open and show one compact inline guidance surface with an optional `Use suggestion` action; never erase or auto-submit the learner's text.
- Preserve the submitted original answer as selectable reader content. If correction is useful, show the corrected wording separately in a compact accent surface with one short note; do not replace the original, assign a score, or interrupt the story with a grammar lesson.
- After a learner submits a choice, keep the saved answer visible and show a compact, cardless next-scene prelude beneath it. Use one slow light pass along a thin narrative thread, softly breathing future-text traces, and direct copy that connects the choice to what happens next. Do not use a spinner, a stack of skeleton cards, glass, or full-screen motion; freeze the cue into a quiet static state when Reduce Motion is enabled.

## 10. Anti-Patterns

Do not introduce any of the following without explicit approval:

- a return to flat white cards with faint separators only;
- Apple liquid-glass frosted panels as the primary look;
- screen-specific background swaps during navigation;
- neon gradient overload or gamer-dashboard styling;
- random oversized hero cards that break list consistency;
- title auto-scaling that makes adjacent cards feel unrelated;
- decorative motion that blocks readability or suggests loading when nothing is loading.

## 11. Implementation Note For Agents

When free-form UI decisions are required:

1. Start from the live tokens and shared primitives in `apps/mobile/src/presentation/theme/` and `apps/mobile/src/presentation/app/shared/`.
2. Prefer extending existing `BubbleSurface`, tab-bar, and Sorbet background patterns instead of inventing parallel styling systems.
3. If the code and this document diverge, bring the documentation back in sync with the implemented token system before adding more UI variation.
