# AGENTS.md

## Purpose

Build the Context-English MVP in strict accordance with the repository artifacts. Do not add features, dependencies, architectural layers, or abstractions unless they are required by the current task and consistent with the artifacts.

## Required Artifact Navigation

Read the relevant artifacts before implementation:

| Artifact | Role |
| --- | --- |
| `concept/prd_concept_mvp.md` | Canonical product scope: core loop, user flow, MVP features, AI payload, two-agent generation pipeline, and explicit out-of-scope items. |
| `concept/concept.html` | Supporting product reference: detailed explanation of the learning problem, expected user experience, and MVP behavior. It clarifies intent but must not expand the PRD scope. |
| `stack/tech_stack_mvp.md` | Canonical technical architecture and constraints: React Native with Expo Managed Workflow, TypeScript, Supabase, Edge Functions, OpenRouter, Vercel AI SDK, RLS, and `expo-speech`. |
| `design/design_system.html` | Canonical visual and interaction reference: colors, typography, themes, controls, states, story reader, genre selection, audio controls, inline translation, grammar sheet, quiz feedback, and navigation. Reproduce the design in React Native; do not copy browser-only implementation details blindly. |
| `words/oxford-5000.json` | Bundled local vocabulary source for offline word lists, flashcards, and non-LLM dictionary lookups. Treat as read-only seed data shipped with the app. |

## Compliance Rules

- Preserve full functional, architectural, and visual compliance with the artifacts.
- Use the PRD for product-scope decisions, the stack document for technical decisions, and the design system for UI and interaction decisions.
- Treat HTML artifacts as references, not production application code.
- Do not implement backlog items unless explicitly requested.
- Do not silently resolve contradictions between artifacts. State the conflict and ask for clarification.
- Keep artifact files aligned when an approved product, architecture, or design decision changes their documented behavior.
- Treat the MVP as a hybrid offline/online app:
  - Oxford 5000 vocabulary browsing, flashcards, local word-learning state, and simple local practice must work without internet.
  - LLM story generation, LLM grammar explanations, and cloud sync require internet and must go through Supabase Edge Functions.
  - When offline, write user progress locally first and queue it for later sync instead of failing the learning flow.
  - When online, keep the local progress store and Supabase user progress aligned with deterministic conflict handling.

## Engineering Standards

- Use current best practices and write clean, readable, maintainable code.
- Keep implementations simple. Avoid speculative abstractions, feature creep, duplicated logic, dead code, and unnecessary dependencies.
- Use TypeScript with strict typing. Avoid `any`; validate external data at system boundaries.
- Keep modules and components focused on one responsibility. Prefer explicit names and small reusable units.
- Handle loading, empty, success, and error states deliberately.
- Preserve accessibility, responsive layout, light/dark theme behavior, and iOS-friendly interaction patterns from the design reference.
- Never hardcode secrets. Keep LLM calls, prompts, provider settings, and validation logic inside Supabase Edge Functions.
- Keep Supabase access protected by Row Level Security. Treat all client input and AI output as untrusted.
- Use Expo Managed Workflow only. Do not modify or introduce native `ios/` or `android/` code.
- Do not fetch the Oxford 5000 seed list from the network at runtime. Bundle it with the app and load it through the React Native/Expo asset or module system.
- Keep offline status visible in user-facing flows that require the server. For example, the Text of the Day generation screen must show that generation will be available once the device is online.

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
