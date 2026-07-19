import type { LocalSeriesStore } from '@application/ports';
import type { LocalSeriesSetupDraft } from '@domain/index';

// SeriesSetupDraftStore is the local-only persistence slice used by form drafts.
type SeriesSetupDraftStore = Pick<
  LocalSeriesStore,
  'getSeriesSetupDraft' | 'saveSeriesSetupDraft' | 'deleteSeriesSetupDraft'
>;

// LoadSeriesSetupDraftInput identifies one local-only setup form snapshot.
export type LoadSeriesSetupDraftInput = {
  // draftId selects the create-flow or existing-series draft.
  readonly draftId: string;
};

// LoadSeriesSetupDraftResult returns an unfinished form when one was saved.
export type LoadSeriesSetupDraftResult = {
  // draft is absent when the user has not saved incomplete setup locally.
  readonly draft?: LocalSeriesSetupDraft;
};

// LoadSeriesSetupDraft reads incomplete setup without network or moderation.
export type LoadSeriesSetupDraft = {
  // execute returns the latest validated local snapshot for the requested id.
  readonly execute: (
    input: LoadSeriesSetupDraftInput,
  ) => Promise<LoadSeriesSetupDraftResult>;
};

// SaveSeriesSetupDraft persists incomplete form values without final validation.
export type SaveSeriesSetupDraft = {
  // execute stores the supplied local-only snapshot exactly as form state.
  readonly execute: (draft: LocalSeriesSetupDraft) => Promise<void>;
};

// DeleteSeriesSetupDraftInput identifies a completed or discarded form snapshot.
export type DeleteSeriesSetupDraftInput = {
  // draftId selects the local snapshot to remove.
  readonly draftId: string;
};

// DeleteSeriesSetupDraft removes local form state without remote side effects.
export type DeleteSeriesSetupDraft = {
  // execute deletes the requested local-only setup snapshot.
  readonly execute: (input: DeleteSeriesSetupDraftInput) => Promise<void>;
};

// createLoadSeriesSetupDraft injects local persistence behind a focused read contract.
export function createLoadSeriesSetupDraft(
  store: SeriesSetupDraftStore,
): LoadSeriesSetupDraft {
  return {
    execute: async ({ draftId }) => {
      const draft = await store.getSeriesSetupDraft(draftId);

      return draft ? { draft } : {};
    },
  };
}

// createSaveSeriesSetupDraft injects local persistence behind an incomplete write contract.
export function createSaveSeriesSetupDraft(
  store: SeriesSetupDraftStore,
): SaveSeriesSetupDraft {
  return {
    execute: (draft) => store.saveSeriesSetupDraft(draft),
  };
}

// createDeleteSeriesSetupDraft injects local persistence behind a focused delete contract.
export function createDeleteSeriesSetupDraft(
  store: SeriesSetupDraftStore,
): DeleteSeriesSetupDraft {
  return {
    execute: ({ draftId }) => store.deleteSeriesSetupDraft(draftId),
  };
}
