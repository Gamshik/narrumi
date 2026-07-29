# AGENTS.md

## Purpose

Build the Context-English MVP in strict accordance with the repository artifacts. Do not add features, dependencies, architectural layers, or abstractions unless they are required by the current task and consistent with the artifacts.

## Required Artifact Navigation

Read the relevant artifacts before implementation:

| Artifact | Role |
| --- | --- |
| `concept/prd_concept_mvp.md` | Canonical product scope: AI-series core loop, user flow, MVP features, Story Words selection, series memory, learning signals, AI quality control, and explicit out-of-scope items. |
| `concept/concept.html` | Supporting product reference for users: detailed explanation of the learning problem, expected AI-series experience, lightweight Story Words behavior, and MVP behavior. It clarifies intent but must not expand the PRD scope. |
| `stack/tech_stack_mvp.md` | Canonical technical architecture and constraints: React Native with Expo Managed Workflow, TypeScript, Supabase, Edge Functions, OpenRouter, Vercel AI SDK, RLS, local series/episode storage, Story Words selection, series memory, and `expo-speech`. |
| `architecture/architecture_for_ai.md` | Canonical implementation architecture contract for AI agents: Clean Architecture boundaries, dependency direction, domain model, use cases, ports, offline-first sync, Edge Function responsibilities, error policy, and trust boundaries. |
| `architecture/architecture_for_developer.html` | Supporting architecture reference for developers: visual explanation of layers, flows, ports, offline behavior, AI boundary, and non-negotiable rules. It clarifies `architecture_for_ai.md` but must not override it. |
| `design/design_system_guidelines.md` | Mandatory Sorbet soft-pop design rules for UI work when there is no exact layout or screen-level specification. It defines the shared background, dimensional bubble surfaces, palette, typography, and motion contract. Read before any free-form layout or visual decision. |
| `design/bubble/*` | Current screen-level Bubble/Sorbet image references. Use them together with the guidelines and the live React Native components; product behavior still comes from the PRD. |
| `words/oxford-5000.json` | Bundled local vocabulary source for offline word lists, lightweight Story Words suggestions, and non-LLM dictionary lookups. Treat as read-only seed data shipped with the app. |
| `.codex/gsd-core/` | Optional GSD workflow reference for Codex. Read and use it only when the user explicitly requests GSD or invokes a GSD skill or command. It is process documentation, not app runtime code. |
| `.agents/gsd-core/` | Optional GSD workflow reference for Antigravity. Read and use it only when the user explicitly requests GSD or invokes a GSD skill or command. It mirrors `.codex/gsd-core/` for Antigravity. |

## Compliance Rules

- Preserve full functional, architectural, and visual compliance with the artifacts.
- Use the PRD for product-scope decisions, the stack document for technical decisions, and the design system for UI and interaction decisions.
- Treat HTML artifacts as references, not production application code.
- Do not implement backlog items unless explicitly requested.
- Do not silently resolve contradictions between artifacts. State the conflict and ask for clarification.
- Keep artifact files aligned when an approved product, architecture, or design decision changes their documented behavior.
- Preserve the hybrid offline/online behavior, AI-series flow, Story Words selection rules, series memory, learning-signal model, and sync rules defined in the PRD, stack, and architecture artifacts. Do not redefine those rules in code from memory.
- Do not reintroduce traditional flashcard-first learning, scheduled SRS review queues, review debt, or streak-pressure mechanics as the primary MVP flow unless the user explicitly approves a product-scope change.

## Engineering Standards

- Use current best practices and write clean, readable, maintainable code.
- Keep implementations simple. Avoid speculative abstractions, feature creep, duplicated logic, dead code, and unnecessary dependencies.
- Use TypeScript with strict typing. Avoid `any`; validate external data at system boundaries.
- Keep modules and components focused on one responsibility. Prefer explicit names and small reusable units.
- Handle loading, empty, success, and error states deliberately.
- Preserve accessibility, responsive layout, light/dark theme behavior, and the Sorbet interaction language from the design reference: one shared background, dimensional bubble surfaces, consistent typography sizing, and restrained ambient motion.
- Before implementing any free-form UI or layout without exact screen-level instructions, read `design/design_system_guidelines.md` and follow its rules.
- Never hardcode secrets. Keep LLM calls, prompts, provider settings, and validation logic inside Supabase Edge Functions.
- Keep Supabase access protected by Row Level Security. Treat all client input and AI output as untrusted.
- Use Expo Managed Workflow only. Do not modify or introduce native `ios/` or `android/` code.
- Do not fetch the Oxford 5000 seed list from the network at runtime. Bundle it with the app and load it through the React Native/Expo asset or module system.
- Keep offline status visible in user-facing flows that require the server. For example, episode generation, AI continuation, AI correction, and grammar-style explanations must show that they are available only once the device is online.
- Persist user-created series, episodes, series memory, Story Words, word sets, learning signals, preferences, and sync metadata locally before remote sync.
- Keep LLM context bounded. Use compact series memory and episode summaries instead of sending unbounded full series history.
- Do not generate or encourage direct copies of copyrighted story worlds, characters, or plots. Use original stories with similar broad genre or mood when needed.

## GSD Usage

