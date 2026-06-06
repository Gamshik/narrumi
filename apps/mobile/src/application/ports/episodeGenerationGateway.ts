import type {
  EpisodeAiPayload,
  GenerateEpisodeRequest,
} from '@application/ai/episodeAiPayload';

// EpisodeGenerationGateway hides the Supabase Edge Function transport from use cases.
export type EpisodeGenerationGateway = {
  // generateEpisode returns validated structured JSON from the AI boundary.
  readonly generateEpisode: (
    request: GenerateEpisodeRequest,
  ) => Promise<EpisodeAiPayload>;
};
