import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// actionBarSource protects the visible three-slot reader action contract.
const actionBarSource: string = readFileSync(
  resolve(__dirname, 'SelectionActionBar.tsx'),
  'utf8',
);
// selectableTextSource protects native handles without opening the keyboard or menu.
const selectableTextSource: string = readFileSync(
  resolve(__dirname, '../SelectableReaderText/SelectableReaderText.tsx'),
  'utf8',
);
// selectableTextStylesSource protects the unclipped native handle safe area.
const selectableTextStylesSource: string = readFileSync(
  resolve(__dirname, '../SelectableReaderText/SelectableReaderText.styles.ts'),
  'utf8',
);
// storyWordTextLayerSource protects direct Story Word targets above native selection.
const storyWordTextLayerSource: string = readFileSync(
  resolve(
    __dirname,
    '../SelectableReaderText/StoryWordTextLayer/StoryWordTextLayer.tsx',
  ),
  'utf8',
);
// episodeSentenceSource prevents whole-sentence press compression from returning.
const episodeSentenceSource: string = readFileSync(
  resolve(__dirname, '../EpisodeSentence/EpisodeSentence.tsx'),
  'utf8',
);
// translationSheetSource protects the translation-only result contract.
const translationSheetSource: string = readFileSync(
  resolve(__dirname, '../ExcerptTranslationSheet/ExcerptTranslationSheet.tsx'),
  'utf8',
);
// translationSheetStylesSource protects modal stacking above selection controls.
const translationSheetStylesSource: string = readFileSync(
  resolve(
    __dirname,
    '../ExcerptTranslationSheet/ExcerptTranslationSheet.styles.ts',
  ),
  'utf8',
);
// readerScreenSource protects selectable interaction copy and deselection behavior.
const readerScreenSource: string = readFileSync(
  resolve(__dirname, '../../../EpisodeReaderScreen.tsx'),
  'utf8',
);
// excerptTranslationHookSource protects selection ownership across a completed request.
const excerptTranslationHookSource: string = readFileSync(
  resolve(__dirname, '../../useEpisodeExcerptTranslation.ts'),
  'utf8',
);

