import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextLayoutEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { TranslationAnnotation } from '@domain/index';

import type { SentenceTextChunk } from '../../../episodeReaderText';

import { storyWordTextLayerStyles as styles } from './StoryWordTextLayer.styles';
import {
  createStoryWordHitSegments,
  type StoryWordHitSegment,
  type StoryWordTextLine,
} from './storyWordHitTargets';

// storyWordHitSlop expands the inline target slightly without covering adjacent words.
const storyWordHitSlop: number = 3;

// NativeStoryWordTextLine is one line emitted by the React Native Text layout event.
type NativeStoryWordTextLine = TextLayoutEvent['nativeEvent']['lines'][number];

// StoryWordSegmentMeasurement stores the two intrinsic widths needed for one target.
type StoryWordSegmentMeasurement = {
  // prefixWidth locates the segment inside its rendered line.
  readonly prefixWidth: number;
  // segmentWidth defines the tappable word width.
  readonly segmentWidth: number;
};

// StoryWordMeasurements indexes width pairs by stable line-segment id.
type StoryWordMeasurements = Readonly<
  Record<string, StoryWordSegmentMeasurement>
>;

// StoryWordTextLayerProps coordinates visible annotations and their exact touch targets.
type StoryWordTextLayerProps = {
  // annotationStyle visually identifies prepared Story Words.
  readonly annotationStyle: StyleProp<TextStyle> | undefined;
  // chunks contain visible copy and exact Story Word offsets.
  readonly chunks: readonly SentenceTextChunk[];
  // text is the complete sentence used to align native line ranges.
  readonly text: string;
  // textStyle matches the underlying selectable TextInput typography.
  readonly textStyle: StyleProp<TextStyle>;
  // visibleTextStyle places painted text above the transparent selectable glyphs.
  readonly visibleTextStyle: StyleProp<TextStyle>;
  // onLongPressChunk starts native selection for one Story Word.
  readonly onLongPressChunk: (chunk: SentenceTextChunk) => void;
  // onPressChunk opens the existing Story Word details sheet.
  readonly onPressChunk: (chunk: SentenceTextChunk) => void;
  // onPressIn preserves any active range before the Reader parent sees the touch.
  readonly onPressIn: () => void;
};

// StoryWordTextLayer renders copy once and adds measured buttons only over annotations.
export function StoryWordTextLayer({
  annotationStyle,
  chunks,
  onLongPressChunk,
  onPressChunk,
  onPressIn,
  text,
  textStyle,
  visibleTextStyle,
}: StoryWordTextLayerProps): ReactElement {
  const [lines, setLines] = useState<readonly StoryWordTextLine[]>([]);
  const [measurements, setMeasurements] =
    useState<StoryWordMeasurements>({});
  // segments map semantic Story Words onto the actual wrapped line layout.
  const segments: readonly StoryWordHitSegment[] = useMemo(
    (): readonly StoryWordHitSegment[] =>
      createStoryWordHitSegments({ chunks, lines, text }),
    [chunks, lines, text],
  );

  // handleTextLayout stores only geometry changes so measurement renders cannot loop.
  const handleTextLayout = (event: TextLayoutEvent): void => {
    const nextLines: readonly StoryWordTextLine[] = event.nativeEvent.lines.map(
      (line: NativeStoryWordTextLine): StoryWordTextLine => ({
        height: line.height,
        text: line.text,
        x: line.x,
        y: line.y,
      }),
    );

    setLines(
      (
        currentLines: readonly StoryWordTextLine[],
      ): readonly StoryWordTextLine[] => {
        const isUnchanged: boolean =
          currentLines.length === nextLines.length &&
          currentLines.every(
            (line: StoryWordTextLine, index: number): boolean => {
              const nextLine: StoryWordTextLine | undefined = nextLines[index];

              return Boolean(
                nextLine &&
                  line.height === nextLine.height &&
                  line.text === nextLine.text &&
                  line.x === nextLine.x &&
                  line.y === nextLine.y,
              );
            },
          );

        return isUnchanged ? currentLines : nextLines;
      },
    );
  };

  // recordMeasurement updates one intrinsic width without invalidating sibling targets.
  const recordMeasurement = (
    segmentId: string,
    kind: 'prefixWidth' | 'segmentWidth',
    event: LayoutChangeEvent,
  ): void => {
    const width: number = event.nativeEvent.layout.width;

    setMeasurements(
      (currentMeasurements: StoryWordMeasurements): StoryWordMeasurements => {
        const currentMeasurement: StoryWordSegmentMeasurement =
          currentMeasurements[segmentId] ?? {
            prefixWidth: -1,
            segmentWidth: -1,
          };

        if (currentMeasurement[kind] === width) {
          return currentMeasurements;
        }

        return {
          ...currentMeasurements,
          [segmentId]: {
            ...currentMeasurement,
            [kind]: width,
          },
        };
      },
    );
  };

  return (
    <>
      <Text
        accessible={false}
        onTextLayout={handleTextLayout}
        pointerEvents="none"
        style={[textStyle, visibleTextStyle]}
      >
        {chunks.map((chunk: SentenceTextChunk): ReactElement => (
          <Text
            key={chunk.id}
            style={chunk.annotation ? annotationStyle : undefined}
          >
            {chunk.text}
          </Text>
        ))}
      </Text>

      <View pointerEvents="box-none" style={styles.hitLayer}>
        {segments.map((segment: StoryWordHitSegment): ReactElement => {
          const measurement: StoryWordSegmentMeasurement | undefined =
            measurements[segment.id];
          const prefixWidth: number = segment.prefixText
            ? (measurement?.prefixWidth ?? -1)
            : 0;
          const segmentWidth: number = measurement?.segmentWidth ?? -1;
          const isMeasured: boolean = prefixWidth >= 0 && segmentWidth > 0;
          const annotation: TranslationAnnotation | undefined =
            segment.chunk.annotation;
          // targetPosition overlays only the measured Story Word portion of this line.
          const targetPosition: ViewStyle = {
            height: segment.height,
            left: segment.x + prefixWidth,
            top: segment.y,
            width: segmentWidth,
          };

          return (
            <View
              key={segment.id}
              pointerEvents="box-none"
              style={styles.segmentLayer}
            >
              {segment.prefixText ? (
                <Text
                  numberOfLines={1}
                  pointerEvents="none"
                  style={[textStyle, styles.measurementText]}
                  onLayout={(event: LayoutChangeEvent): void =>
                    recordMeasurement(segment.id, 'prefixWidth', event)
                  }
                >
                  {segment.prefixText}
                </Text>
              ) : null}
              <Text
                numberOfLines={1}
                pointerEvents="none"
                style={[textStyle, styles.measurementText]}
                onLayout={(event: LayoutChangeEvent): void =>
                  recordMeasurement(segment.id, 'segmentWidth', event)
                }
              >
                {segment.segmentText}
              </Text>
              {isMeasured && annotation ? (
                <Pressable
                  accessibilityHint="Opens this Story Word without leaving the episode"
                  accessibilityLabel={`Open ${annotation.surfaceText} word details`}
                  accessibilityRole="button"
                  hitSlop={storyWordHitSlop}
                  onLongPress={(): void => onLongPressChunk(segment.chunk)}
                  onPress={(): void => onPressChunk(segment.chunk)}
                  onPressIn={onPressIn}
                  style={[styles.hitTarget, targetPosition]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </>
  );
}
