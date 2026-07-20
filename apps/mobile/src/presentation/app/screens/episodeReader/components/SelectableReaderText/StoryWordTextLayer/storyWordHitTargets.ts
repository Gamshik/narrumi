import type { SentenceTextChunk } from '../../../episodeReaderText';

// StoryWordTextLine is the stable subset of React Native line measurements used for hit testing.
export type StoryWordTextLine = {
  // height is the rendered line box height.
  readonly height: number;
  // text is the exact rendered line substring.
  readonly text: string;
  // x is the line origin inside the complete text block.
  readonly x: number;
  // y is the line top inside the complete text block.
  readonly y: number;
};

// StoryWordHitSegment describes one line-local part of an annotated chunk.
export type StoryWordHitSegment = {
  // chunk carries the Story Word annotation and complete sentence offsets.
  readonly chunk: SentenceTextChunk;
  // height matches the rendered line box.
  readonly height: number;
  // id keeps measurement and press target state stable.
  readonly id: string;
  // prefixText is measured to find the segment's horizontal start.
  readonly prefixText: string;
  // segmentText is measured to create the exact tappable width.
  readonly segmentText: string;
  // x is the rendered line origin.
  readonly x: number;
  // y is the rendered line top.
  readonly y: number;
};

// CreateStoryWordHitSegmentsInput combines semantic chunks with real native line wrapping.
type CreateStoryWordHitSegmentsInput = {
  // chunks contain exact annotation ranges inside the sentence.
  readonly chunks: readonly SentenceTextChunk[];
  // lines contain the actual wrapped text geometry reported by React Native.
  readonly lines: readonly StoryWordTextLine[];
  // text is the complete sentence shared by the visible and selectable layers.
  readonly text: string;
};

// createStoryWordHitSegments splits every Story Word across its actual rendered lines.
export function createStoryWordHitSegments({
  chunks,
  lines,
  text,
}: CreateStoryWordHitSegmentsInput): readonly StoryWordHitSegment[] {
  const annotatedChunks: readonly SentenceTextChunk[] = chunks.filter(
    (chunk: SentenceTextChunk): boolean => Boolean(chunk.annotation),
  );
  const segments: StoryWordHitSegment[] = [];
  let searchOffset: number = 0;

  lines.forEach((line: StoryWordTextLine, lineIndex: number): void => {
    const matchedOffset: number = text.indexOf(line.text, searchOffset);
    // lineStartOffset falls back to the previous boundary for platform-normalized line text.
    const lineStartOffset: number =
      matchedOffset >= searchOffset ? matchedOffset : searchOffset;
    const lineEndOffset: number = Math.min(
      lineStartOffset + line.text.length,
      text.length,
    );
    searchOffset = lineEndOffset;

    annotatedChunks.forEach((chunk: SentenceTextChunk): void => {
      const segmentStartOffset: number = Math.max(
        chunk.startOffset,
        lineStartOffset,
      );
      const segmentEndOffset: number = Math.min(
        chunk.endOffset,
        lineEndOffset,
      );

      if (segmentStartOffset >= segmentEndOffset) {
        return;
      }

      segments.push({
        chunk,
        height: line.height,
        id: `${chunk.id}:line:${lineIndex}`,
        prefixText: text.slice(lineStartOffset, segmentStartOffset),
        segmentText: text.slice(segmentStartOffset, segmentEndOffset),
        x: line.x,
        y: line.y,
      });
    });
  });

  return segments;
}