GSD is opt-in. Do not read GSD core files, invoke GSD skills or commands, create GSD planning artifacts, mutate GSD-managed state, or apply GSD workflows unless the user explicitly asks to use GSD or invokes a GSD skill or command.

- A task being complex, multi-file, a bug, a review, or related to existing `.planning/` files does not by itself authorize GSD usage.
- General mentions of planning, verification, phases, milestones, or progress do not count as a request for GSD unless the user explicitly identifies GSD.
- When GSD is explicitly requested, use the runtime-specific core: `.codex/gsd-core/` for Codex or `.agents/gsd-core/` for Antigravity, and follow the selected workflow completely.
- Outside an explicitly requested GSD workflow, use the repository's normal engineering, safety, and verification rules without creating or updating GSD artifacts.
- Do not suggest, auto-route to, or silently start GSD merely because a matching GSD skill is available.

## Mandatory Code Rules

These rules are mandatory for 100% of code changes. Do not consider a task complete while any affected code violates them.

- Code must be clean, readable, concise, typed, and maintainable. Do not leave messy, temporary, duplicated, or unclear code.
- Every file, function, component, hook, type, and module must have one clear responsibility.
- Split code into focused components and modules as soon as a file starts mixing UI, business logic, data access, types, styles, and helpers.
- God files are forbidden. Do not create or extend oversized files that centralize unrelated responsibilities.
- UI must be decomposed into small reusable components. Each reusable UI element must live in its own folder with its component file, style file when styling is non-trivial, types/helpers when needed, and `index.ts` export.
- Component folders must expose public exports through `index.ts`. Imports from other modules should use these exports instead of deep internal paths.
- TypeScript path aliases must be configured and used for stable, readable imports once project structure exists. Avoid fragile chains such as `../../../...`.
- Names must be short enough to read easily and specific enough to explain intent. Avoid both vague names like `data`, `item`, `stuff`, `handleClick2` and excessively long names.
- Functions must stay small and purposeful. Extract helpers, hooks, services, or use cases when branching, side effects, or repeated logic make a function hard to scan.
- Types, interfaces, schemas, DTOs, and shared contracts must be extracted from UI files when reused or when they distract from rendering logic.
- Presentation components must not contain business rules, SDK calls, persistence details, sync logic, or AI prompt/validation logic.
- Tests are required for non-trivial business logic, data validation, sync/conflict behavior, AI payload handling, critical UI behavior, and every bug fix where a regression test is practical.
- Do not add tests only for coverage numbers. Tests must protect observable behavior and important contracts.
- Explicit TypeScript annotations are mandatory for all functions, components, hooks, parameters, return values, exported constants, public module contracts, shared types, DTOs, schemas, and important intermediate values where inference does not make the contract immediately obvious.
- Every explicit TypeScript annotation must be accompanied by an English comment that explains the annotated contract, responsibility, or value meaning.
- Do not rely on implicit `any`, broad inferred object shapes, or unclear inferred return types. Make contracts visible in code.
- Comments are mandatory during development for every annotated contract and wherever code performs a non-obvious action, encodes a business constraint, crosses a trust boundary, handles a workaround, or exposes a public contract.
- All code comments and TypeScript annotations must be written in English.
- Do not comment obvious code. A required comment must explain why the code exists, what rule it protects, or what external constraint it handles.
- Before completing a task, review the changed code against this section and fix violations immediately.

## Implementation Routing

- Use `architecture/architecture_for_ai.md` for implementation boundaries, dependency direction, domain model, ports, trust boundaries, sync behavior, and error policy.
- Use `stack/tech_stack_mvp.md` for approved technologies, runtime constraints, storage choices, and server boundaries.
- Use `design/design_system_guidelines.md`, the Bubble/Sorbet images under `design/bubble/*`, and the live theme/shared components for visual and interaction decisions.
- Keep `AGENTS.md` as navigation and operating rules. Do not duplicate detailed product, architecture, stack, or design specifications here unless the rule affects how agents should work across all tasks.
- Note: `architecture/architecture_for_ai.md` and `architecture/architecture_for_developer.html` may still contain older card/review examples until explicitly updated. When those examples conflict with the current AI-series PRD or stack document, stop and ask for clarification instead of implementing the older behavior.

## Verification

Before completing a change:

1. Identify canonical commands from documentation, CI configuration, and project manifests.
2. Run the available lint, typecheck, build, and relevant test commands. Run GSD-specific checks only when the user explicitly requested a GSD workflow.
3. Verify affected user flows against the artifacts.
4. Report commands that passed and any checks that could not run.

## Commit Convention

Use Conventional Commit messages in English:

```text
type(scope): concise description
```

- Start with the change type: `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, or `chore`.
- Add an optional lowercase scope in parentheses when it makes the affected area clearer, for example `feat(ui): ...`.
- Use a single-line description for one change.
- For several related changes, put the header on its own line, add an empty line, and list the changes:

```text
feat(ui):

- improve button styles;
- redesign inputs.
```

- Keep descriptions concrete and concise. Do not use vague wording such as `update`, `changes`, or `small fixes`.
- Use `;` after each list item and `.` after the final item.
- Prefer small sequential commits that each capture one coherent change.
- Split unrelated changes into separate commits.
