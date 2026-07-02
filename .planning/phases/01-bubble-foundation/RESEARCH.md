# Phase 1: Bubble Foundation - Research

**Researched:** 2026-07-02  
**Domain:** Expo React Native presentation design system foundation  
**Confidence:** HIGH for codebase scope, MEDIUM for official-doc implementation guidance

## User Constraints

No `CONTEXT.md` exists for this phase. Use requirements, roadmap, project artifacts, design references, and codebase evidence only; do not invent unstated user preferences. [VERIFIED: init.phase-op]

Phase requirement IDs: VIS-01, VIS-02, VIS-03, VIS-04, MOT-01, MOT-02, QUAL-01. [VERIFIED: .planning/REQUIREMENTS.md]

Phase goal: make the Bubble/Sorbet style a reusable presentation system rather than scattered screen-specific styles. [VERIFIED: .planning/ROADMAP.md]

## Summary

Phase 1 should consolidate the already-started Sorbet presentation layer instead of creating a parallel UI system. The app already has semantic color tokens, spacing/radius/shadow tokens, `JellyPressable`, `SorbetBackground`, `SorbetTabBar`, `RouteScreen`, `LevelBadge`, and a dictionary sheet barrel-exported from `src/presentation/app/shared`. [VERIFIED: codebase grep]

The main gap is that many Bubble/Sorbet patterns still live inside `MobileApp.styles.ts` as screen-specific style keys: bubble surfaces, pills, buttons, list rows, sheet chrome, reader sheets, tab padding, and status badges. Phase 1 should extract only reusable presentation primitives and token helpers needed by later screens, while leaving application, persistence, AI, sync, vocabulary, and domain rules untouched. [VERIFIED: codebase grep] [CITED: architecture/architecture_for_ai.md]

**Primary recommendation:** Use the existing Expo/RN stack and create a small shared Bubble/Sorbet presentation foundation: tokenized layout/motion constants, reusable `BubbleSurface`, `BubblePill`/badge, `BubbleButton`/chip wrappers around `JellyPressable`, a shared sheet surface, and scroll content inset helpers for the floating tab bar. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Sorbet colors, radii, shadows, typography, spacing | Browser / Client | — | React Native presentation owns visual rendering and theme resolution; these values already live under `src/presentation/theme`. [VERIFIED: codebase grep] |
| Gradient backgrounds and floating decorative fields | Browser / Client | — | `SorbetBackground` renders Expo `LinearGradient` and non-interactive foreground blobs in the route shell. [VERIFIED: codebase grep] |
| Reusable bubble surfaces, pills, badges, buttons, chips | Browser / Client | — | These are presentation-only components that render UI state and forward intent. [CITED: architecture/architecture_for_ai.md] |
| Floating tab bar and safe-area spacing | Browser / Client | Expo Router route shell | `SorbetTabBar` is the custom Expo Router tab bar and uses safe-area insets for bottom placement. [VERIFIED: codebase grep] |
| Press, selected, sheet, and tab micro-motion | Browser / Client | — | Motion is visual feedback; current implementation uses React Native `Animated` in `JellyPressable`. [VERIFIED: codebase grep] |
| Product rules, AI generation, persistence, sync, Story Words ranking | Application / Backend | Database / Storage | These must remain outside shared UI primitives per architecture rules. [CITED: architecture/architecture_for_ai.md] |

## Project Constraints (from AGENTS.md)

