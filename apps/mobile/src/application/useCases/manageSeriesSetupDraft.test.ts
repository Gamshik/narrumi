import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  LocalSeriesSetupDraftCollection,
  LocalSeriesStore,
} from '@application/ports';
import {
  newSeriesSetupDraftId,
  type LocalSeriesSetupDraft,
} from '@domain/index';

import {
  createDeleteSeriesSetupDraft,
  createListSeriesSetupDrafts,
  createLoadSeriesSetupDraft,
  createSaveSeriesSetupDraft,
} from './manageSeriesSetupDraft';

// draft is intentionally incomplete because local save must not run final validation.
const draft: LocalSeriesSetupDraft = {
  draftId: newSeriesSetupDraftId,
  title: '',
  premise: '',
  participationMode: 'character',
  characterProfiles: [],
  userRole: '',
  creativeBrief: {
    idea: 'A light appears in an empty station.',
    worldAndSetting: '',
    backstory: '',
    storyDriver: '',
    mustInclude: '',
    avoid: '',
    draftStrategy: 'fill-missing',
  },
  setupDraftMeta: { aiGeneratedFields: [] },
  updatedAt: '2026-07-17T12:00:00.000Z',
};

describe('manageSeriesSetupDraft', () => {
  it('round-trips incomplete create form values without validation', async () => {
    const store = createDraftStore();
    const saveDraft = createSaveSeriesSetupDraft(store);
    const loadDraft = createLoadSeriesSetupDraft(store);

    await saveDraft.execute(draft);
    const result = await loadDraft.execute({ draftId: newSeriesSetupDraftId });

    assert.deepEqual(result.draft, draft);
  });

  it('deletes the create draft after a ready series is persisted', async () => {
    const store = createDraftStore();
    const saveDraft = createSaveSeriesSetupDraft(store);
    const deleteDraft = createDeleteSeriesSetupDraft(store);
    const loadDraft = createLoadSeriesSetupDraft(store);

    await saveDraft.execute(draft);
    // readySeriesPersisted represents the successful create result owned by the caller.
    const readySeriesPersisted = true;

    if (readySeriesPersisted) {
      await deleteDraft.execute({ draftId: newSeriesSetupDraftId });
    }

    assert.deepEqual(
      await loadDraft.execute({ draftId: newSeriesSetupDraftId }),
      {},
    );
  });

  it('keeps independently saved drafts in the same local collection', async () => {
    const store = createDraftStore();
    const saveDraft = createSaveSeriesSetupDraft(store);
    const listDrafts = createListSeriesSetupDrafts(store);
    // secondDraft represents another New Series flow saved after the legacy draft.
    const secondDraft: LocalSeriesSetupDraft = {
      ...draft,
      draftId: 'new-series:second',
      premise: 'A second unfinished story.',
      updatedAt: '2026-07-18T12:00:00.000Z',
    };
    // existingSeriesDraft belongs to its series detail editor rather than the Home Drafts tab.
    const existingSeriesDraft: LocalSeriesSetupDraft = {
      ...draft,
      draftId: 'series:existing',
      seriesId: 'series:existing',
      title: 'Existing series edit',
    };

    await saveDraft.execute(draft);
    await saveDraft.execute(secondDraft);
    await saveDraft.execute(existingSeriesDraft);

    assert.deepEqual((await listDrafts.execute()).drafts, [draft, secondDraft]);
  });

  it('deletes one selected draft without removing another', async () => {
    const store = createDraftStore();
    const saveDraft = createSaveSeriesSetupDraft(store);
    const deleteDraft = createDeleteSeriesSetupDraft(store);
    const listDrafts = createListSeriesSetupDrafts(store);
    // secondDraft is the only local snapshot selected for deletion.
    const secondDraft: LocalSeriesSetupDraft = {
      ...draft,
      draftId: 'new-series:second',
      updatedAt: '2026-07-18T12:00:00.000Z',
    };

    await saveDraft.execute(draft);
    await saveDraft.execute(secondDraft);
    await deleteDraft.execute({ draftId: secondDraft.draftId });

    assert.deepEqual((await listDrafts.execute()).drafts, [draft]);
  });
});

// createDraftStore provides only the local-only port slice required by draft use cases.
function createDraftStore(): Pick<
  LocalSeriesStore,
  'getSeriesSetupDraft' | 'saveSeriesSetupDraft' | 'deleteSeriesSetupDraft'
> &
  LocalSeriesSetupDraftCollection {
  // storedDrafts is the mutable in-memory collection used by the focused tests.
  const storedDrafts = new Map<string, LocalSeriesSetupDraft>();

  return {
    listSeriesSetupDrafts: async () => [...storedDrafts.values()],
    getSeriesSetupDraft: async (draftId) => storedDrafts.get(draftId),
    saveSeriesSetupDraft: async (value) => {
      storedDrafts.set(value.draftId, value);
    },
    deleteSeriesSetupDraft: async (draftId) => {
      storedDrafts.delete(draftId);
    },
  };
}
