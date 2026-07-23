import type {
  SeriesCharacterProfile,
  SeriesCreativeBrief,
  SeriesParticipationMode,
} from '@domain/index';

// ValidateSeriesSetupRequest contains user-controlled setup fields checked before local persistence.
export type ValidateSeriesSetupRequest = {
  // title is the learner-written visible series name.
  readonly title: string;
  // premise is the optional learner-written story setup.
  readonly premise?: string;
  // participationMode is persisted setup context and validated as a bounded option.
  readonly participationMode: SeriesParticipationMode;
  // mainCharacters contains learner-written character names or roles.
  readonly mainCharacters: readonly string[];
  // characterProfiles contains learner-written descriptions sent to AI context.
  readonly characterProfiles?: readonly SeriesCharacterProfile[];
  // userRole is the optional learner-written role in the story.
  readonly userRole?: string;
  // creativeBrief contains optional learner-authored story anchors checked on every save.
  readonly creativeBrief?: SeriesCreativeBrief;
};

// SeriesSetupModerationGateway hides server-side setup validation from use cases.
export type SeriesSetupModerationGateway = {
  // validateSeriesSetup rejects blocked setup fields before a local series is created.
  readonly validateSeriesSetup: (
    request: ValidateSeriesSetupRequest,
  ) => Promise<void>;
};
