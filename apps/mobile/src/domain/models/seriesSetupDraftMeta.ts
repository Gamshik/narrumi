// seriesSetupTextFields lists setup fields whose current value may originate from AI.
export const seriesSetupTextFields = [
  'title',
  'premise',
  'characterProfiles',
  'userRole',
] as const;

// SeriesSetupTextField identifies one generated or user-owned setup value.
export type SeriesSetupTextField = (typeof seriesSetupTextFields)[number];

// SeriesSetupDraftMeta tracks AI origin without granting replacement permission.
export type SeriesSetupDraftMeta = {
  // aiGeneratedFields identifies visible values last changed by AI.
  readonly aiGeneratedFields: readonly SeriesSetupTextField[];
};

// createDefaultSeriesSetupDraftMeta migrates series created before provenance tracking.
export function createDefaultSeriesSetupDraftMeta(): SeriesSetupDraftMeta {
  return { aiGeneratedFields: [] };
}
