# Stack Research

**Domain:** Arbitrary episode-passage selection and contextual Russian AI translation in an existing Expo reader
**Researched:** 2026-07-17
**Confidence:** MEDIUM

## Recommendation

Keep the current Expo, animation, networking, validation, Supabase, and AI stack. Add one narrow `PassageSelection` presentation adapter and one authenticated `translate-passage` Supabase Edge Function; do not add a second animation system, bottom-sheet package, translation SDK, state manager, or direct LLM client.

Text selection is the only unresolved stack gate. Start with a bounded React Native core `TextInput` spike because it is the only Expo Go-compatible core surface that reports `{ start, end }` through `onSelectionChange`. Do **not** commit the milestone architecture to it until the spike proves real selection on physical iOS and Android while preserving the existing reader's nested narration, dialogue, annotation, scroll, and interaction behavior. The current reader renders many separate `Text` and `View` surfaces; native selection does not automatically become one continuous selection document across those component boundaries.

If that spike fails, there is no verified drop-in package that satisfies all current constraints. The project must explicitly approve a runtime-testing change from Expo Go to an EAS development build and implement or adopt a narrow native selection adapter. Keep Expo Managed Workflow/CNG and continue to avoid committed `ios/` and `android/` directories. Do not silently weaken “any passage” to sentence-only selection or silently replace the rich reader with a WebView.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo / React Native core | `expo@57.0.6`, `react-native@0.86.0` | First-pass native text selection surface and reader integration | Already validated and installed. `TextInput` exposes selection offsets and `onSelectionChange`; core `Text selectable` exposes native copy selection but no selected-range callback, so it cannot drive the custom action panel by itself. No package or native rebuild is needed for the spike. |
| React Native Reanimated + Worklets | `react-native-reanimated@4.5.0`, `react-native-worklets@0.10.0` | Animated Bubble action panel, loading transition, placeholder ambience, and reduced-motion behavior | Already installed and officially compatible with React Native 0.86. Reanimated entering/exiting/layout animations support `ReduceMotion.System`; no Moti, Lottie, or second animation runtime is justified. |
| Supabase Edge Functions | Existing Deno 2 runtime | Authenticated, server-only contextual translation endpoint | Preserves the existing trust boundary. Add a narrow `translate-passage` function and mobile gateway; keep prompts, model selection, provider credentials, input limits, and output validation server-side. |
| Vercel AI SDK + OpenAI-compatible provider | Pin new Edge imports to `ai@7.0.31` and `@ai-sdk/openai@4.0.16` after Edge compatibility tests | Non-streaming, schema-validated translation through the existing OpenRouter provider | `generateText` with `Output.object({ schema })` can constrain the model response to exactly `{ translation: string }`. This is more robust than parsing arbitrary prose and still lets the UI render only the Russian translation. No client package is added. |
| Zod | `zod@4.4.3` | Validate mobile request/response DTOs and Edge request/model output | Already installed on mobile and compatible with the current AI SDK peer range. Use bounded schemas at both trust boundaries; AI output remains untrusted even when structured output is requested. |

### Supporting Libraries and Native Capabilities

| Library / capability | Version | Purpose | When to Use |
|----------------------|---------|---------|-------------|
| `@supabase/supabase-js` | `2.110.0` resolved in the lockfile (`^2.107.0` manifest range) | Invoke `translate-passage` with the current authenticated session | Reuse the existing infrastructure adapter; presentation code must call a `PassageTranslationGateway`/use case, not `functions.invoke` directly. |
| `expo-network` | `~57.0.1` | Gate the online-only Translate action and expose an explicit offline state | Reuse the existing network-status port. Selection remains local; only translation is disabled offline. |
| React Native `AccessibilityInfo` and accessibility props | React Native 0.86 core | Announce loading/result/failure state, label controls, and honor reduced motion | Use `accessibilityRole`, labels/hints, disabled state for the two inactive placeholders, Android `accessibilityLiveRegion="polite"`, and announcements where a state change is otherwise silent. |
| Existing `JellyPressable`, Bubble/Sorbet surfaces, safe-area primitives | Repository-local | Render the compact three-action panel and translation result | Reuse the installed design system. Keep touch targets at least 48 dp on Android and comfortably sized on iOS even if the visible bubble is smaller. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Physical iPhone and Android device/emulator selection spike | Verify native handles, long-press behavior, range offsets, scrolling, rotation/font scaling, TalkBack/VoiceOver, and dismissal | This is a stack acceptance gate, not optional polish. Unit tests cannot prove OS selection behavior. Test emoji, curly punctuation, Cyrillic in surrounding context, dialogue, multiple paragraphs, and offsets around surrogate pairs. |
| EAS development build | Native fallback validation from a Windows development host | Required only if the core spike fails and a custom native module is approved. Expo Go cannot load third-party native selection code that is not bundled into Expo Go. Managed Workflow can remain intact through CNG/autolinking/config plugins. |
| Existing `tsx --test`, TypeScript, ESLint, and `expo export` scripts | Protect offset mapping, payload limits, state transitions, and build compatibility | Add deterministic unit tests for document/range mapping and Edge schema/prompt finalization. Keep platform behavior in a manual UAT matrix. |
| `npx expo-doctor` / `npx expo install --check` | Check Expo-native dependency alignment if the native fallback is approved | Use before creating the EAS development build. Do not run `expo prebuild` and commit generated native directories. |

