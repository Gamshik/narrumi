import { generateText, NoObjectGeneratedError, Output } from 'npm:ai@6.0.233';
import {
  createOpenRouter,
  type OpenRouterProvider,
} from 'npm:@openrouter/ai-sdk-provider@2.10.0';
import { z } from 'npm:zod@4.4.3';

import {
  createAiProviderRoutingPolicy,
  isEnabledFlag,
  readBoundedTimeout,
} from './aiRoutingPolicy.ts';

// AiModelRole identifies one bounded responsibility in the server-side AI pipeline.
export type AiModelRole =
  | 'writer'
  | 'decision'
  | 'reviewer'
  | 'validator'
  | 'utility'
  | 'fallback';

// AiModelCatalog contains exact versioned OpenRouter slugs for every pipeline role.
export type AiModelCatalog = Readonly<Record<AiModelRole, string>>;

// DEFAULT_AI_MODELS keeps production behavior stable when optional overrides are absent.
export const DEFAULT_AI_MODELS: AiModelCatalog = {
  writer: 'google/gemini-3.5-flash-lite',
  decision: 'openai/gpt-5.4-nano',
  reviewer: 'openai/gpt-5.4-mini',
  validator: 'openai/gpt-5.4-nano',
  utility: 'openai/gpt-5.4-nano',
  fallback: 'openai/gpt-5.4-mini',
};

// ReasoningEffort is the bounded reasoning budget supported by the selected roles.
type ReasoningEffort = 'minimal' | 'low';

// AI_REASONING_BY_ROLE reserves reasoning for semantic creative and review work.
export const AI_REASONING_BY_ROLE: Readonly<
  Record<AiModelRole, ReasoningEffort>
> = {
  writer: 'low',
  decision: 'low',
  reviewer: 'low',
  validator: 'minimal',
  utility: 'minimal',
  fallback: 'low',
};

// OPENROUTER_API_KEY is read only inside the Edge runtime trust boundary.
const openrouterApiKey: string | undefined = Deno.env.get('OPENROUTER_API_KEY');

// legacyModelOverride supports a safe deployment transition from the old single-model secret.
const legacyModelOverride: string | undefined = Deno.env.get(
  'OPENROUTER_MODEL',
);

// requireZdr enables restrictive routing only when the OpenRouter account supports it.
const requireZdr: boolean = isEnabledFlag(
  Deno.env.get('OPENROUTER_REQUIRE_ZDR'),
);

// modelTimeoutMs prevents one provider request from consuming the full Supabase timeout.
const modelTimeoutMs: number = readBoundedTimeout(
  Deno.env.get('OPENROUTER_MODEL_TIMEOUT_MS'),
  25_000,
);

// aiModels resolves role-specific overrides while keeping the old writer override compatible.
export const aiModels: AiModelCatalog = {
  writer: Deno.env.get('OPENROUTER_WRITER_MODEL') ??
    legacyModelOverride ??
    DEFAULT_AI_MODELS.writer,
  decision: Deno.env.get('OPENROUTER_DECISION_MODEL') ??
    DEFAULT_AI_MODELS.decision,
  reviewer: Deno.env.get('OPENROUTER_REVIEWER_MODEL') ??
    DEFAULT_AI_MODELS.reviewer,
  validator: Deno.env.get('OPENROUTER_VALIDATOR_MODEL') ??
    DEFAULT_AI_MODELS.validator,
  utility: Deno.env.get('OPENROUTER_UTILITY_MODEL') ??
    DEFAULT_AI_MODELS.utility,
  fallback: Deno.env.get('OPENROUTER_FALLBACK_MODEL') ??
    DEFAULT_AI_MODELS.fallback,
};

// openrouter is the official Vercel AI SDK provider with server-wide attribution.
const openrouter: OpenRouterProvider | undefined = openrouterApiKey
  ? createOpenRouter({
    apiKey: openrouterApiKey,
    compatibility: 'strict',
    appName: 'Context English',
    appUrl: Deno.env.get('OPENROUTER_APP_URL'),
  })
  : undefined;