- Preserve full functional, architectural, and visual compliance with repository artifacts. [CITED: AGENTS.md]
- Use PRD for product scope, stack document for technical decisions, and design system for UI and interaction decisions. [CITED: AGENTS.md]
- Treat HTML artifacts as references, not production app code. [CITED: AGENTS.md]
- Do not implement backlog items or silently resolve artifact contradictions. [CITED: AGENTS.md]
- Preserve Expo Managed Workflow; do not add native `ios/` or `android/` code. [CITED: AGENTS.md]
- Keep presentation components thin; do not move persistence, Supabase, AI, vocabulary ranking, sync, or domain rules into React components. [CITED: AGENTS.md]
- Use TypeScript strict typing, focused modules, public `index.ts` exports for reusable UI folders, and path aliases for cross-layer imports. [CITED: AGENTS.md]
- Explicit TypeScript annotations and English comments are mandatory for exported contracts, function/component contracts, hooks, parameters, return values, shared types, and important intermediate values where the contract is not obvious. [CITED: AGENTS.md]
- Run documented lint, typecheck, tests, and build before claiming implementation completion. [CITED: AGENTS.md]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Consistent Sorbet gradient backgrounds and floating color fields | Existing `SorbetBackground` already centralizes gradient and blobs; Phase 1 should keep it route-level and token-driven. [VERIFIED: codebase grep] |
| VIS-02 | Rounded bubble surfaces, pill controls, compact badges, soft cards | Existing style keys prove the visual language exists, but reusable `BubbleSurface`, pill, badge, and button components are missing. [VERIFIED: codebase grep] |
| VIS-03 | Light/dark readability without hardcoded one-theme colors | `lightColors` and `darkColors` exist; Phase 1 should move hardcoded shared UI colors behind semantic tokens or deliberate contrast constants. [VERIFIED: codebase grep] |
| VIS-04 | Floating capsule tab bar clear of safe areas/final content | `SorbetTabBar` uses `useSafeAreaInsets`; scroll padding exists as scattered values and should become a shared token/helper. [VERIFIED: codebase grep] |
| MOT-01 | Subtle spring scale response on interactive controls | `JellyPressable` already implements native-driver scale spring; Phase 1 should make it the base for Bubble buttons, chips, rows, choices, and tab items. [VERIFIED: codebase grep] |
| MOT-02 | Minimal motion for sheets, active tabs, selected states | Current active tab uses a lifted gradient icon; sheet/selected-state primitives need shared style contracts before screen refreshes. [VERIFIED: codebase grep] |
| QUAL-01 | Developers reuse shared presentation primitives | Shared barrel exists; Phase 1 should add focused component folders with `index.ts` exports and keep screen-specific styles out of shared primitives. [VERIFIED: codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` [WARNING: legitimacy seam flagged too-new; already installed project dependency.] | Installed `0.86.0`; latest registry `0.86.0`, modified 2026-07-01 [VERIFIED: package.json+npm registry] | Core mobile UI, `Pressable`, `Animated`, `StyleSheet`, accessibility props | Existing Expo Managed app runtime; official docs cover accessibility and Animated patterns. [CITED: https://reactnative.dev/docs/accessibility] [CITED: https://reactnative.dev/docs/animations] |
| `expo` [WARNING: legitimacy seam flagged too-new; already installed project dependency.] | Installed `^57.0.1`; latest registry `57.0.1`, modified 2026-07-01 [VERIFIED: package.json+npm registry] | Managed workflow runtime | Stack artifact requires Expo Managed Workflow and forbids native project changes. [CITED: stack/tech_stack_mvp.md] |
| `expo-linear-gradient` [WARNING: legitimacy seam flagged too-new; already installed project dependency.] | Installed `~57.0.0`; official bundled version `~57.0.0` [CITED: https://docs.expo.dev/versions/latest/sdk/linear-gradient/] | Sorbet route backgrounds and active gradient surfaces | Official Expo component renders native gradient views and is included in Expo Go. [CITED: https://docs.expo.dev/versions/latest/sdk/linear-gradient/] |
| `expo-blur` [WARNING: legitimacy seam flagged too-new; already installed project dependency.] | Installed `~57.0.0`; latest registry `57.0.0`, modified 2026-07-01 [VERIFIED: package.json+npm registry] | Liquidglass tab/sheet surfaces | Official Expo docs list navigation bars, tab bars, and modals as common BlurView usage. [CITED: https://docs.expo.dev/versions/latest/sdk/blur-view/] |
| `react-native-safe-area-context` | Installed `~5.7.0`; latest registry `5.8.0`, modified 2026-05-18 [VERIFIED: package.json+npm registry] | Safe-area shell and floating tab bottom inset | Official Expo docs provide `SafeAreaView` and `useSafeAreaInsets`; current app already uses both. [CITED: https://docs.expo.dev/versions/latest/sdk/safe-area-context/] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-router` [WARNING: legitimacy seam flagged too-new; already installed project dependency.] | Installed `~57.0.2`; latest registry `57.0.2`, modified 2026-07-01 [VERIFIED: package.json+npm registry] | Route shell and custom tab bar integration | Keep `SorbetTabBar` as the Expo Router tab bar instead of building navigation state manually. [VERIFIED: codebase grep] |
| `@expo-google-fonts/baloo-2` | Installed `^0.4.2`; latest registry `0.4.2`, modified 2025-09-17 [VERIFIED: package.json+npm registry] | Rounded display typography | Existing `fontFamilies` maps display roles to Baloo 2 weights. [VERIFIED: codebase grep] |
| `@expo-google-fonts/nunito` | Installed `^0.4.2`; latest registry `0.4.2`, modified 2025-09-17 [VERIFIED: package.json+npm registry] | Readable body typography | Existing `fontFamilies` maps body roles to Nunito weights. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `Animated` + `JellyPressable` | `react-native-reanimated` | Do not add for Phase 1; current requirement is minimal scale/selected/sheet motion and existing `Animated` covers scale transforms. [CITED: https://reactnative.dev/docs/animations] |
| Existing `StyleSheet` + tokens | NativeWind/Tailwind | Stack says use standard React Native styles unless explicitly requested; adding styling runtime would violate scope. [CITED: stack/tech_stack_mvp.md] |
| Existing `expo-blur` | New glass/blur package | Existing Expo package is installed and official; new UI dependency is unnecessary. [CITED: https://docs.expo.dev/versions/latest/sdk/blur-view/] |
| Custom navigation state | Expo Router `Tabs` + custom `tabBar` | Current route shell already uses Expo Router; keep navigation semantics and only style the tab bar. [VERIFIED: codebase grep] |

**Installation:**
```bash
# No new packages recommended for Phase 1.
```

## Package Legitimacy Audit

No external package installation is required for Phase 1. Existing visual dependencies were checked because they are part of the recommended stack. [VERIFIED: package.json+npm registry]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `react-native` | npm | Published 2026-06-09 | 10,017,476/wk | github.com/facebook/react-native | SUS: too-new | Keep existing dependency; no new install. [VERIFIED: package-legitimacy] |
| `expo` | npm | Published 2026-06-30 | 6,345,103/wk | github.com/expo/expo | SUS: too-new | Keep existing dependency; no new install. [VERIFIED: package-legitimacy] |
| `expo-blur` | npm | Published 2026-06-25 | 2,389,947/wk | github.com/expo/expo | SUS: too-new | Keep existing dependency; no new install. [VERIFIED: package-legitimacy] |
| `expo-linear-gradient` | npm | Published 2026-06-25 | 2,970,350/wk | github.com/expo/expo | SUS: too-new | Keep existing dependency; no new install. [VERIFIED: package-legitimacy] |
| `react-native-safe-area-context` | npm | Published 2026-05-18 | 6,865,349/wk | github.com/AppAndFlow/react-native-safe-area-context | OK | Approved existing dependency. [VERIFIED: package-legitimacy] |
| `expo-router` | npm | Published 2026-06-30 | 3,908,013/wk | github.com/expo/expo | SUS: too-new | Keep existing dependency; no new install. [VERIFIED: package-legitimacy] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy]  
**Packages flagged as suspicious [SUS]:** existing `react-native`, `expo`, `expo-blur`, `expo-linear-gradient`, and `expo-router` were flagged only for recent publish dates by the seam; planner should add a human checkpoint only if it changes installed versions or adds packages. [VERIFIED: package-legitimacy]

## Architecture Patterns

### System Architecture Diagram

```text
Expo Router routes
  -> RouteScreen
     -> SafeAreaView + SorbetBackground + StatusBar
     -> screen content
        -> shared Bubble/Sorbet primitives
           -> JellyPressable for press motion
           -> tokenized surfaces/pills/badges/sheets
           -> callbacks to existing screens/use cases
  -> SorbetTabBar
     -> useSafeAreaInsets
     -> BlurView + tokenized capsule
     -> Expo Router navigation events
```

Decision point:
```text
Does a shared primitive need app data, persistence, AI, sync, or vocabulary rules?
  -> Yes: reject or keep logic in screen/application service.
  -> No: implement as presentation component that accepts typed props and forwards callbacks.
```

### Recommended Project Structure

```text
apps/mobile/src/presentation/theme/
├── tokens.ts                 # Extend semantic colors, spacing, radii, shadows, motion/inset tokens.
└── fonts.ts                  # Keep existing font family contract.

apps/mobile/src/presentation/app/shared/
├── BubbleSurface/
│   ├── BubbleSurface.tsx
│   └── index.ts
├── BubbleButton/
│   ├── BubbleButton.tsx
│   └── index.ts
├── BubblePill/
│   ├── BubblePill.tsx
│   └── index.ts
├── BubbleSheet/
│   ├── BubbleSheet.tsx
│   └── index.ts
├── JellyPressable/
├── SorbetBackground/
├── SorbetTabBar/
├── RouteScreen.tsx
└── index.ts                  # Public exports only.
```

### Pattern 1: Tokenized Presentation Primitives

**What:** Extract reusable visual roles from `MobileApp.styles.ts` into focused primitives that accept `variant`, `tone`, `selected`, `disabled`, and `children` props, but not domain entities. [VERIFIED: codebase grep]

**When to use:** Use for repeated Bubble surfaces, cards, pills, badges, primary/secondary buttons, list row shells, and bottom sheet frames across Phase 2 and Phase 3 screens. [VERIFIED: design/bubble/*.png visual inspection]

**Example:**
```typescript
// Source: local pattern from shared/JellyPressable and theme/tokens.ts.
type BubbleButtonVariant = 'primary' | 'secondary' | 'ghost';

export function BubbleButton({
  variant,
  disabled,
  onPress,
  children,
}: BubbleButtonProps): ReactElement {
  return (
    <JellyPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={disabled ? 1 : 0.96}
      style={[styles.button, styles[variant], disabled && styles.disabled]}
    >
      {children}
    </JellyPressable>
  );
}
```

### Pattern 2: Native-Driver Scale Motion Only

**What:** Keep the current `JellyPressable` approach: animate `transform: [{ scale }]` on an `Animated.View` wrapper and let the inner `Pressable` retain native press/accessibility props. [VERIFIED: codebase grep]

**When to use:** Buttons, chips, list rows, story choices, tab items, close buttons, and compact badges that are actionable. [VERIFIED: .planning/REQUIREMENTS.md]

**Example:**
```typescript
// Source: React Native Animated docs and existing JellyPressable.
Animated.spring(scale, {
  toValue: 0.96,
  useNativeDriver: true,
  speed: 45,
  bounciness: 0,
}).start();
```

### Pattern 3: Safe-Area-Aware Floating Navigation

**What:** Keep `SorbetTabBar` absolute and compute bottom offset from `useSafeAreaInsets`, but export a shared bottom content padding token/helper so scroll views do not hardcode `96`, `108`, or `118`. [VERIFIED: codebase grep]

**When to use:** Any top-level screen or list that can scroll behind the floating tab bar. [VERIFIED: design/bubble/home.png visual inspection]

**Example:**
```typescript
// Source: Expo safe-area-context docs and existing SorbetTabBar.
const bottom = Math.max(insets.bottom, 12) + 6;
const contentPaddingBottom = bottom + tabBarHeight + spacing.lg;
```

### Pattern 4: Presentation-Only Sheet Shell

**What:** Create a `BubbleSheet`/sheet surface that owns visual frame, handle, scrim, radius, and optional close affordance, while content remains screen-owned. [VERIFIED: design/bubble/translate.png visual inspection]

**When to use:** Dictionary word details, tap translation, grammar-style explanation, and any later form sheet surface. [VERIFIED: design/design_system_guidelines.md]

### Anti-Patterns to Avoid

- **Adding a second theme system:** Do not create screen-local palettes or hardcoded light-only colors when `lightColors` and `darkColors` already exist. [VERIFIED: codebase grep]
- **Moving business rules into UI primitives:** Shared components must not know Story Words ranking, AI generation state machines, sync, Supabase, AsyncStorage, or domain rules. [CITED: architecture/architecture_for_ai.md]
- **Over-extracting screen components:** Extract primitives only when they reduce duplication across the milestone; do not move full Home/Reader/Settings sections into shared components during Phase 1. [VERIFIED: .planning/ROADMAP.md]
- **Animating layout for tap feedback:** Prefer transform/opacity motion; layout-affecting animation is not needed for Phase 1 and risks jank. [CITED: https://reactnative.dev/docs/animations]
- **Tab bar without content inset contract:** A floating tab bar must be paired with route/list bottom padding or final content can be covered. [CITED: design/design_system_guidelines.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Navigation state | Custom tab router | Expo Router `Tabs` with `SorbetTabBar` | Current route shell already emits/respects tab press events. [VERIFIED: codebase grep] |
| Blur/glass surface | Custom native blur or image overlay package | `expo-blur` | Installed Expo module supports tab bars and modals. [CITED: https://docs.expo.dev/versions/latest/sdk/blur-view/] |
| Gradient rendering | CSS-like parser or image assets | `expo-linear-gradient` | Installed Expo module renders native gradient views and supports typed color stops. [CITED: https://docs.expo.dev/versions/latest/sdk/linear-gradient/] |
| Safe-area math from constants | Device-specific bottom offsets | `react-native-safe-area-context` | Official hook provides runtime inset values for custom layouts. [CITED: https://docs.expo.dev/versions/latest/sdk/safe-area-context/] |
| Press feedback logic per component | Duplicate `onPressIn`/`onPressOut` animations | Shared `JellyPressable` and Bubble wrappers | Existing implementation centralizes spring scale behavior. [VERIFIED: codebase grep] |
| AI/offline/persistence state in UI kit | Shared component service calls | Existing application use cases and ports | Architecture requires Presentation -> Application boundaries. [CITED: architecture/architecture_for_ai.md] |

**Key insight:** Phase 1 should hand-roll only the tiny reusable presentation primitives specific to the Bubble/Sorbet style; it should not hand-roll framework services that Expo and React Native already provide. [VERIFIED: codebase grep]

## Runtime State Inventory

This is a presentation consolidation/refactor phase. No rename string, database key, service name, secret name, or installed package name is being migrated. [VERIFIED: .planning/ROADMAP.md]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None - Phase 1 should not change AsyncStorage keys, Supabase rows, word ids, series ids, or sync metadata. Verified by scope and architecture boundary. [CITED: architecture/architecture_for_ai.md] | None |
| Live service config | None - Phase 1 should not touch Supabase functions, OpenRouter settings, Vercel AI SDK configuration, or remote dashboards. [CITED: stack/tech_stack_mvp.md] | None |
| OS-registered state | None - Expo Managed app has no OS-level registration changes in this phase. [CITED: stack/tech_stack_mvp.md] | None |
| Secrets/env vars | None - Phase 1 should not read or rename `.env` keys; LLM secrets remain server-side. [CITED: AGENTS.md] | None |
| Build artifacts | Existing `apps/mobile/dist`, `.expo`, and `node_modules` are generated/local artifacts; Phase 1 should not depend on editing them. [VERIFIED: filesystem audit] | None |

## Common Pitfalls

### Pitfall 1: Shared Components Become Mini Use Cases

**What goes wrong:** A `BubbleButton` or `BubbleSheet` starts deciding whether generation, sync, dictionary save, or offline behavior is allowed. [ASSUMED]  
**Why it happens:** Visual states and app states both use words like `disabled`, `loading`, and `offline`. [ASSUMED]  
**How to avoid:** Shared primitives accept display props and callbacks only; screens/application services keep behavior. [CITED: architecture/architecture_for_ai.md]  
**Warning signs:** Shared component imports from `@application`, `@infrastructure`, Supabase, AsyncStorage, Expo Network, or vocabulary adapters. [VERIFIED: codebase architecture docs]

### Pitfall 2: Token Drift Between Light And Dark Themes

**What goes wrong:** A new component uses `#ffffff`, pastel tints, or `#00000040` directly and becomes unreadable in dark mode. [VERIFIED: codebase grep]  
**Why it happens:** Existing styles include a mix of semantic tokens and intentional static contrast colors. [VERIFIED: codebase grep]  
**How to avoid:** Add semantic tokens for reusable patterns and allow static white only when placed on guaranteed accent surfaces. [VERIFIED: codebase grep]  
**Warning signs:** New shared primitives hardcode screen colors instead of reading `AppColors`. [VERIFIED: codebase grep]

### Pitfall 3: Floating Tab Bar Covers Last Content

**What goes wrong:** Screen final buttons/rows sit behind the floating capsule on small iPhones. [ASSUMED]  
**Why it happens:** `screenContent`, `readerContent`, and `wordList` currently hardcode different bottom paddings. [VERIFIED: codebase grep]  
**How to avoid:** Introduce a shared tab-bar height and route/list bottom inset formula. [CITED: https://docs.expo.dev/versions/latest/sdk/safe-area-context/]  
**Warning signs:** New scroll views use arbitrary `paddingBottom` values instead of a shared helper/token. [VERIFIED: codebase grep]

### Pitfall 4: Accessibility Lost Inside Animated Wrappers

**What goes wrong:** The animated wrapper becomes the perceived control and the inner `Pressable` loses role/state/label clarity. [ASSUMED]  
**Why it happens:** Wrapper components hide native props behind narrow custom prop types. [ASSUMED]  
**How to avoid:** Keep Bubble controls extending `PressableProps` where practical and forward `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `hitSlop`, and `disabled`. [CITED: https://reactnative.dev/docs/accessibility]  
**Warning signs:** A shared button accepts only `onPress` and `children`, with no accessibility or disabled contract. [ASSUMED]

## Code Examples

Verified patterns from official and local sources:

### Accessible Pressable Wrapper

```typescript
// Source: React Native accessibility docs + existing JellyPressable pattern.
<JellyPressable
  accessibilityLabel="Create new series"
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled }}
  disabled={isDisabled}
  hitSlop={10}
  onPress={onCreate}
>
  <Text>Create new series</Text>
</JellyPressable>
```

### Gradient Background

```typescript
// Source: Expo LinearGradient docs + existing SorbetBackground.
<LinearGradient
  colors={colors.backgroundGradient}
  end={{ x: 1, y: 1 }}
  start={{ x: 0, y: 0 }}
  style={StyleSheet.absoluteFill}
/>
```

### Blur Tab/Sheet Surface

```typescript
// Source: Expo BlurView docs + existing SorbetTabBar.
<BlurView
  intensity={28}
  pointerEvents="none"
  style={StyleSheet.absoluteFill}
  tint={isDark ? 'dark' : 'light'}
/>
```

### Safe-Area Floating Offset

```typescript
// Source: Expo safe-area-context docs + existing SorbetTabBar.
const insets = useSafeAreaInsets();
const floatingBottom = Math.max(insets.bottom, 12) + 6;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Traditional full-width bottom tab bar | Floating capsule tab bar with blur, safe-area bottom offset, and active icon backing | Current milestone references and existing `SorbetTabBar` [VERIFIED: codebase grep] | Planner should preserve custom `tabBar` and standardize scroll padding. |
| Screen-local card styles | Shared Bubble/Sorbet primitives | Phase 1 target [VERIFIED: .planning/ROADMAP.md] | Planner should extract reusable primitives before refreshing individual screens. |
| Heavy feature animation | Minimal spring-like press and selected-state motion | Current milestone target [VERIFIED: .planning/PROJECT.md] | Planner should avoid adding animation libraries or transition choreography. |
| Card-first vocabulary UI | AI-series first with Story Words as lightweight episode input | Current PRD [CITED: concept/prd_concept_mvp.md] | Visual foundation must not reintroduce flashcard/SRS mechanics. |

**Deprecated/outdated:**
- React Native core `SafeAreaView`: React Native docs mark it deprecated and recommend `react-native-safe-area-context`; this app already uses `react-native-safe-area-context`. [CITED: https://reactnative.dev/docs/safeareaview] [VERIFIED: codebase grep]
- Native project edits for UI libraries: Expo Managed Workflow forbids adding native `ios/` or `android/` code. [CITED: stack/tech_stack_mvp.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Shared components can become mini use cases if display states are mixed with app behavior. | Common Pitfalls | Planner may under-spec import/boundary checks. |
| A2 | Floating tab bar can cover final content on small iPhones if scroll padding is inconsistent. | Common Pitfalls | Planner may skip manual safe-area/content-end verification. |
| A3 | Accessibility can be lost if wrapper prop types hide native Pressable props. | Common Pitfalls | Planner may miss role/state/label forwarding tasks. |

## Resolved Questions

1. **Component-level tests for presentation primitives**
   - Resolution: Phase 1 must not add a React Native component test renderer or other new UI test dependency. Current mobile tests use Node `tsx --test`, and the existing plans rely on TypeScript contracts, lint, build, manual visual/interaction checks, and pure helper tests where logic is introduced. [VERIFIED: .planning/codebase/TESTING.md] [VERIFIED: 01-01-PLAN.md] [VERIFIED: 01-03-PLAN.md]
   - Plan impact: `layout.test.ts` covers safe-area/tab-bar helper behavior because that helper contains deterministic branching/calculation logic. Shared presentation primitives are validated through lint, typecheck, build, public export checks, manual visual review, and integration consumers rather than component render tests. [VERIFIED: 01-01-PLAN.md] [VERIFIED: 01-VALIDATION.md]

2. **Scope of `MobileApp.styles.ts` splitting**
   - Resolution: Phase 1 extracts only shared primitives, token helpers, and style blocks directly needed by the Phase 1 Bubble foundation. It must not perform a broad screen-style decomposition of `MobileApp.styles.ts`. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: 01-03-PLAN.md]
   - Plan impact: Plan 03 may replace scattered bottom padding constants and primitive-consumer style blocks where they are directly wired to shared helpers/components, but full screen-level style splitting belongs to later screen refresh phases when those screens are changed for their own requirements. [VERIFIED: 01-03-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts and TypeScript tooling | yes | v24.14.0 [VERIFIED: local command] | None needed |
| npm | package scripts | yes | 11.9.0 [VERIFIED: local command] | None needed |
| Expo CLI via `npx expo` | `npm run build` / export path | yes | 57.0.3 [VERIFIED: local command] | Use package script |
| `node_modules` | lint/typecheck/test/build | yes | present [VERIFIED: filesystem audit] | Run `npm install` only if missing |
| ESLint config | lint | yes | `apps/mobile/eslint.config.js` present [VERIFIED: filesystem audit] | None |
| TypeScript config | typecheck | yes | `apps/mobile/tsconfig.json` present [VERIFIED: filesystem audit] | None |

**Missing dependencies with no fallback:** none found. [VERIFIED: local command]  
**Missing dependencies with fallback:** none found. [VERIFIED: local command]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner through `tsx` `^4.22.4` [VERIFIED: package.json] |
| Config file | No dedicated Jest/Vitest config; TypeScript uses `apps/mobile/tsconfig.json`. [VERIFIED: .planning/codebase/TESTING.md] |
| Quick run command | `cd apps/mobile && npm run lint && npm run typecheck` [VERIFIED: apps/mobile/package.json] |
| Full suite command | `cd apps/mobile && npm run lint && npm run typecheck && npm run test && npm run build` [VERIFIED: apps/mobile/package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| VIS-01 | Sorbet background remains route-level and token-driven | type/build + manual visual | `npm run typecheck && npm run build` | Existing component yes; no dedicated test. [VERIFIED: codebase grep] |
| VIS-02 | Bubble surfaces/pills/badges/buttons are reusable shared exports | lint/type/build | `npm run lint && npm run typecheck` | New files needed. [VERIFIED: .planning/ROADMAP.md] |
| VIS-03 | Shared primitives consume semantic light/dark tokens | lint/type/build + manual contrast review | `npm run lint && npm run typecheck` | Existing tokens yes; new tests optional. [VERIFIED: codebase grep] |
| VIS-04 | Floating tab bar does not cover final scroll content | build + manual safe-area review | `npm run build` | Existing tab bar yes; shared padding helper missing. [VERIFIED: codebase grep] |
| MOT-01 | Pressable controls use spring-like scale response | type/build + manual interaction review | `npm run typecheck && npm run build` | Existing `JellyPressable` yes. [VERIFIED: codebase grep] |
| MOT-02 | Sheets, active tabs, selected states use minimal motion | type/build + manual interaction review | `npm run typecheck && npm run build` | Active tab yes; shared sheet/selected primitives missing. [VERIFIED: codebase grep] |
| QUAL-01 | Shared presentation primitives available through public barrels | lint/typecheck | `npm run lint && npm run typecheck` | Shared barrel exists; new exports needed. [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** `cd apps/mobile && npm run lint && npm run typecheck` [VERIFIED: AGENTS.md]
- **Per wave merge:** `cd apps/mobile && npm run test && npm run build` [VERIFIED: apps/mobile/package.json]
- **Phase gate:** `cd apps/mobile && npm run lint && npm run typecheck && npm run test && npm run build` [VERIFIED: .planning/ROADMAP.md]

### Wave 0 Gaps

- [ ] Add shared component files under `apps/mobile/src/presentation/app/shared/<ComponentName>/` with `index.ts` exports before screen phases depend on them. [VERIFIED: AGENTS.md]
- [ ] If token/inset helpers contain branching logic, add colocated pure `.test.ts` tests that avoid rendering React Native components. [ASSUMED]
- [ ] No React Native component test framework is currently installed; do not require component render tests unless the user approves a dependency. [VERIFIED: package.json]

## Security Domain

Security enforcement is treated as enabled because `.planning/config.json` is absent. [VERIFIED: filesystem audit]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no direct Phase 1 change | Keep auth state outside shared UI primitives; auth behavior remains in existing auth provider/screens. [VERIFIED: codebase architecture docs] |
| V3 Session Management | no direct Phase 1 change | Do not alter Supabase Auth session handling. [CITED: architecture/architecture_for_ai.md] |
| V4 Access Control | no direct Phase 1 change | Do not touch Supabase RLS or remote data access. [CITED: stack/tech_stack_mvp.md] |
| V5 Input Validation | yes, indirectly | Shared controls must treat labels/children/props as render data only and avoid parsing untrusted AI/user data. [CITED: architecture/architecture_for_ai.md] |
| V6 Cryptography | no direct Phase 1 change | Do not add crypto or secret handling to presentation. [CITED: AGENTS.md] |

### Known Threat Patterns for Expo React Native Presentation

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UI primitive imports infrastructure and leaks raw remote/provider errors | Information Disclosure | Keep shared UI under presentation-only imports; screens map safe state messages. [CITED: architecture/architecture_for_ai.md] |
| Disabled/offline visual state does not block action callback | Tampering | `BubbleButton`/chips should forward `disabled` to `Pressable` and expose `accessibilityState.disabled`; screens/use cases still enforce behavior. [CITED: https://reactnative.dev/docs/accessibility] |
| Hardcoded theme colors make text unreadable in dark mode | Denial of Service | Use semantic theme tokens and manual contrast review for shared primitives. [CITED: design/design_system_guidelines.md] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints, verification rules, UI/code rules. [CITED: AGENTS.md]
- `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` - milestone, phase scope, requirements. [VERIFIED: local files]
- `concept/prd_concept_mvp.md` - AI-series product scope and non-goals. [CITED: concept/prd_concept_mvp.md]
- `stack/tech_stack_mvp.md` - Expo Managed Workflow and approved technical stack. [CITED: stack/tech_stack_mvp.md]
- `architecture/architecture_for_ai.md` - presentation/application/domain/infrastructure boundaries. [CITED: architecture/architecture_for_ai.md]
- `design/design_system_guidelines.md` and `design/bubble/*.png` - visual and interaction targets. [VERIFIED: local files + visual inspection]
- Existing source files under `apps/mobile/src/presentation/theme` and `apps/mobile/src/presentation/app/shared`. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- React Native Accessibility docs - `https://reactnative.dev/docs/accessibility`. [CITED: https://reactnative.dev/docs/accessibility]
- React Native Animated docs - `https://reactnative.dev/docs/animations`. [CITED: https://reactnative.dev/docs/animations]
- React Native SafeAreaView deprecation docs - `https://reactnative.dev/docs/safeareaview`. [CITED: https://reactnative.dev/docs/safeareaview]
- Expo BlurView docs - `https://docs.expo.dev/versions/latest/sdk/blur-view/`. [CITED: https://docs.expo.dev/versions/latest/sdk/blur-view/]
- Expo LinearGradient docs - `https://docs.expo.dev/versions/latest/sdk/linear-gradient/`. [CITED: https://docs.expo.dev/versions/latest/sdk/linear-gradient/]
- Expo safe-area-context docs - `https://docs.expo.dev/versions/latest/sdk/safe-area-context/`. [CITED: https://docs.expo.dev/versions/latest/sdk/safe-area-context/]

### Tertiary (LOW confidence)

- Assumptions listed in `## Assumptions Log`; no unchecked package names are recommended. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for existing package versions and installed dependencies, MEDIUM for official-doc behavior due websearch provider classification. [VERIFIED: npm registry] [CITED: Expo/RN docs]
- Architecture: HIGH because project artifacts and codebase maps agree on presentation boundaries. [CITED: architecture/architecture_for_ai.md]
- Pitfalls: MEDIUM because some are inferred from existing style structure and typical UI wrapper risks. [ASSUMED]

**Research date:** 2026-07-02  
**Valid until:** 2026-07-09 for package/version recency; 2026-08-01 for local architecture findings.
