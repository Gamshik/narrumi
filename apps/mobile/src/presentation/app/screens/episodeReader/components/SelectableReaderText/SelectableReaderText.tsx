import { useEffect, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Platform,
  TextInput,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type TextInputSelectionChangeEvent,
  type TextStyle,
} from 'react-native';

import type { TranslationAnnotation } from '@domain/index';
import { useAppTheme } from '@presentation/app/theme';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import type { EpisodeSelectionRange } from '../../episodeExcerptSelection';
import {
  buildSentenceTextChunks,
  findSentenceAnnotationAtOffset,
  type SentenceTextChunk,
} from '../../episodeReaderText';

import { selectableReaderTextStyles as localStyles } from './SelectableReaderText.styles';
import {
  plainTapMaximumDurationMs,
  shouldReleaseResponderAfterTouch,
  shouldRestoreSelectionAfterCollapse,
} from './selectableReaderTextGesture';
import { StoryWordTextLayer } from './StoryWordTextLayer';

// annotationTapDelayMs leaves enough time for a second tap to become word selection.
const annotationTapDelayMs: number = 300;
// tapBlurDelayMs releases a plain tap before the user's next scroll gesture.
const tapBlurDelayMs: number = 180;
// scrollIntentDistancePx ignores the small finger drift common during long press.
const scrollIntentDistancePx: number = 6;

// ReaderTouchPoint stores the initial screen coordinate for scroll-intent detection.
type ReaderTouchPoint = {
  // pageX is the horizontal screen coordinate in points.
  readonly pageX: number;
  // pageY is the vertical screen coordinate in points.
  readonly pageY: number;
};

// SelectableReaderTextProps owns visible Reader copy and its native selection layer.
type SelectableReaderTextProps = {
  // annotations optionally preserve existing Story Word tap affordances.
  readonly annotations?: readonly TranslationAnnotation[];
  // annotationStyle visually distinguishes prepared Story Words under the selection layer.
  readonly annotationStyle?: StyleProp<TextStyle>;
  // isSelectionOwner keeps native handles only on the active text surface.
  readonly isSelectionOwner: boolean;
  // sentenceIndex scopes optional Story Word annotations to episode prose.
  readonly sentenceIndex?: number;
  // text is the exact Reader copy rendered by both aligned layers.
  readonly text: string;
  // textStyle defines identical typography for visible and transparent layers.
  readonly textStyle: StyleProp<TextStyle>;
  // onPressAnnotation opens an existing generated Story Word translation.
  readonly onPressAnnotation?: (annotation: TranslationAnnotation) => void;
  // onSelectionOwnerTouchStart marks a touch inside the currently active native range.
  readonly onSelectionOwnerTouchStart: () => void;
  // onSelectionChange reports a native excerpt range or clears the active range.
  readonly onSelectionChange: (
    range: EpisodeSelectionRange | undefined,
  ) => void;
};

