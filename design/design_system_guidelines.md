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

- Use stronger contrast between the hero CTA and browsing cards.
- Cards in the same list should keep a stable typography scale. Do not resize titles per item to fit.
- "Create story" style entry points should stay compact and intentional rather than billboard-sized.

### Series Detail / Episode History

- The continue/resume module should be concise and elevated, not oversized.
- Episode history cards must share one consistent height system unless content length genuinely requires expansion.
- Action buttons must never overlap title or summary text. Vertical rhythm wins over squeezing more chrome into the card.

### Reader / Interactive Episode

- Reading panels must prioritize legibility first.
- Translation, grammar, and audio controls may be decorative, but they must not overpower the episode text.
- Speaker bubbles may use accent color tints, but sentence blocks should remain readable at a glance.
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
