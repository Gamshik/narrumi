# Debug Session: Home Layout

**Goal:** find_root_cause_only (UAT flow - plan-phase --gaps handles fixes)
**Truth:** The Home screen header and hero read as a create-first Bubble/Sorbet layout.
**Expected:** The Home screen header and hero read as a create-first Bubble/Sorbet layout.
**Actual:** Очень большая панелька для создания серии, нужен минимализм, как в дизайне.
**Errors:** None reported
**Reproduction:** Test 2 in UAT
**Timeline:** Discovered during UAT

## Root Cause
`HomeScreen` attempts to make `BubbleButton`s smaller by passing sizing overrides (`minHeight: 36`, etc.) to the `style` prop. However, `BubbleButton` assigns `style` to its outer container for positioning, leaving the inner button locked to a large default `minHeight: 48` and padding. Additionally, `CreateHero` uses `BubbleSurface variant="hero"`, which enforces a massive `spacing.xl` padding that breaks the desired minimalist design.

## Evidence Summary
- `BubbleButton` routes `style` to `JellyPressable.containerStyle`, while inner visual styling (like `minHeight` and `paddingVertical`) is controlled by its default `styles.base` and `contentStyle` prop.
- The button sizing styles in `MobileApp.styles.ts` (`heroButton`, `seriesCardPrimaryButton`, `seriesCardDeleteButton`) fail to shrink the buttons because they are passed as container styles instead of `contentStyle`.
- Even if passed to `contentStyle`, the overrides lack a `paddingVertical` reduction, meaning the default vertical padding would still prevent the button from shrinking to `minHeight: 36`.
- `CreateHero` uses `variant="hero"` for `BubbleSurface`, which is styled with `padding: spacing.xl`, creating an oversized panel.

## Files Involved
- `apps/mobile/src/presentation/app/screens/HomeScreen.tsx`: Passes button sizing to `style` instead of `contentStyle` and uses the overly padded `variant="hero"` for `CreateHero`.
- `apps/mobile/src/presentation/app/MobileApp.styles.ts`: Mixes layout rules (flex, margins) with visual sizing rules in button styles, and omits `paddingVertical` overrides needed to achieve smaller button heights.

## Suggested Fix Direction
In `MobileApp.styles.ts`, separate layout positioning from inner sizing (adding `paddingVertical` overrides for compact buttons). In `HomeScreen.tsx`, pass layout rules to `style` and sizing rules to `contentStyle`. Change `CreateHero` to use `variant="card"` or reduce its internal spacing to achieve minimalism.
