# AGENTS.md

## Purpose

Build the Context-English MVP in strict accordance with the repository artifacts. Do not add features, dependencies, architectural layers, or abstractions unless they are required by the current task and consistent with the artifacts.

## Required Artifact Navigation

Read the relevant artifacts before implementation:

| Artifact | Role |
| --- | --- |
| `concept/prd_concept_mvp.md` | Canonical product scope: core loop, user flow, MVP features, learning rules, review cycle, grammar quality control, and explicit out-of-scope items. |
| `concept/concept.html` | Supporting product reference: detailed explanation of the learning problem, expected user experience, and MVP behavior. It clarifies intent but must not expand the PRD scope. |
| `stack/tech_stack_mvp.md` | Canonical technical architecture and constraints: React Native with Expo Managed Workflow, TypeScript, Supabase, Edge Functions, OpenRouter, Vercel AI SDK, RLS, and `expo-speech`. |
| `architecture/architecture_for_ai.md` | Canonical implementation architecture contract for AI agents: Clean Architecture boundaries, dependency direction, domain model, use cases, ports, offline-first sync, Edge Function responsibilities, error policy, and trust boundaries. |
| `architecture/architecture_for_developer.html` | Supporting architecture reference for developers: visual explanation of layers, flows, ports, offline behavior, AI boundary, and non-negotiable rules. It clarifies `architecture_for_ai.md` but must not override it. |
| `design/design_system.html` | Canonical visual and interaction reference: colors, typography, themes, controls, states, story reader, genre selection, audio controls, inline translation, grammar sheet, quiz feedback, and navigation. Reproduce the design in React Native; do not copy browser-only implementation details blindly. |
| `design/design_system_guidelines.md` | Mandatory design rules for UI work when there is no exact layout or screen-level specification. Read before any free-form layout or visual decision. |
| `words/oxford-5000.json` | Bundled local vocabulary source for offline word lists, flashcards, and non-LLM dictionary lookups. Treat as read-only seed data shipped with the app. |

## Compliance Rules

- Preserve full functional, architectural, and visual compliance with the artifacts.
- Use the PRD for product-scope decisions, the stack document for technical decisions, and the design system for UI and interaction decisions.
- Treat HTML artifacts as references, not production application code.
- Do not implement backlog items unless explicitly requested.
- Do not silently resolve contradictions between artifacts. State the conflict and ask for clarification.
- Keep artifact files aligned when an approved product, architecture, or design decision changes their documented behavior.
- Preserve the hybrid offline/online behavior, card-learning rules, review cycle rules, and sync rules defined in the PRD, stack, and architecture artifacts. Do not redefine those rules in code from memory.

## Engineering Standards

- Use current best practices and write clean, readable, maintainable code.
- Keep implementations simple. Avoid speculative abstractions, feature creep, duplicated logic, dead code, and unnecessary dependencies.
- Use TypeScript with strict typing. Avoid `any`; validate external data at system boundaries.
- Keep modules and components focused on one responsibility. Prefer explicit names and small reusable units.
- Handle loading, empty, success, and error states deliberately.
- Preserve accessibility, responsive layout, light/dark theme behavior, and iOS-friendly interaction patterns from the design reference.
- Before implementing any free-form UI or layout without exact screen-level instructions, read `design/design_system_guidelines.md` and follow its rules.
- Never hardcode secrets. Keep LLM calls, prompts, provider settings, and validation logic inside Supabase Edge Functions.
- Keep Supabase access protected by Row Level Security. Treat all client input and AI output as untrusted.
- Use Expo Managed Workflow only. Do not modify or introduce native `ios/` or `android/` code.
- Do not fetch the Oxford 5000 seed list from the network at runtime. Bundle it with the app and load it through the React Native/Expo asset or module system.
- Keep offline status visible in user-facing flows that require the server. For example, the Text of the Day generation screen must show that generation will be available once the device is online.

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
- Use `design/design_system.html`, `design/design_system_guidelines.md`, and screen-specific files under `design/*` for visual and interaction decisions.
- Keep `AGENTS.md` as navigation and operating rules. Do not duplicate detailed product, architecture, stack, or design specifications here unless the rule affects how agents should work across all tasks.

## Verification

Before completing a change:

1. Identify canonical commands from documentation, CI configuration, and project manifests.
2. Run the available lint, typecheck, build, and relevant test commands.
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