## Integration Points

### Passage selection

Introduce one presentation-facing contract that normalizes platform events:

```text
PassageSelectionSurface
  -> { episodeId, sourceText, start, end, selectedText }
  -> build bounded context from immutable episode/sentence data
  -> show SelectionActionPanel
```

The adapter owns native selection event details only. A pure helper must build a deterministic selection document and map offsets back to episode and sentence identities. Never derive the translation request from clipboard contents, rendered labels, or mutable layout measurements.

For the single-episode reader, scope the selection document to the loaded episode. For “Read Full Series,” keep an explicit document per episode and clear/replace selection when another episode becomes active. If the product means that one drag selection must cross an episode header or cross from one episode into the next, the core/native text-view model will not satisfy it without a substantially different unified native document; escalate that interpretation before implementation.

### Animated action panel

Render the panel at the reader overlay/root level rather than inside an individual sentence. This avoids clipping by dialogue bubbles and keeps the same implementation for single-episode and full-series modes. Use the existing safe-area, Bubble, and `JellyPressable` primitives. Reanimated should drive only opacity and a restrained translation/scale spring; configure `ReduceMotion.System`, and use a direct fade/static endpoint when motion is reduced.

The Translate control is enabled only for a non-empty normalized selection while online and not already submitting. The two question-mark controls remain focusable only if the approved design requires users to discover that they are unavailable; otherwise mark them disabled and keep their animation decorative and hidden from accessibility. Do not let ambient animation communicate state by itself.

### Contextual translation boundary

Add a narrow application use case and port:

```text
TranslateSelectedPassage
  -> NetworkStatus
  -> PassageTranslationGateway
  -> Supabase translate-passage Edge Function
  -> validated { translation }
```

The request should carry the exact selected English text plus bounded context derived from the owning local episode: nearby sentence frames, episode title/order, compact episode summary, and only the small series-memory fields needed to disambiguate references. For a selection that touches more than one episode, send ordered bounded context segments, not the whole series. Apply strict character/segment limits on mobile and again in the Edge Function.

Inside the Edge Function:

- authenticate before spending model tokens;
- parse a Zod request schema and reject empty, oversized, or ownership-invalid requests;
- treat selected story text and context as quoted untrusted data, never as prompt instructions;
- use low-variance non-streaming generation with a small output-token cap;
- request `Output.object` with a single bounded `translation` property;
- validate Russian Cyrillic/non-empty output and reject explanations, markdown, source-text echo, or extra fields;
- return typed offline/network/validation/provider/unexpected error categories already understood by the mobile boundary;
- avoid logging the selected passage or raw prompt.

Do not add a database table merely for this feature. Unless product requirements explicitly require saved passage translations, keep the response in reader state. Recording the existing non-punitive `translated` learning signal is a domain/use-case concern and can use the established local-first path without a new storage engine.

## Installation

The recommended core path adds **no mobile dependency**:

```bash
cd apps/mobile
npm install

# Confirm the existing Expo-compatible native versions remain aligned.
npx expo install --check
```

Edge Function libraries are Deno npm specifiers, not mobile npm dependencies. Pin them in the new function/shared import boundary after its compatibility tests:

```typescript
import { generateText, Output } from 'npm:ai@7.0.31';
import { createOpenAI } from 'npm:@ai-sdk/openai@4.0.16';
import { z } from 'npm:zod@4.4.3';
```

