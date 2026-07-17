# Phase 4: Selection Feasibility Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 04-selection-feasibility-gate
**Areas discussed:** Exact-range pass criteria

---

## Exact-range Pass Criteria

### Canonical fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical exactness | Reconstruct the exact characters from the episode source, including punctuation; trim only invisible edge whitespace. | ✓ |
| Visible-text exactness | Match the selected visible words and punctuation while allowing formatting whitespace normalization. | |
| Word exactness | Match the selected words while allowing punctuation and surrounding whitespace differences. | |

**User's choice:** Canonical exactness.
**Notes:** The exact source slice is the gate criterion, not a semantically equivalent or word-only approximation.

### Selectable content boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Story text only | Select narration and spoken dialogue across sentence and layout boundaries; exclude headings, speaker labels, controls, and annotation metadata. | ✓ |
| Story text plus speaker labels | Include visible speaker names in the selectable source and define canonical reconstruction for them. | |
| Separate visual blocks | Prevent a selection from crossing narration, dialogue, or bubble boundaries. | |

**User's choice:** Story text only.
**Notes:** Visual presentation boundaries must not break continuity of the episode's canonical story text.

### Annotated fragments

| Option | Description | Selected |
|--------|-------------|----------|
| Ordinary selectable text | Allow ranges to start, end, or pass through annotated words; selection gestures take precedence while active. | ✓ |
| Selectable but isolated | Allow annotated words to be selected only without crossing their fragment boundaries. | |
| Exclude annotations | Keep annotated words tappable but remove them from passage selection. | |

**User's choice:** Ordinary selectable text.
**Notes:** Annotation rendering cannot introduce gaps or alter the canonical selected passage.

### Endpoint precision

| Option | Description | Selected |
|--------|-------------|----------|
| Native boundary behavior | Preserve platform-native word and character snapping, then reconstruct exactly the highlighted characters. | ✓ |
| Arbitrary character precision | Require handles to support every character boundary, including partial words, independent of platform conventions. | |
| Whole words only | Force both endpoints to complete word boundaries. | |

**User's choice:** Native boundary behavior.
**Notes:** The gate tests exact observation of the native highlight rather than replacing native endpoint behavior with custom snapping.

---

## Agent's Discretion

- No product behavior was delegated explicitly. Downstream research and planning may choose the prototype structure, range-observation mechanism, fixture corpus, and evidence format within the locked decisions and roadmap gate.

## Deferred Ideas

None.