// StructuredGenerationInput describes one schema-bound model request.
export type StructuredGenerationInput<TSchema extends z.ZodType> = {
  // role selects the least expensive model suited to this responsibility.
  readonly role: AiModelRole;
  // schema is applied by the AI SDK and again at the server trust boundary.
  readonly schema: TSchema;
  // schemaName gives providers a stable structured-output identifier.
  readonly schemaName: string;
  // schemaDescription helps models distinguish the contract from story content.
  readonly schemaDescription: string;
  // system contains non-user-overridable behavior and safety rules.
  readonly system: string;
  // prompt contains only the bounded context needed for this task.
  readonly prompt: string;
  // temperature controls creativity for the selected role.
  readonly temperature: number;
  // maxOutputTokens bounds cost and malformed overlong responses.
  readonly maxOutputTokens: number;
  // frequencyPenalty is used only for creative prose to reduce repetition.
  readonly frequencyPenalty?: number;
  // maxAttempts bounds structural retries before the caller changes strategy.
  readonly maxAttempts?: number;
  // strictSchema enables provider-level strict mode only for fully required schemas.
  readonly strictSchema?: boolean;
};

// isAiGatewayConfigured reports whether server-side generation can run.
export function isAiGatewayConfigured(): boolean {
  return openrouter !== undefined;
}

// getAiModelId returns the resolved model slug for safe operational logging.
export function getAiModelId(role: AiModelRole): string {
  return aiModels[role];
}

// supportsReasoningControl covers model families that expose OpenRouter reasoning controls.
function supportsReasoningControl(modelId: string): boolean {
  return modelId.startsWith('deepseek/') ||
    modelId.startsWith('openai/gpt-5') ||
    modelId.startsWith('google/gemini-3.5') ||
    modelId.startsWith('google/gemini-3.6');
}

// supportsSamplingControls avoids deprecated sampling parameters on current Gemini models.
function supportsSamplingControls(modelId: string): boolean {
  return modelId.startsWith('deepseek/') ||
    (modelId.startsWith('google/gemini-') &&
      !modelId.startsWith('google/gemini-3.5') &&
      !modelId.startsWith('google/gemini-3.6'));
}

// generateStructuredObject requests and validates one JSON object with bounded retries.
export async function generateStructuredObject<TSchema extends z.ZodType>({
  role,
  schema,
  schemaName,
  schemaDescription,
  system,
  prompt,
  temperature,
  maxOutputTokens,
  frequencyPenalty,
  maxAttempts = 1,
  strictSchema = false,
}: StructuredGenerationInput<TSchema>): Promise<z.infer<TSchema>> {
  if (!openrouter) {
    throw new Error('The AI gateway is not configured.');
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // modelId is resolved once so capability-specific parameters stay consistent.
    const modelId: string = aiModels[role];
    // startedAt measures provider latency without logging prompt or learner data.
    const startedAt: number = Date.now();

    try {
      // samplingControls avoid unsupported GPT-5 parameters under require_parameters.
      const samplingControls: boolean = supportsSamplingControls(modelId);
      // reasoningEffort gives semantic roles a small reasoning budget without inflating utility calls.
      const reasoningEffort: ReasoningEffort = AI_REASONING_BY_ROLE[role];
      console.info('AI stage started', {
        attempt,
        model: modelId,
        role,
        stage: schemaName,
      });
      const result = await generateText({
        model: openrouter.chat(modelId, {
          provider: createAiProviderRoutingPolicy(requireZdr),
          ...(supportsReasoningControl(modelId)
            ? {
              reasoning: {
                enabled: true,
                effort: reasoningEffort,
              },
            }
            : {}),
          structuredOutputs: {
            // Optional and transformed Zod fields are validated locally when strict mode is off.
            strict: strictSchema,
          },
          usage: {
            include: true,
          },
        }),
        output: Output.object({
          schema,
          name: schemaName,
          description: schemaDescription,
        }),
        system,
        prompt: lastError
          ? [
            prompt,
            '',
            `The previous JSON response failed validation: ${lastError.message}`,
            'Regenerate the complete object and fix every invalid field.',
          ].join('\n')
          : prompt,
        maxOutputTokens,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(modelTimeoutMs),
        ...(samplingControls ? { temperature } : {}),
        ...(samplingControls && frequencyPenalty !== undefined
          ? { frequencyPenalty }
          : {}),
      });

      console.info('AI stage completed', {
        attempt,
        durationMs: Date.now() - startedAt,
        model: modelId,
        role,
        stage: schemaName,
      });

      return schema.parse(result.output);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // objectFailure exposes only operational metadata, never generated learner text.
      const objectFailure = NoObjectGeneratedError.isInstance(lastError)
        ? {
          causeName: lastError.cause instanceof Error
            ? lastError.cause.name
            : undefined,
          finishReason: lastError.finishReason,
        }
        : {};
      console.warn('AI stage failed', {
        attempt,
        durationMs: Date.now() - startedAt,
        errorMessage: lastError.message,
        errorName: lastError.name,
        model: modelId,
        ...objectFailure,
        role,
        stage: schemaName,
      });
    }
  }

  throw lastError ?? new Error('Structured AI generation failed.');
}