Do not install a native selection package during the core spike. If the spike fails, stop for the runtime decision before adding one.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Core `TextInput` selection spike behind `PassageSelectionSurface` | `@rob117/react-native-selectable-text@2.1.0` | Consider only after approving an EAS development build and after a source-level/platform spike. It claims React Native 0.81.1+, Fabric, iOS, and Android, but its public callback fires when a native menu option is chosen rather than providing the general live selection-range event needed to reveal a custom panel. It is not available in Expo Go. |
| No native package until the gate is proven | `react-native-uitextview@2.2.0` | Do not use for this milestone. Its real-time selection callback is iOS-only, and the maintainer officially supports React Native 0.79 rather than this app's 0.86. It cannot provide the required Android parity. |
| Existing native React Native reader | `react-native-enriched` / a WebView/HTML reader | Only for a separately approved full reader redesign. Both introduce a new rendering model and native/build or accessibility complexity far beyond contextual passage translation. |
| Existing Reanimated 4 | React Native `Animated`, Moti, or Lottie for the new panel | Use core `Animated` only where an existing component already owns it. Do not mix another animation abstraction into the new panel; Reanimated is installed, compatible, and has explicit reduced-motion controls. |
| Non-streaming `generateText` + `Output.object` | `streamText` or raw plain-text parsing | Stream only if later UX research proves partial translations materially improve the reader. A short translation is simpler to validate and render atomically. |
| Existing Supabase Edge trust boundary | On-device translation SDK or direct OpenRouter call | Only after an explicit product/architecture change. The current milestone requires contextual AI translation, online/offline states, server-held prompts/models/secrets, and validated output. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Core `<Text selectable>` as the whole solution | It enables native selection/copy but exposes no selected range callback to React Native, so it cannot reliably open the custom action panel with the exact passage. | Prototype a core `TextInput` adapter and require the platform gate. |
| Sentence-by-sentence selection presented as “arbitrary passage” | A range cannot cross separate native text views; silently limiting selection changes the requirement. | Define one deterministic episode selection document or escalate the native unified-document requirement. |
| Clipboard polling or intercepting Copy | It is indirect, permission-sensitive, stale-prone, inaccessible, and does not fire when the user merely selects text. | Use an explicit native selection event normalized by the adapter. |
| Custom JavaScript drag-to-highlight gestures | Reimplementing selection handles, bidirectional offsets, scrolling, magnification, TalkBack/VoiceOver, and platform menus is high-risk and inaccessible. | Use OS text selection through core or a dedicated native adapter. |
| New bottom-sheet/portal package | The compact panel can live in the existing reader overlay and Bubble primitives. | Existing React Native layout, safe area, Reanimated, and local primitives. |
| Redux or a global selection store | Selection and translation are transient reader state; global persistence creates stale ranges across episodes/routes. | Local reader state plus a focused use case/gateway. |
| Sending full episode/series history to the model | Increases cost, latency, leakage, and prompt-injection surface, and violates bounded-context rules. | Selected text plus nearby frames and compact summaries/memory. |
| Persisting every translation by default | Adds schema, sync, privacy, cache invalidation, and offline semantics not requested by the milestone. | Ephemeral result state and existing translated learning signals only. |
| Unpinned Edge Function AI imports for new code | A later deployment can resolve a new major and change runtime behavior without an app release. | Pin compatible `ai`, provider, and Zod versions in the new/shared Edge boundary. |

## Stack Patterns by Variant

**Single episode:**

- Build one stable selection document from the episode's displayed reading text.
- Map offsets to sentence/frame IDs before opening the panel.
- Send selected text plus a small context window and compact episode context.

**Read Full Series:**

- Maintain one selection scope per episode and include `episodeId`/`orderIndex` in the normalized selection.
- Dismiss the old panel when active episode or selection ownership changes.
- Never concatenate the entire saved series into an AI request.

**Offline:**

- Keep OS selection and the action panel available.
- Render Translate as explicitly unavailable; do not enqueue a model call or fabricate an on-device result.

**Loading/failure:**

- Preserve the selection while the request is pending so the learner understands what is being translated.
- Disable duplicate submissions, expose a concise retry, and discard stale responses if selection ownership changes.

**Reduced motion / screen reader:**