test('selected text actions keep one Translate and two future slots', (): void => {
  const futureActionUsages: RegExpMatchArray | null =
    actionBarSource.match(/<FutureAction/g);

  assert.equal(futureActionUsages?.length, 2);
  assert.match(actionBarSource, /Translate selected text/);
  assert.match(actionBarSource, /Animated\.loop/);
  assert.match(actionBarSource, /delayMs=\{120\}/);
  assert.match(actionBarSource, /delayMs=\{480\}/);
  assert.match(actionBarSource, /useReducedMotionPreference/);
  assert.match(actionBarSource, /isVisible: boolean/);
  assert.match(actionBarSource, /Easing\.out\(Easing\.back\(1\.2\)\)/);
  assert.match(actionBarSource, /setIsRendered\(false\)/);
  assert.match(
    readerScreenSource,
    /isVisible=\{Boolean\(\s+excerptTranslation\.selection && !excerptTranslation\.result/,
  );
});

test('episode text uses native selection without keyboard or paragraph press', (): void => {
  assert.match(selectableTextSource, /contextMenuHidden/);
  assert.match(selectableTextSource, /readOnly=\{Platform\.OS === 'ios'\}/);
  assert.match(selectableTextSource, /rejectResponderTermination=\{false\}/);
  assert.match(selectableTextSource, /showSoftInputOnFocus=\{false\}/);
  assert.match(selectableTextSource, /selectionColor=\{selectionTint\}/);
  assert.match(selectableTextSource, /selectionHandleColor/);
  assert.match(storyWordTextLayerSource, /pointerEvents="box-none"/);
  assert.match(storyWordTextLayerSource, /<Pressable/);
  assert.match(selectableTextSource, /onPressChunk=\{handleDirectAnnotationPress\}/);
  assert.match(
    selectableTextSource,
    /onLongPressChunk=\{handleDirectAnnotationLongPress\}/,
  );
  assert.match(selectableTextSource, /onPressIn=\{handleDirectAnnotationPressIn\}/);
  assert.match(
    selectableTextSource,
    /<TextInput[\s\S]*?<StoryWordTextLayer/,
  );
  assert.match(selectableTextStylesSource, /visibleText/);
  assert.match(selectableTextStylesSource, /zIndex:\s*1/);
  assert.match(selectableTextSource, /onBlur=\{handleBlur\}/);
  assert.match(selectableTextSource, /onTouchEnd=\{handleTouchEnd\}/);
  assert.match(selectableTextSource, /onTouchMove=\{handleTouchMove\}/);
  assert.match(selectableTextSource, /onTouchStart=\{handleTouchStart\}/);
  assert.doesNotMatch(selectableTextSource, /shouldDismissSelectionAfterTouch/);
  assert.doesNotMatch(selectableTextSource, /selectionTapDismissDelayMs/);
  assert.match(selectableTextSource, /shouldReleaseResponderAfterTouch/);
  assert.doesNotMatch(selectableTextSource, /isProgrammaticCollapseRef/);
  assert.doesNotMatch(selectableTextSource, /selectionAtTouchStartRef/);
  assert.match(
    selectableTextSource,
    /if \(start !== end\) \{\s+clearTapBlurTimer\(\)/,
  );
  assert.match(
    selectableTextSource,
    /shouldRestoreSelectionAfterCollapse/,
  );
  assert.match(selectableTextSource, /annotationTapDelayMs: number = 300/);
  assert.match(selectableTextSource, /isTouchActiveRef/);
  assert.match(selectableTextSource, /didFinishPlainTapRef/);
  assert.match(
    selectableTextSource,
    /if \(!didFinishPlainTap\) \{[\s\S]*?schedulePendingAnnotation\(\)/,
  );
  assert.match(
    selectableTextSource,
    /if \(!isTouchActiveRef\.current && didFinishPlainTapRef\.current\) \{\s+schedulePendingAnnotation\(\)/,
  );
  assert.match(selectableTextStylesSource, /bottom: -8/);
  assert.match(selectableTextStylesSource, /left: -6/);
  assert.match(selectableTextStylesSource, /paddingVertical: 8/);
  assert.match(selectableTextStylesSource, /right: -6/);
  assert.match(selectableTextStylesSource, /top: -8/);
  assert.doesNotMatch(episodeSentenceSource, /JellyPressable/);
  assert.doesNotMatch(episodeSentenceSource, /styles\.pressed/);
});

// This regression ensures the first real range cannot be swallowed by stale cleanup state.
test('first native range is always accepted after an owner collapse', (): void => {
  assert.match(selectableTextSource, /inputRef\.current\?\.setSelection\(0, 0\)/);
  assert.doesNotMatch(selectableTextSource, /ProgrammaticCollapse/);
  assert.match(
    selectableTextSource,
    /if \(start !== end\) \{\s+clearTapBlurTimer\(\)/,
  );
});

// This regression keeps controls mounted across every tap inside an owned native range.
test('repeated taps inside a selected range never dismiss its controls', (): void => {
  assert.doesNotMatch(selectableTextSource, /selectionDismissTimerRef/);
  assert.doesNotMatch(selectableTextSource, /selectionTapDismissDelayMs/);
  assert.match(
    selectableTextSource,
    /inputRef\.current\?\.setSelection\(activeRange\.start, activeRange\.end\)/,
  );
});

test('selected text result pairs the exact source with translation without teaching extras', (): void => {
  assert.match(translationSheetSource, /result\.sourceText/);
  assert.match(translationSheetSource, /result\.translation/);
  assert.match(translationSheetSource, /SELECTED TEXT/);
  assert.match(translationSheetSource, /RUSSIAN/);
  assert.doesNotMatch(translationSheetSource, /transcription/);
  assert.doesNotMatch(translationSheetSource, /secondaryText/);
});

// This regression keeps the translation result above and separate from selection controls.
test('translation result owns the top Reader overlay layer', (): void => {
  assert.match(translationSheetSource, /style=\{styles\.overlay\}/);
  assert.match(translationSheetStylesSource, /elevation:\s*100/);
  assert.match(translationSheetStylesSource, /zIndex:\s*100/);
  assert.match(
    readerScreenSource,
    /isVisible=\{Boolean\(\s+excerptTranslation\.selection && !excerptTranslation\.result/,
  );
});

// This regression keeps selection and its action available after translation completes.
test('completed translation preserves the active reader selection', (): void => {
  // translateWorkflowSource isolates the request lifecycle from explicit user cleanup actions.
  const translateWorkflowSource: string = excerptTranslationHookSource.slice(
    excerptTranslationHookSource.indexOf('const translate = async'),
    excerptTranslationHookSource.indexOf('\n  return {'),
  );

  assert.match(translateWorkflowSource, /setResult\(/);
  assert.doesNotMatch(translateWorkflowSource, /setSelection\(undefined\)/);
});

test('reader selection covers interaction copy and clears on outside taps or scroll', (): void => {
  assert.doesNotMatch(readerScreenSource, /<Pressable/);
  assert.doesNotMatch(readerScreenSource, /selectionDismissGesture/);
  assert.match(readerScreenSource, /canCancelContentTouches/);
  assert.match(
    readerScreenSource,
    /onTouchStart=\{excerptTranslation\.clearForReaderTouchStart\}/,
  );
  assert.doesNotMatch(readerScreenSource, /onScrollBeginDrag={excerptTranslation\.clear}/);
  assert.match(readerScreenSource, /onScrollBeginDrag={handleReaderScrollBeginDrag}/);
  assert.match(readerScreenSource, /promptOwnerKey/);
  assert.match(readerScreenSource, /answerOwnerKey/);
  assert.match(readerScreenSource, /feedbackOwnerKey/);
  assert.match(readerScreenSource, /completionOwnerKey/);
  assert.match(readerScreenSource, /text={interaction\.prompt}/);
  assert.match(readerScreenSource, /text={answerText}/);
  assert.match(readerScreenSource, /text={feedbackText}/);
  assert.match(readerScreenSource, /text={completionText}/);
});
