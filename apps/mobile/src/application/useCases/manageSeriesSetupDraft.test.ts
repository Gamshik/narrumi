import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore } from '@application/ports';
import {
  newSeriesSetupDraftId,
  type LocalSeriesSetupDraft,
} from '@domain/index';

import {
  createDeleteSeriesSetupDraft,
  createLoadSeriesSetupDraft,
  createSaveSeriesSetupDraft,
} from './manageSeriesSetupDraft';

// draft is intentionally incomplete because local save must not run final validation.
const draft: LocalSeriesSetupDraft = {
  draftId: newSeriesSetupDraftId,
  title: '',
  genre: 'short-fiction',
  cefrLevel: 'A2',
  tone: '',
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
});

// createDraftStore provides only the local-only port slice required by draft use cases.
function createDraftStore(): Pick<
  LocalSeriesStore,
  'getSeriesSetupDraft' | 'saveSeriesSetupDraft' | 'deleteSeriesSetupDraft'
> {
  // storedDraft is the mutable in-memory form snapshot used by the focused test.
  let storedDraft: LocalSeriesSetupDraft | undefined;

  return {
    getSeriesSetupDraft: async (draftId) =>
      storedDraft?.draftId === draftId ? storedDraft : undefined,
    saveSeriesSetupDraft: async (value) => {
      storedDraft = value;
    },
    deleteSeriesSetupDraft: async (draftId) => {
      if (storedDraft?.draftId === draftId) {
        storedDraft = undefined;
      }
    },
  };
}
