# Phase 2: Shell And Series Screens - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05T02:30:29.6580959+03:00
**Phase:** 2-Shell And Series Screens
**Areas discussed:** Home Series Priority, Series Setup Shape, Series Details Hierarchy, Settings Grouping and Status States

---

## Home Series Priority

| Option | Description | Selected |
|--------|-------------|----------|
| Continue the latest series | Make the large hero bubble focus on the most recent series and primary continuation action. | |
| Create a new series | Give the hero bubble more start-something-new energy, with saved series as secondary rows. | ✓ |
| Balanced hub | Keep hero, create action, and saved series similarly prominent, closer to a compact dashboard. | |

**User's choice:** Create a new series
**Notes:** The home hero should invite creation first, while still preserving saved series access below.

| Option | Description | Selected |
|--------|-------------|----------|
| Compact rows | Dense list rows with title, CEFR, genre/tone, short premise, and small actions. | |
| Soft mini-cards | Rounded Bubble/Sorbet cards with more breathing room and a clearer continuation action. | ✓ |
| One featured recent series plus compact rows | Show the latest saved series as a small featured continuation bubble, then use compact rows for the rest. | |

**User's choice:** Soft mini-cards
**Notes:** Saved series should match Bubble/Sorbet card language rather than dense list language.

| Option | Description | Selected |
|--------|-------------|----------|
| Hero-only primary action | The large hero bubble owns New Series; the header keeps only identity/status. | ✓ |
| Header plus hero | Keep the round plus in the header and a primary hero button. | |
| Floating bottom action | Add a floating create action above the tab bar. | |

**User's choice:** Hero-only primary action
**Notes:** Avoid duplicate create affordances.

| Option | Description | Selected |
|--------|-------------|----------|
| Folded into the hero | The create-first hero explains the empty state; no separate empty card below. | ✓ |
| Separate soft empty card | Keep a small Bubble/Sorbet empty card below the hero with a short hint and secondary create action. | |
| Sample-like placeholder card | Show a non-actionable preview of what a series card will look like once created. | |

**User's choice:** Folded into the hero
**Notes:** The hero should be sufficient as the empty-state invitation.

---

## Series Setup Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Keep modal, restyle heavily | Preserve the existing Modal flow and make it visually match newseries.png. | ✓ |
| Full-screen setup route | Turn setup into a dedicated route/screen. | |
| Hybrid sheet-screen | Keep modal ownership but make it feel like a full-screen bottom sheet. | |

**User's choice:** Keep modal, restyle heavily
**Notes:** Preserve current behavior while improving visual alignment.

| Option | Description | Selected |
|--------|-------------|----------|
| Match current logic order | Level, genre, tone, mode first; then premise, characters, role, title last. | |
| Match user story order | Title first, then genre/level/tone, then premise and characters. | |
| Match mockup visual order where possible | Let newseries.png drive ordering while preserving locked product constraints. | ✓ |

**User's choice:** Match mockup visual order where possible
**Notes:** Visual alignment should lead unless it conflicts with product constraints.

| Option | Description | Selected |
|--------|-------------|----------|
| Compact names plus expandable details | Show character names as lightweight rows/chips first, with descriptions available inline only when editing. | |
| Full editable character cards | Each character gets a rounded Bubble/Sorbet card with name and description fields visible. | ✓ |
| Minimal names only | Keep the form visually lighter and avoid showing description fields unless generated internally. | |

**User's choice:** Full editable character cards
**Notes:** Character name and description fields should both be visible.

| Option | Description | Selected |
|--------|-------------|----------|
| Single primary Generate button | Keep one clear Bubble/Sorbet primary button that fills missing setup text through the existing AI boundary. | ✓ |
| Generate as a secondary helper | Make manual setup feel primary; Generate is a smaller helper action near relevant fields. | |
| Split generate/save emphasis | Give Generate and Save similar visual weight. | |

**User's choice:** Single primary Generate button
**Notes:** Keep existing AI setup assist behavior.

---

## Series Details Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Continue or prepare next episode | Make the continue/prep card the dominant action immediately below the header. | ✓ |
| Series identity and premise | Make title, genre, mode, premise, and memory feel like the main series hub. | |
| Episode history | Put saved episodes forward so the screen feels like a readable archive. | |

**User's choice:** Continue or prepare next episode
**Notes:** Continue/prep should remain the strongest action.

| Option | Description | Selected |
|--------|-------------|----------|
| Small supporting card | Keep memory visible but secondary, as a compact Bubble/Sorbet note. | |
| Integrated into the header | Fold memory or unresolved cliffhanger text into the series header area. | |
| Hidden when empty, expanded when present | Avoid showing an empty memory card; reveal it as a richer card only after generated memory exists. | ✓ |

**User's choice:** Hidden when empty, expanded when present
**Notes:** Empty memory chrome should not distract from continuation.

| Option | Description | Selected |
|--------|-------------|----------|
| Small header action | Keep a compact Setup action in the header, with read-only styling after the first episode. | ✓ |
| Setup summary card | Show a Bubble/Sorbet setup summary card with an edit affordance before episode history. | |
| Inline setup section | Display setup fields directly on the details screen when editable. | |

**User's choice:** Small header action
**Notes:** Setup remains secondary to continuation.

| Option | Description | Selected |
|--------|-------------|----------|
| Soft episode cards | Each episode is a rounded mini-card with title, summary, status, and compact read/delete actions. | ✓ |
| Timeline style | Episodes appear as a vertical timeline, emphasizing story progression. | |
| Dense list rows | Keep rows compact for long histories, with less visual weight than the prep card. | |

**User's choice:** Soft episode cards
**Notes:** Episode history should be readable but secondary.

---

## Settings Grouping and Status States

| Option | Description | Selected |
|--------|-------------|----------|
| Account and sync | Put signed-in account, sync status, and manual sync first. | |
| Learning controls | Put grammar level and series defaults first, because those affect generated learning content. | ✓ |
| Appearance | Put theme controls first, because this phase is a visual refresh. | |

**User's choice:** Learning controls
**Notes:** Settings should lead with learning behavior, not operational account state.

| Option | Description | Selected |
|--------|-------------|----------|
| One Learning Preferences section | Combine CEFR level, default genre, and Story Word goal into a single prominent Bubble/Sorbet section. | ✓ |
| Separate Grammar and Defaults sections | Keep grammar control separate from default genre and Story Word goal. | |
| Compact top summary plus controls below | Show a small current-settings summary first, then separate editable controls. | |

**User's choice:** One Learning Preferences section
**Notes:** Learning controls should feel like one prominent group.

| Option | Description | Selected |
|--------|-------------|----------|
| Secondary operational card | Keep account/sync below Learning Preferences as a clear but quieter section. | |
| Compact status row | Reduce account/sync to a small row or badge with a manual sync action. | ✓ |
| Move near the bottom with sign out | Treat sync as maintenance, below appearance and defaults. | |

**User's choice:** Compact status row
**Notes:** Sync remains available without leading the screen.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Bubble/Sorbet status badges | Use compact badges/rows near the affected action, keeping the layout stable. | ✓ |
| Full soft state cards | Use larger rounded cards for each state, making status more explicit. | |
| Native alerts for most errors | Keep screens visually clean and use alerts for failures. | |

**User's choice:** Inline Bubble/Sorbet status badges
**Notes:** State feedback should be visible without dominating the layout.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
