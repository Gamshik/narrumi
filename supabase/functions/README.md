# Supabase Edge Functions

All production AI requests remain inside authenticated Supabase Edge Functions:

- `generate-series-setup` creates an editable series draft;
- `generate-episode` creates and validates the opening scene;
- `submit-interaction` evaluates learner language and continues the same episode;
- `translate-excerpt` translates only the exact selected text;
- `validate-series-setup` performs deterministic setup validation without an LLM.

## AI model roles

The server uses separate models for separate responsibilities. Model selection, prompts,
provider privacy settings, validation, retries, and fallback behavior never reach mobile.

| Role | Default model | Responsibilities |
| --- | --- | --- |
| Writer | `google/gemini-3.5-flash-lite` | Setup prose, story scenes, and continuations |
| Decision | `openai/gpt-5.4-nano` | Prompts and choices derived from frozen story text |
| Reviewer | `openai/gpt-5.4-mini` | Independent workflow-specific semantic quality gate with concrete evidence |
| Validator | `openai/gpt-5.4-nano` | Learner feedback and compact memory |
| Utility | `openai/gpt-5.4-nano` | Semantic reader framing and Russian translations |
| Fallback | `openai/gpt-5.4-mini` | One targeted candidate repair, or one complete replacement after structural failure |

Every creative flow is processed as follows:

```text
Gemini story writer -> GPT-5.4 Nano decision builder from frozen story text
  -> independent workflow-specific review
  -> accepted, or one targeted edit of the existing candidate
  -> if no complete candidate exists, one complete fallback instead
  -> same final review: every unresolved semantic issue blocks
  -> parallel feedback/memory and English semantic reader framing
  -> deterministic Story Word targets, then Russian translations only for those targets
  -> deterministic finalizers and public response schema
```

The repair model receives the original candidate plus reviewer issue codes, evidence,
and instructions, and must preserve unaffected fields. If every issue is `choice_mismatch`
or `choice_similarity`, the server freezes the story object and asks Fallback for only a
replacement decision, so recovery cannot rewrite accepted prose. If the only issue is
`dialogue_format`, Fallback receives only the scene or continuation prose and can change
quotation marks without returning choices or other accepted state. The recovery candidate must pass
the same review contract; continuity, scenario, CEFR, repetition, participation, choice,
safety, copyright, direct-speech formatting, canonical character identity, narrative
coherence, and protected setup findings all remain blocking. A deterministic pre-review
also rejects high-confidence pinned-speaker utterances that lack quotation marks. Episode timing is
deterministic instead of reviewer-preference-driven: the server prevents completion before
interaction 5, permits a logical Writer-selected ending on interactions 5-9, and forces
completion on interaction 10. A standalone reviewer `pacing_error` is discarded.
Deterministic schemas and finalizers always remain mandatory.

For episode openings, repetition review applies to scene prose that retells prior context,
duplicates its own narrative beat, or copies the scene ending into the decision prompt.
The intentionally overlapping `previouslyRecap`, `summaryUpdate`, and `cliffhanger` fields
are not repetition failures merely for fulfilling their recap or summary contracts. A
repetition-only recovery preserves continuity facts but rewrites the linked opening fields
around a genuinely new causal beat before the mandatory final review.

Character mode is an explicit point-of-view and agency contract, not merely a choice-label
hint. Writer and Decision prompts address the learner role as `you`, never author a new
voluntary action or line for that role, and never repeat a submitted answer inside the
continuation. The GPT-5.4 Mini Reviewer classifies third-person learner narration, invented
learner agency, and repeated learner speech as `participation_mismatch`; the existing repair
or fallback stage must resolve that evidence before the candidate can reach framing.

Writer, Decision, Reviewer, and Fallback use low reasoning. Validator and Utility use
minimal reasoning because current GPT-5 endpoints reject requests that explicitly disable it.
Current Gemini 3.5/3.6 models do not receive deprecated temperature or frequency-penalty
parameters. Reader framing remains semantic: related sentences are grouped into meaningful
paragraph or action-beat blocks instead of being split mechanically. Framing and Russian
translation use separate structured requests so translation instructions cannot alter story
text. If both bounded framing attempts fail structurally, the server preserves the already
accepted story with deterministic, length-bounded narration frames; finalization still
extracts safely attributed quoted dialogue. Every learner-facing generated field must pass
a predominantly-English schema and finalizer check; Cyrillic is allowed only in validated
translation values.

Dialogue frames contain spoken words only. Prompts explicitly separate speech from tags,
actions, and stage directions. A deterministic frame policy downgrades output such as
`Vlad says, leaning against the desk` to narration, so attribution cannot appear as if the
character spoke it. The same policy removes a dialogue block of at least four words when it
duplicates the normalized tail of the immediately preceding narration block, preserving the
narration and its annotation mapping. If a narration block contains a pinned-speaker
attribution followed by quoted speech, the policy splits the attribution into narration and
the complete quoted wording into dialogue, then remaps Story Word annotations by surface
text. These corrections never fail the user request.

Creative story context never contains persisted tutor feedback. Previous decisions are
reduced to their prompt and learner answer before they reach Writer, Decision, Reviewer,
repair, or memory prompts, preventing language-coaching text from leaking into the plot.
Compact-memory output is treated as the complete next state: stable character identity and
relationship facts are carried forward, newly named supporting characters are recorded as
facts, and deterministic finalization fills unused fact and recurring-anchor capacity from
the previous memory without reviving resolved open questions.

