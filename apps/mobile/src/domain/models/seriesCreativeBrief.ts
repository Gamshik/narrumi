// seriesDraftStrategies list the learner-authorized ways AI may update final setup fields.
export const seriesDraftStrategies = [
  'fill-missing',
  'refine',
  'rebuild',
] as const;

// SeriesDraftStrategy controls which existing setup fields AI may reconsider.
export type SeriesDraftStrategy = (typeof seriesDraftStrategies)[number];

// seriesCastSizes lists every supported explicit main-cast size.
export const seriesCastSizes = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// SeriesCastSize is the bounded numeric cast contract shared by storage and AI requests.
export type SeriesCastSize = (typeof seriesCastSizes)[number];

// SeriesCreativeBrief stores optional user-authored anchors separately from AI output.
export type SeriesCreativeBrief = {
  // idea is the learner's free-form starting image, scene, or concept.
  readonly idea: string;
  // worldAndSetting describes the sphere, place, time, or story environment.
  readonly worldAndSetting: string;
  // backstory records bounded events that happened before the series begins.
  readonly backstory: string;
  // storyDriver describes the goal, problem, or conflict that should move the story.
  readonly storyDriver: string;
  // mustInclude lists details or themes that generated setup must preserve.
  readonly mustInclude: string;
  // avoid lists unwanted themes, clichés, or story elements.
  readonly avoid: string;
  // preferredCastSize constrains the main cast only when the learner selects a size.
  readonly preferredCastSize?: SeriesCastSize;
  // draftStrategy defines whether AI fills gaps, selectively refines, or rebuilds the draft.
  readonly draftStrategy: SeriesDraftStrategy;
};

// createDefaultSeriesCreativeBrief migrates series created before creative anchors existed.
export function createDefaultSeriesCreativeBrief(): SeriesCreativeBrief {
  return {
    idea: '',
    worldAndSetting: '',
    backstory: '',
    storyDriver: '',
    mustInclude: '',
    avoid: '',
    draftStrategy: 'fill-missing',
  };
}