- Use `ReduceMotion.System`; replace bounce/scale travel with a fade or immediate endpoint.
- Announce loading completion or failure without moving accessibility focus unexpectedly.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo@57.0.6` | `react-native@0.86.0`, `react@19.2.3`, `react-native-web@0.21.x` | Matches the repository manifest and Expo SDK mapping. Expo documents Android 7+ and iOS 16.4+ for SDK 57. |
| `react-native-reanimated@4.5.0` | React Native 0.86 New Architecture | Official 4.5.x matrix includes RN 0.86. Keep the current New Architecture path. |
| `react-native-reanimated@4.5.0` | `react-native-worklets@0.10.0` | Official 4.5.x matrix supports Worklets 0.10.x and 0.11.x. No upgrade is required for this milestone. |
| `ai@7.0.31` | `@ai-sdk/openai@4.0.16`, `zod@4.4.3` | npm metadata lists the Zod peer range as `^3.25.76 || ^4.1.8`; the repository's 4.4.3 satisfies it. Validate Deno/OpenRouter behavior before pinning the shared boundary. |
| `@rob117/react-native-selectable-text@2.1.0` | Claims RN 0.81.1+ and Fabric | Not verified on RN 0.86 in this research and not Expo Go-compatible; callback semantics do not directly meet the custom panel trigger. Not recommended. |
| `react-native-uitextview@2.2.0` | Maintainer-supported RN 0.79, iOS selection events | Does not meet this app's RN 0.86 + Android requirement. Not recommended. |

### Current Expo Go caveat

Expo's current SDK 57 setup documentation says that during the SDK 57 transition, physical-device Expo Go users should use SDK 54. The repository is already on SDK 57 and should not be downgraded as a feature side effect. Confirm the actual iPhone test path before the selection spike; use an EAS development build if physical Expo Go cannot load SDK 57. This is independent of whether a custom native selection package is ultimately chosen.

## Sources

- [React Native `Text`](https://reactnative.dev/docs/text) — `selectable` is native selection/copy; no `onSelectionChange` prop is documented. **MEDIUM confidence** (official current docs, verified through fallback web search).
- [React Native `TextInput`](https://reactnative.dev/docs/textinput.html) — `onSelectionChange`, `selection`, `readOnly`, `multiline`, selection colors, and Android window-resize caveat. **MEDIUM confidence** (official current docs; the exact read-only rich-reader combination still needs device verification).
- [Expo: Add custom native code](https://docs.expo.dev/workflow/customizing/) and [development builds](https://docs.expo.dev/develop/development-builds/introduction/) — Expo Go/native-module boundary and EAS development-build route. **MEDIUM confidence** (official current docs).
- [Expo SDK version matrix](https://docs.expo.dev/versions/latest/) and [create-project transition note](https://docs.expo.dev/get-started/create-a-project/) — SDK 57 / RN 0.86 mapping, platform minimums, and current physical Expo Go caveat. **MEDIUM confidence** (official docs, temporally unstable and dated 2026-06/07).
- [Reanimated compatibility matrix](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/), [layout transitions](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/), and [accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) — RN/Worklets compatibility and reduced-motion behavior. **MEDIUM confidence** (official current docs).
- [AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) and [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) — schema-validated `Output.object` and non-streaming generation. **MEDIUM confidence** (official current docs).
- [npm registry: `@rob117/react-native-selectable-text`](https://www.npmjs.com/package/@rob117/react-native-selectable-text) and [Bluesky `react-native-uitextview`](https://github.com/bluesky-social/react-native-uitextview) — package versions, platform scope, supported RN version, and callback semantics. **MEDIUM confidence** for documented capabilities; **LOW confidence** for untested RN 0.86 runtime behavior.
- [React Native accessibility](https://reactnative.dev/docs/accessibilityinfo), [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility/), and [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps) — announcements, reduced motion, and touch targets. **MEDIUM confidence** (official platform docs).
- Local repository evidence: `apps/mobile/package.json`, `apps/mobile/package-lock.json`, `EpisodeReaderScreen.tsx`, `EpisodeSentence.tsx`, `stack/tech_stack_mvp.md`, and `architecture/architecture_for_ai.md`. **HIGH confidence** for installed versions and current integration boundaries.

---
*Stack research for: Context-English v1.2 contextual passage translation*
*Researched: 2026-07-17*