Moderation strikes are attributed only to new learner-authored text. Episode generation
replays validated setup and AI-authored memory, so it cannot create a strike. Interaction
continuation scans only a free-form `userReply`; generated story context and a selected
controlled choice are excluded. Warning writes use the stable generation or interaction
identity, so transport retries and reader restoration cannot increment the same warning.
Expected policy blocks write safe category/source diagnostics without logging story text.

Episode generation also keeps one durable mobile request id per
`{seriesId}:{orderIndex}` until the complete episode is saved locally. If the server
completed generation but its HTTP response was lost, retrying that same logical attempt
returns the cached validated episode even if the visible Story Words changed after the
failure. A different request id cannot overwrite an already completed slot.

The highlighted interaction prompt is a decision cue, not repeated story prose. Decision
and review prompts require one concise question or a very short cue when the choices are
self-explanatory. Before persistence, deterministic policy removes copied ending sentences;
if nothing distinct remains or the prompt nearly duplicates the ending, it uses `What do you
do next?` in character mode or `What happens next?` in director mode. This normalization
does not spend another model call and cannot fail the user request.

Story Word translation is optional enrichment after the story has passed its quality gate.
If both bounded translation attempts fail schema validation, the server logs a safe
`AI optional enrichment skipped` diagnostic and returns the valid episode or continuation
without those annotations. It must not fail the request, show a client error, or regenerate
the already accepted creative pipeline.

OpenRouter requests require parameter support, deny provider data collection, and allow
price-aware uptime load balancing with infrastructure provider failover. Explicit price
sorting is intentionally omitted because it disables OpenRouter's normal load balancing.
Strict zero-data-retention routing is optional because it can leave some OpenRouter
accounts or model/provider combinations without an eligible endpoint. Model fallback
for poor semantic quality is handled explicitly by application logic; provider failover
handles only endpoint availability.

## Required secrets

```text
OPENROUTER_API_KEY=...
OPENROUTER_WRITER_MODEL=google/gemini-3.5-flash-lite
OPENROUTER_DECISION_MODEL=openai/gpt-5.4-nano
OPENROUTER_REVIEWER_MODEL=openai/gpt-5.4-mini
OPENROUTER_VALIDATOR_MODEL=openai/gpt-5.4-nano
OPENROUTER_UTILITY_MODEL=openai/gpt-5.4-nano
OPENROUTER_FALLBACK_MODEL=openai/gpt-5.4-mini
```

Optional attribution:

```text
OPENROUTER_APP_URL=https://your-project.example
```

Optional strict ZDR routing, only after compatible endpoints are enabled in the
OpenRouter privacy settings:

```text
OPENROUTER_REQUIRE_ZDR=true
```

When absent or `false`, provider data collection is still denied, but an endpoint does
not also need the stricter OpenRouter ZDR designation.

Optional provider-call timeout in milliseconds (default `25000`, clamped to
`5000-60000`):

```text
OPENROUTER_MODEL_TIMEOUT_MS=25000
```

AI SDK retries are disabled. The timeout is applied independently to each model call so
a slow OpenRouter endpoint cannot consume the full hosted Edge Function request budget.

Reader framing is semantic rather than punctuation-based. Related narration sentences
stay together as a meaningful paragraph or action beat, while real dialogue turns remain
separate with pinned speaker metadata. The response fields named `sentences` and
`continuationSentences` contain these semantic blocks for backward compatibility.

`OPENROUTER_MODEL` is supported only as a transition-time override for the writer role.
New deployments should remove it so it cannot unexpectedly replace the configured writer.

The mobile app still uses only public Expo variables:

```text
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Deployment

From the repository root after `supabase link`:

```powershell
supabase secrets set OPENROUTER_API_KEY="YOUR_KEY"
supabase secrets set OPENROUTER_WRITER_MODEL="google/gemini-3.5-flash-lite"
supabase secrets set OPENROUTER_DECISION_MODEL="openai/gpt-5.4-nano"
supabase secrets set OPENROUTER_REVIEWER_MODEL="openai/gpt-5.4-mini"
supabase secrets set OPENROUTER_VALIDATOR_MODEL="openai/gpt-5.4-nano"
supabase secrets set OPENROUTER_UTILITY_MODEL="openai/gpt-5.4-nano"
supabase secrets set OPENROUTER_FALLBACK_MODEL="openai/gpt-5.4-mini"
supabase secrets set OPENROUTER_MODEL_TIMEOUT_MS="25000"
supabase secrets unset OPENROUTER_MODEL
supabase secrets unset OPENROUTER_REQUIRE_ZDR

supabase db push
supabase functions deploy --use-api
```

Do not deploy these authenticated functions with `--no-verify-jwt`.

## Verification

```powershell
deno check supabase/functions/generate-series-setup/index.ts supabase/functions/generate-episode/index.ts supabase/functions/submit-interaction/index.ts supabase/functions/translate-excerpt/index.ts supabase/functions/validate-series-setup/index.ts
deno test --allow-env --allow-net --allow-sys supabase/functions
```

`explain-grammar` is intentionally not implemented yet.