// SelectableReaderText overlays reliable native selection on any styled Reader copy.
export function SelectableReaderText({
  annotations = [],
  annotationStyle,
  isSelectionOwner,
  onPressAnnotation,
  onSelectionOwnerTouchStart,
  onSelectionChange,
  sentenceIndex,
  text,
  textStyle,
}: SelectableReaderTextProps): ReactElement {
  const { isDark } = useAppTheme();
  // colors provides selection tint and handle color for the active theme.
  const colors: AppColors = isDark ? darkColors : lightColors;
  // selectionTint stays opaque on iOS because UIKit uses it for the handles themselves.
  const selectionTint: string =
    Platform.OS === 'ios' ? colors.systemBlue : `${colors.systemBlue}4d`;
  // inputRef collapses stale native handles when another text surface becomes active.
  const inputRef: RefObject<TextInput | null> = useRef<TextInput>(null);
  // hasNativeSelectionRef avoids issuing selection commands before any range exists.
  const hasNativeSelectionRef: RefObject<boolean> = useRef<boolean>(false);
  // activeNativeRangeRef keeps native highlighting synchronized with Reader controls.
  const activeNativeRangeRef: RefObject<EpisodeSelectionRange | undefined> =
    useRef<EpisodeSelectionRange | undefined>(undefined);
  // didMoveTextTouchRef distinguishes taps from handle movement and Reader scroll intent.
  const didMoveTextTouchRef: RefObject<boolean> = useRef<boolean>(false);
  // annotationTimerRef delays a Story Word action until a possible second tap passes.
  const annotationTimerRef: RefObject<
    ReturnType<typeof setTimeout> | undefined
  > = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // tapBlurTimerRef releases the native responder after a plain, collapsed tap.
  const tapBlurTimerRef: RefObject<
    ReturnType<typeof setTimeout> | undefined
  > = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // pendingAnnotationRef defers Story Word opening until the gesture proves to be a tap.
  const pendingAnnotationRef: RefObject<TranslationAnnotation | undefined> =
    useRef<TranslationAnnotation | undefined>(undefined);
  // isTouchActiveRef lets annotation selection arrive before or after touch end.
  const isTouchActiveRef: RefObject<boolean> = useRef<boolean>(false);
  // didFinishPlainTapRef admits only a recently completed single-tap annotation action.
  const didFinishPlainTapRef: RefObject<boolean> = useRef<boolean>(false);
  // didLongPressAnnotationRef prevents release from opening a sheet after direct selection.
  const didLongPressAnnotationRef: RefObject<boolean> = useRef<boolean>(false);
  // touchStartedAtRef lets an early drag yield to Reader scrolling while preserving long-press selection.
  const touchStartedAtRef: RefObject<number> = useRef<number>(0);
  // touchStartPointRef measures real vertical movement without reacting to finger jitter.
  const touchStartPointRef: RefObject<ReaderTouchPoint> =
    useRef<ReaderTouchPoint>({ pageX: 0, pageY: 0 });
  // chunks preserve optional annotation coloring without changing text metrics.
  const chunks: readonly SentenceTextChunk[] =
    sentenceIndex === undefined
      ? [
          {
            endOffset: text.length,
            id: 'reader-copy',
            startOffset: 0,
            text,
          },
        ]
      : buildSentenceTextChunks({ annotations, sentence: text, sentenceIndex });

  useEffect((): (() => void) => {
    return (): void => {
      if (annotationTimerRef.current) {
        clearTimeout(annotationTimerRef.current);
      }
      if (tapBlurTimerRef.current) {
        clearTimeout(tapBlurTimerRef.current);
      }
    };
  }, [annotationTimerRef, tapBlurTimerRef]);

  useEffect((): void => {
    if (isSelectionOwner || !hasNativeSelectionRef.current) {
      return;
    }

    if (tapBlurTimerRef.current) {
      clearTimeout(tapBlurTimerRef.current);
      tapBlurTimerRef.current = undefined;
    }
    hasNativeSelectionRef.current = false;
    activeNativeRangeRef.current = undefined;
    didMoveTextTouchRef.current = false;
    isTouchActiveRef.current = false;
    didFinishPlainTapRef.current = false;
    // Owner-scoped state cleanup makes this collapsed event harmless; suppressing it
    // can leave a stale flag that incorrectly drops the next real native range.
    inputRef.current?.setSelection(0, 0);
  }, [isSelectionOwner]);

  // clearAnnotationTimer prevents a double tap or selection gesture from opening a word hint.
  const clearAnnotationTimer = (): void => {
    if (!annotationTimerRef.current) {
      return;
    }

    clearTimeout(annotationTimerRef.current);
    annotationTimerRef.current = undefined;
  };

  // clearTapBlurTimer keeps the responder alive while a second tap or long press is active.
  const clearTapBlurTimer = (): void => {
    if (!tapBlurTimerRef.current) {
      return;
    }

    clearTimeout(tapBlurTimerRef.current);
    tapBlurTimerRef.current = undefined;
  };

  // schedulePendingAnnotation opens one prepared word after the multi-tap window closes.
  const schedulePendingAnnotation = (): void => {
    const pendingAnnotation: TranslationAnnotation | undefined =
      pendingAnnotationRef.current;

    if (!pendingAnnotation || !onPressAnnotation) {
      return;
    }

    pendingAnnotationRef.current = undefined;
    didFinishPlainTapRef.current = false;
    clearAnnotationTimer();
    annotationTimerRef.current = setTimeout((): void => {
      annotationTimerRef.current = undefined;
      onPressAnnotation(pendingAnnotation);
    }, annotationTapDelayMs);
  };

  // selectAnnotatedChunk gives a directly tappable Story Word the same native handles.
  const selectAnnotatedChunk = (chunk: SentenceTextChunk): void => {
    clearAnnotationTimer();
    clearTapBlurTimer();
    pendingAnnotationRef.current = undefined;
    hasNativeSelectionRef.current = true;
    // annotationRange maps the visible Story Word back to its native text offsets.
    const annotationRange: EpisodeSelectionRange = {
      end: chunk.endOffset,
      start: chunk.startOffset,
    };
    activeNativeRangeRef.current = annotationRange;
    inputRef.current?.focus();
    inputRef.current?.setSelection(annotationRange.start, annotationRange.end);
    onSelectionChange(annotationRange);
  };

  // handleDirectAnnotationPress opens the existing Story Word sheet without a caret event.
  const handleDirectAnnotationPress = (chunk: SentenceTextChunk): void => {
    const annotation: TranslationAnnotation | undefined = chunk.annotation;

    if (!annotation || !onPressAnnotation) {
      return;
    }

    if (didLongPressAnnotationRef.current) {
      didLongPressAnnotationRef.current = false;
      return;
    }

    const activeRange: EpisodeSelectionRange | undefined =
      activeNativeRangeRef.current;
    const overlapsActiveRange: boolean = Boolean(
      isSelectionOwner &&
        activeRange &&
        activeRange.start < chunk.endOffset &&
        activeRange.end > chunk.startOffset,
    );

    if (overlapsActiveRange && activeRange) {
      // A tap inside the selected range restores handles instead of changing tools.
      inputRef.current?.focus();
      inputRef.current?.setSelection(activeRange.start, activeRange.end);
      return;
    }

    clearAnnotationTimer();
    pendingAnnotationRef.current = undefined;
    onPressAnnotation(annotation);
  };

  // handleDirectAnnotationLongPress keeps highlighted words inside native selection flow.
  const handleDirectAnnotationLongPress = (chunk: SentenceTextChunk): void => {
    didLongPressAnnotationRef.current = true;
    selectAnnotatedChunk(chunk);
  };

  // handleDirectAnnotationPressIn preserves an owned range before the parent touch bubbles.
  const handleDirectAnnotationPressIn = (): void => {
    didLongPressAnnotationRef.current = false;

    if (isSelectionOwner) {
      onSelectionOwnerTouchStart();
    }
  };

  // handleTouchStart gives the active text owner first refusal before Reader cleanup.
  const handleTouchStart = (event: GestureResponderEvent): void => {
    clearAnnotationTimer();
    clearTapBlurTimer();
    pendingAnnotationRef.current = undefined;
    didMoveTextTouchRef.current = false;
    isTouchActiveRef.current = true;
    didFinishPlainTapRef.current = false;
    touchStartedAtRef.current = Date.now();
    touchStartPointRef.current = {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };

    if (isSelectionOwner) {
      onSelectionOwnerTouchStart();
    }
  };

  // handleTouchMove releases an early swipe so the parent ScrollView wins immediately.
  const handleTouchMove = (event: GestureResponderEvent): void => {
    const gestureAgeMs: number = Date.now() - touchStartedAtRef.current;
    const horizontalDistance: number = Math.abs(
      event.nativeEvent.pageX - touchStartPointRef.current.pageX,
    );
    const verticalDistance: number = Math.abs(
      event.nativeEvent.pageY - touchStartPointRef.current.pageY,
    );

    if (
      horizontalDistance >= scrollIntentDistancePx ||
      verticalDistance >= scrollIntentDistancePx
    ) {
      didMoveTextTouchRef.current = true;
    }

    if (
      hasNativeSelectionRef.current ||
      gestureAgeMs >= plainTapMaximumDurationMs ||
      verticalDistance < scrollIntentDistancePx ||
      verticalDistance <= horizontalDistance
    ) {
      return;
    }

    clearAnnotationTimer();
    pendingAnnotationRef.current = undefined;
    didFinishPlainTapRef.current = false;
    inputRef.current?.blur();
  };

  // handleTouchEnd releases plain taps but preserves native handles after a real range.
  const handleTouchEnd = (): void => {
    const gestureAgeMs: number = Date.now() - touchStartedAtRef.current;
    // didFinishPlainTap accepts a late collapsed-selection event from this exact tap.
    const didFinishPlainTap: boolean =
      gestureAgeMs < plainTapMaximumDurationMs &&
      !didMoveTextTouchRef.current;
    isTouchActiveRef.current = false;
    didFinishPlainTapRef.current = didFinishPlainTap;

    if (
      shouldReleaseResponderAfterTouch({
        gestureAgeMs,
        hasNativeSelection: hasNativeSelectionRef.current,
      })
    ) {
      clearTapBlurTimer();
      tapBlurTimerRef.current = setTimeout((): void => {
        tapBlurTimerRef.current = undefined;
        didFinishPlainTapRef.current = false;

        if (hasNativeSelectionRef.current) {
          return;
        }

        inputRef.current?.blur();
      }, tapBlurDelayMs);
    }

    if (!didFinishPlainTap) {
      pendingAnnotationRef.current = undefined;
      return;
    }

    schedulePendingAnnotation();
  };

  // handleBlur clears caret-only focus while an owned range waits for explicit Reader dismissal.
  const handleBlur = (): void => {
    clearTapBlurTimer();

    if (hasNativeSelectionRef.current) {
      return;
    }

    hasNativeSelectionRef.current = false;
    onSelectionChange(undefined);
  };

  // handleSelectionChange separates user ranges, deselection, and Story Word taps.
  const handleSelectionChange = (
    event: TextInputSelectionChangeEvent,
  ): void => {
    const { end, start } = event.nativeEvent.selection;

    clearAnnotationTimer();

    if (start !== end) {
      clearTapBlurTimer();
      hasNativeSelectionRef.current = true;
      activeNativeRangeRef.current = { end, start };
      pendingAnnotationRef.current = undefined;
      didFinishPlainTapRef.current = false;
      onSelectionChange({ end, start });
      return;
    }

    const activeRange: EpisodeSelectionRange | undefined =
      activeNativeRangeRef.current;

    if (
      isSelectionOwner &&
      shouldRestoreSelectionAfterCollapse({
        activeRange,
        collapsedOffset: start,
        didMove: didMoveTextTouchRef.current,
      }) &&
      activeRange
    ) {
      // A repeated tap may collapse UIKit selection before a later multi-tap range arrives.
      inputRef.current?.setSelection(activeRange.start, activeRange.end);
      return;
    }

    hasNativeSelectionRef.current = false;
    activeNativeRangeRef.current = undefined;
    onSelectionChange(undefined);

    if (sentenceIndex === undefined || !onPressAnnotation) {
      return;
    }

    const annotation: TranslationAnnotation | undefined =
      findSentenceAnnotationAtOffset({
        annotations,
        offset: start,
        sentence: text,
        sentenceIndex,
      });

    if (annotation) {
      pendingAnnotationRef.current = annotation;

      if (!isTouchActiveRef.current && didFinishPlainTapRef.current) {
        schedulePendingAnnotation();
      }
    }
  };

  return (
    <View style={localStyles.container}>
      <TextInput
        accessibilityHint="Long press and drag to select this text for translation"
        accessibilityLabel={text}
        autoCorrect={false}
        contextMenuHidden
        multiline
        onBlur={handleBlur}
        onSelectionChange={handleSelectionChange}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        readOnly={Platform.OS === 'ios'}
        rejectResponderTermination={false}
        ref={inputRef}
        scrollEnabled={false}
        selectionColor={selectionTint}
        selectionHandleColor={colors.systemBlue}
        selectTextOnFocus={false}
        showSoftInputOnFocus={false}
        spellCheck={false}
        style={[textStyle, localStyles.selectionInput]}
        underlineColorAndroid="transparent"
        value={text}
      />
      <StoryWordTextLayer
        annotationStyle={annotationStyle}
        chunks={chunks}
        text={text}
        textStyle={textStyle}
        visibleTextStyle={localStyles.visibleText}
        onLongPressChunk={handleDirectAnnotationLongPress}
        onPressChunk={handleDirectAnnotationPress}
        onPressIn={handleDirectAnnotationPressIn}
      />
    </View>
  );
}
