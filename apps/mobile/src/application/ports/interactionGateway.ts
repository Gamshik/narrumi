import type {
  InteractionGatewayPayload,
  SubmitInteractionRequest,
} from '@application/ai/episodeAiPayload';

// InteractionGateway hides submit-interaction Edge Function details from use cases.
export type InteractionGateway = {
  // submitInteraction returns validated feedback and same-episode continuation JSON.
  readonly submitInteraction: (
    request: SubmitInteractionRequest,
  ) => Promise<InteractionGatewayPayload>;
};
