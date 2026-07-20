import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Alert } from 'react-native';

import { localAppServices } from '../../services/localAppServices';
import type { ExcerptTranslationResult } from './components';
import {
  clearEpisodeExcerptSelectionForOwner,
  createEpisodeExcerptSelection,
  type EpisodeExcerptSelection,
  type EpisodeSelectionRange,
} from './episodeExcerptSelection';

// EpisodeExcerptTranslationController is the reader-facing selected-text workflow.
export type EpisodeExcerptTranslationController = {
  // selection is the exact active native range owned by one Reader surface.
  readonly selection: EpisodeExcerptSelection | undefined;
  // result is the completed plain Russian translation shown in the sheet.
  readonly result: ExcerptTranslationResult | undefined;
  // isTranslating blocks duplicate requests and drives progress feedback.
  readonly isTranslating: boolean;
  // clearForReaderTouchStart removes selection for a content tap outside its owner.
  readonly clearForReaderTouchStart: () => void;
  // clear removes selection and completed selected-text translation UI.
  readonly clear: () => void;
  // clearResult closes only the completed translation sheet.
  readonly clearResult: () => void;
  // isSelectionOwner identifies the Reader copy that keeps native handles.
  readonly isSelectionOwner: (ownerKey: string) => boolean;
  // markSelectionOwnerTouchStart preserves selection while its own native surface handles the tap.
  readonly markSelectionOwnerTouchStart: () => void;
  // selectRange converts one native range into an exact-text translation request.
  readonly selectRange: (
    ownerKey: string,
    text: string,
    range: EpisodeSelectionRange | undefined,
  ) => void;
  // translate requests a Russian translation of only the active range.
  readonly translate: () => Promise<void>;
};

// useEpisodeExcerptTranslation owns the ephemeral reader translation lifecycle.
export function useEpisodeExcerptTranslation(): EpisodeExcerptTranslationController {
  const [selection, setSelection] = useState<EpisodeExcerptSelection>();
  const [result, setResult] = useState<ExcerptTranslationResult>();
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  // isMountedRef prevents a completed request from updating an exited reader.
  const isMountedRef: RefObject<boolean> = useRef<boolean>(false);
  // isSelectionOwnerTouchRef lets a bubbling ScrollView touch observe its child first without claiming the responder.
  const isSelectionOwnerTouchRef: RefObject<boolean> = useRef<boolean>(false);

  useEffect((): (() => void) => {
    isMountedRef.current = true;

    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  // clear removes both temporary selection surfaces when another reader tool opens.
  const clear = (): void => {
    setSelection(undefined);
    setResult(undefined);
  };

  // clearResult closes the result without changing any later native range.
  const clearResult = (): void => {
    setResult(undefined);
  };

  // isSelectionOwner keeps native handles attached to exactly one text surface.
  const isSelectionOwner = (ownerKey: string): boolean =>
    selection?.ownerKey === ownerKey;

  // markSelectionOwnerTouchStart records that the bubbling content touch began inside active native handles.
  const markSelectionOwnerTouchStart = (): void => {
    isSelectionOwnerTouchRef.current = true;
  };

  // clearForReaderTouchStart dismisses the panel for outside content taps without blocking ScrollView gestures.
  const clearForReaderTouchStart = (): void => {
    const shouldPreserveSelection: boolean = isSelectionOwnerTouchRef.current;
    isSelectionOwnerTouchRef.current = false;

    if (!shouldPreserveSelection) {
      setSelection(undefined);
    }
  };

  // selectRange trims native offsets and clears any previous range on a normal tap.
  const selectRange = (
    ownerKey: string,
    text: string,
    range: EpisodeSelectionRange | undefined,
  ): void => {
    if (!range) {
      setSelection(
        (
          currentSelection: EpisodeExcerptSelection | undefined,
        ): EpisodeExcerptSelection | undefined =>
          clearEpisodeExcerptSelectionForOwner({
            currentSelection,
            ownerKey,
          }),
      );
      return;
    }

    // nextSelection contains only the exact source range reported by native selection.
    const nextSelection: EpisodeExcerptSelection | undefined =
      createEpisodeExcerptSelection({
        ...range,
        ownerKey,
        text,
      });

    setResult(undefined);
    setSelection(nextSelection);
  };

  // translate sends the exact selected text and surfaces only safe user-facing errors.
  const translate = async (): Promise<void> => {
    const requestedSelection: EpisodeExcerptSelection | undefined = selection;

    if (!requestedSelection || isTranslating) {
      return;
    }

    setIsTranslating(true);

    try {
      const translation = await localAppServices.translateEpisodeExcerpt.execute({
        selectedText: requestedSelection.selectedText,
      });

      if (!isMountedRef.current) {
        return;
      }

      setResult({
        sourceText: requestedSelection.selectedText,
        translation: translation.translation,
      });
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }

      // message is already sanitized by the use case or Supabase error adapter.
      const message: string =
        error instanceof Error
          ? error.message
          : 'Selected-text translation is unavailable right now.';

      Alert.alert('Translation unavailable', message);
    } finally {
      if (isMountedRef.current) {
        setIsTranslating(false);
      }
    }
  };

  return {
    clear,
    clearForReaderTouchStart,
    clearResult,
    isSelectionOwner,
    isTranslating,
    markSelectionOwnerTouchStart,
    result,
    selection,
    selectRange,
    translate,
  };
}
