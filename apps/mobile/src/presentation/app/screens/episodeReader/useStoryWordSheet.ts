import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { TranslationAnnotation, VocabularyItem } from '@domain/index';

import { localAppServices } from '../../services/localAppServices';
import {
  createStoryWordSheetDetails,
  type StoryWordSheetDetails,
} from './storyWordSheetDetails';

// SelectedStoryWord stores the immediate episode hint and optional offline dictionary match.
type SelectedStoryWord = {
  // annotation makes the sheet visible without waiting for the local dictionary promise.
  readonly annotation: TranslationAnnotation;
  // vocabularyItem adds canonical spelling, pronunciation, and part of speech when resolved.
  readonly vocabularyItem?: VocabularyItem;
};

// StoryWordSheetController owns the one-tap Story Word detail-sheet lifecycle.
export type StoryWordSheetController = {
  // details is undefined while no prepared Story Word is open.
  readonly details: StoryWordSheetDetails | undefined;
  // open shows the context hint immediately and enriches it from the offline dictionary.
  readonly open: (annotation: TranslationAnnotation) => void;
  // close dismisses the current card and invalidates any unfinished lookup.
  readonly close: () => void;
};

// useStoryWordSheet keeps asynchronous dictionary enrichment out of the Reader component.
export function useStoryWordSheet(): StoryWordSheetController {
  const [selection, setSelection] = useState<SelectedStoryWord>();
  // lookupVersionRef prevents a late dictionary result from reopening or replacing another word.
  const lookupVersionRef: RefObject<number> = useRef<number>(0);

  const open = useCallback((annotation: TranslationAnnotation): void => {
    lookupVersionRef.current += 1;
    const lookupVersion: number = lookupVersionRef.current;

    setSelection({ annotation });

    if (!annotation.wordId) {
      return;
    }

    void localAppServices.getVocabularyItem
      .execute(annotation.wordId)
      .then((vocabularyItem: VocabularyItem | undefined): void => {
        if (!vocabularyItem || lookupVersionRef.current !== lookupVersion) {
          return;
        }

        setSelection({ annotation, vocabularyItem });
      })
      // The validated episode hint remains useful if a legacy dictionary id cannot resolve.
      .catch((): undefined => undefined);
  }, [lookupVersionRef]);

  const close = useCallback((): void => {
    lookupVersionRef.current += 1;
    setSelection(undefined);
  }, [lookupVersionRef]);

  return {
    details: selection
      ? createStoryWordSheetDetails(
          selection.annotation,
          selection.vocabularyItem,
        )
      : undefined,
    open,
    close,
  };
}
