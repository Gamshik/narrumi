import type {
  LocalSeriesSetupDraftCollection,
  LocalSeriesStore,
} from '@application/ports';
import type { LocalSeriesSetupDraft } from '@domain/index';

// SeriesSetupDraftStore is the local-only persistence slice used by form drafts.
type SeriesSetupDraftStore = Pick<
  LocalSeriesStore,
  'getSeriesSetupDraft' | 'saveSeriesSetupDraft' | 'deleteSeriesSetupDraft'
>;

// SeriesSetupDraftCollectionStore adds collection reads to the focused draft mutation port.
type SeriesSetupDraftCollectionStore = SeriesSetupDraftStore &
  LocalSeriesSetupDraftCollection;

// ListSeriesSetupDraftsResult returns every independent unfinished setup snapshot.
export type ListSeriesSetupDraftsResult = {
  // drafts are ordered newest first by the local adapter.
  readonly drafts: readonly LocalSeriesSetupDraft[];
};

// ListSeriesSetupDrafts exposes all locally saved create flows to Home.
export type ListSeriesSetupDrafts = {
  // execute reads the complete validated local draft collection without network work.
  readonly execute: () => Promise<ListSeriesSetupDraftsResult>;
};

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

// createListSeriesSetupDrafts injects the local collection reader behind a focused contract.
export function createListSeriesSetupDrafts(
  store: SeriesSetupDraftCollectionStore,
): ListSeriesSetupDrafts {
  return {
    execute: async (): Promise<ListSeriesSetupDraftsResult> => {
      // drafts excludes existing-series edit snapshots, which belong to their detail screen.
      const drafts: readonly LocalSeriesSetupDraft[] =
        await store.listSeriesSetupDrafts();

      return {
        drafts: drafts.filter(
          (draft: LocalSeriesSetupDraft): boolean =>
            draft.seriesId === undefined,
        ),
      };
    },
  };
}

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
