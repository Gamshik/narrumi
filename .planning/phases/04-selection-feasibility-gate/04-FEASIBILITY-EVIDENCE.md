# Phase 4 Selection Feasibility Evidence

**Recorded:** 2026-07-17  
**App commit:** `81a784fa5fe9d7e550cf8141fe3a9baf221f3139`  
**Plan 04-05 operator:** Gleb  
**Readiness gate:** `BLOCKED`

This artifact records only device metadata and scenario statuses. It contains no user episode passage, screenshot, recording, production log, persistence payload, or provider data.

## Device Readiness

| Platform | Device model | OS version | Expo Go version | Operator | Physical-device attestation | Availability |
| --- | --- | --- | --- | --- | --- | --- |
| iOS | iPhone 16 Pro | iOS 26.4 | 57.0.5 | Gleb | Confirmed by user | `AVAILABLE` |
| Android | Not provided — no representative physical device is available | Not available | Not available | Gleb | Not attested | `UNAVAILABLE — BLOCKER` |

### Readiness result

`BLOCKED` — representative physical Android hardware is unavailable. In addition, narration/audio is unavailable in the current iOS reader baseline. Per Plan 04-01, either condition stops the phase before probe implementation.

- Plan 04-02 and all later Phase 4 plans remain blocked.
- Phase 5 remains blocked until a future recorded `GO` verdict.
- This readiness record does not authorize an EAS development build, native adapter, WebView reader, sentence-only fallback, probe implementation, or backend work.
- Simulator or emulator evidence cannot substitute for the missing physical Android record.

## Existing Reader Baseline

| Reader behavior | Physical iOS status | Physical Android status | Privacy-safe observation |
| --- | --- | --- | --- |
| Scrolling | `AVAILABLE / USABLE` | `BLOCKED — DEVICE UNAVAILABLE` | The current iOS reader can be scrolled. |
| Dialogue presentation | `AVAILABLE / USABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Dialogue presentation is usable on iOS. |
| Annotation taps | `UNAVAILABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Annotation taps were not available in the current iOS reader. |
| Visible reader controls | `UNAVAILABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Reader controls were not visible on iOS. |
| Default Dynamic Type | `UNAVAILABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Default Dynamic Type did not work in the current iOS reader. |
| Enlarged Dynamic Type | `UNAVAILABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Enlarged Dynamic Type did not work in the current iOS reader. |
| Narration/audio | `UNAVAILABLE — BLOCKER` | `BLOCKED — DEVICE UNAVAILABLE` | No narration/audio path was available in the current iOS reader. This is not represented as a passed regression surface. |
| Current reader selection | `UNAVAILABLE` | `BLOCKED — DEVICE UNAVAILABLE` | Whole-paragraph click behavior interfered with selection, consistent with the existing `JellyPressable` baseline. No passage text was recorded. |

The baseline describes only behavior observed before any Phase 4 probe work. Unavailable features are not treated as tested or passed.

## Probe A — `Text selectable`

Probe A must be attempted before Probe B if the readiness blockers are resolved. No probe was implemented or run during Plan 04-01.

| Ordered scenario | Physical iOS result | Physical Android result | Privacy-safe evidence reference |
| --- | --- | --- | --- |
| A1. Single-episode native selection and handle adjustment | — | — | — |
| A2. Cross-sentence and narration/dialogue-boundary selection | — | — | — |
| A3. Selection through an annotated fragment | — | — | — |
| A4. Earlier-episode selection in multi-episode mode | — | — | — |
| A5. Scrolling, reader interactions, and Dynamic Type regression check | — | — | — |

## Probe B — `TextInput.onSelectionChange`

Probe B may be attempted only after Probe A and only if the readiness blockers are resolved. No probe was implemented or run during Plan 04-01.

| Ordered scenario | Physical iOS result | Physical Android result | Privacy-safe evidence reference |
| --- | --- | --- | --- |
| B1. Single-episode exact non-empty range observation | — | — | — |
| B2. Cross-sentence and narration/dialogue-boundary exact range | — | — | — |
| B3. Exact range through an annotated fragment | — | — | — |
| B4. Stable earlier-episode ownership in multi-episode mode | — | — | — |
| B5. Scrolling, reader interactions, and Dynamic Type regression check | — | — | — |

## Privacy Attestation

- The physical baseline was supplied as metadata and boolean/status observations only.
- No selected or visible user episode passage is stored in this artifact or in an evidence label.
- No media link was supplied or committed.
- Any future probe evidence must use only the approved deterministic synthetic fixture, never a user-created episode.
- Future evidence must not persist or transmit selected fixture text, production logs, prompts, provider data, or user content.

## Final Verdict

**Final Verdict: PENDING**

`PENDING` is preserved because the ordered physical iOS and Android probe matrix was not run. `BLOCKED` is the current readiness/baseline gate status, not an unsupported `NO-GO` probe verdict.
