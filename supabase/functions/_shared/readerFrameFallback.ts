import type { ReaderFrameDraft } from './dialogueFramePolicy.ts';
import { resolveOptionalAiEnrichment } from './optionalAiEnrichment.ts';

// DeterministicReaderFrameInput defines the public reader-frame fallback bounds.
export type DeterministicReaderFrameInput = {
  // sourceText is already validated English story prose.
  readonly sourceText: string;
  // minFrames satisfies the owning response schema without duplicating prose.
  readonly minFrames: number;
  // maxFrames prevents the fallback from exceeding the owning response schema.
  readonly maxFrames: number;
  // maxFrameLength keeps each frame inside its validated text limit.
  readonly maxFrameLength: number;
};

// ReaderFrameEnrichmentInput adds one optional AI framing attempt to deterministic bounds.
export type ReaderFrameEnrichmentInput = DeterministicReaderFrameInput & {
  // stage identifies the safe diagnostic when generated framing is unusable.
  readonly stage: string;
  // generate returns schema-validated semantic frames when the Utility model succeeds.
  readonly generate: () => Promise<readonly ReaderFrameDraft[]>;
};

// resolveReaderFrameEnrichment falls back after framing schema or transport exhaustion.
export async function resolveReaderFrameEnrichment({
  stage,
  generate,
  sourceText,
  minFrames,
  maxFrames,
  maxFrameLength,
}: ReaderFrameEnrichmentInput): Promise<readonly ReaderFrameDraft[]> {
  // fallbackFrames are derived only from already accepted prose and fixed schema bounds.
  const fallbackFrames: readonly ReaderFrameDraft[] =
    createDeterministicReaderFrames({
      sourceText,
      minFrames,
      maxFrames,
      maxFrameLength,
    });

  return await resolveOptionalAiEnrichment({
    stage,
    generate,
    fallback: fallbackFrames,
  });
}

// createDeterministicReaderFrames preserves accepted prose when AI framing exhausts its retries.
export function createDeterministicReaderFrames({
  sourceText,
  minFrames,
  maxFrames,
  maxFrameLength,
}: DeterministicReaderFrameInput): readonly ReaderFrameDraft[] {
  assertFrameBounds(minFrames, maxFrames, maxFrameLength);

  // normalizedSource matches whitespace normalization already applied at response boundaries.
  const normalizedSource: string = sourceText.trim().replace(/\s+/g, ' ');

  if (normalizedSource.length === 0) {
    throw new Error('Reader frame fallback requires non-empty source text.');
  }

  // sentenceUnits retain punctuation while providing natural initial split points.
  const sentenceUnits: readonly string[] = splitSentenceUnits(normalizedSource);
  // boundedUnits split only unusually long sentences before count normalization.
  const boundedUnits: string[] = sentenceUnits.flatMap((unit: string): string[] =>
    splitAtWordBoundaries(unit, maxFrameLength)
  );
  const mergedUnits: string[] = mergeToFrameLimit(
    boundedUnits,
    maxFrames,
    maxFrameLength,
  );
  const frameTexts: string[] = splitToMinimumFrames(
    mergedUnits,
    minFrames,
  );

  return frameTexts.map(
    (text: string): ReaderFrameDraft => ({ kind: 'narration', text }),
  );
}

// assertFrameBounds rejects programmer errors before fallback text is transformed.
function assertFrameBounds(
  minFrames: number,
  maxFrames: number,
  maxFrameLength: number,
): void {
  if (
    !Number.isInteger(minFrames) ||
    !Number.isInteger(maxFrames) ||
    !Number.isInteger(maxFrameLength) ||
    minFrames < 1 ||
    maxFrames < minFrames ||
    maxFrameLength < 1
  ) {
    throw new Error('Reader frame fallback received invalid bounds.');
  }
}

// splitSentenceUnits separates prose after sentence punctuation without removing it.
function splitSentenceUnits(sourceText: string): readonly string[] {
  const matches: RegExpMatchArray | null = sourceText.match(
    /[^.!?]+(?:[.!?]+["']*|$)/g,
  );
  const units: string[] = (matches ?? [])
    .map((match: string): string => match.trim())
    .filter((match: string): boolean => match.length > 0);

  return units.length > 0 ? units : [sourceText];
}

// splitAtWordBoundaries keeps every fallback frame within the schema text limit.
function splitAtWordBoundaries(
  text: string,
  maxFrameLength: number,
): string[] {
  if (text.length <= maxFrameLength) {
    return [text];
  }

  const words: readonly string[] = text.split(' ');
  const chunks: string[] = [];
  let currentChunk = '';

  words.forEach((word: string): void => {
    if (word.length > maxFrameLength) {
      throw new Error('Reader frame fallback found an overlong word.');
    }

    const candidate: string = currentChunk.length === 0
      ? word
      : `${currentChunk} ${word}`;

    if (candidate.length <= maxFrameLength) {
      currentChunk = candidate;
      return;
    }

    chunks.push(currentChunk);
    currentChunk = word;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// mergeToFrameLimit packs adjacent units in order without exceeding frame length.
function mergeToFrameLimit(
  sourceFrames: readonly string[],
  maxFrames: number,
  maxFrameLength: number,
): string[] {
  const frames: string[] = [];

  sourceFrames.forEach((sourceFrame: string): void => {
    const previousIndex: number = frames.length - 1;
    const previousFrame: string | undefined = frames[previousIndex];
    const mergedFrame: string | undefined = previousFrame
      ? `${previousFrame} ${sourceFrame}`
      : undefined;

    if (mergedFrame && mergedFrame.length <= maxFrameLength) {
      frames[previousIndex] = mergedFrame;
      return;
    }

    frames.push(sourceFrame);
  });

  if (frames.length > maxFrames) {
    throw new Error('Reader frame fallback cannot satisfy maximum count.');
  }

  return frames;
}

// splitToMinimumFrames divides the longest safe frame without duplicating story text.
function splitToMinimumFrames(
  sourceFrames: readonly string[],
  minFrames: number,
): string[] {
  const frames: string[] = [...sourceFrames];

  while (frames.length < minFrames) {
    const splitCandidateIndex: number = findLongestSplittableFrame(frames);

    if (splitCandidateIndex < 0) {
      throw new Error('Reader frame fallback cannot satisfy minimum count.');
    }

    const frameParts: readonly [string, string] = splitNearMiddle(
      frames[splitCandidateIndex]!,
    );
    frames.splice(splitCandidateIndex, 1, ...frameParts);
  }

  return frames;
}

// findLongestSplittableFrame selects the most balanced next division.
function findLongestSplittableFrame(frames: readonly string[]): number {
  let selectedIndex = -1;
  let selectedLength = -1;

  frames.forEach((frame: string, index: number): void => {
    if (frame.includes(' ') && frame.length > selectedLength) {
      selectedIndex = index;
      selectedLength = frame.length;
    }
  });

  return selectedIndex;
}

// splitNearMiddle finds the nearest word boundary to half of one frame.
function splitNearMiddle(text: string): readonly [string, string] {
  const middleIndex: number = Math.floor(text.length / 2);
  const leftBoundary: number = text.lastIndexOf(' ', middleIndex);
  const rightBoundary: number = text.indexOf(' ', middleIndex + 1);
  const splitIndex: number = leftBoundary > 0
    ? leftBoundary
    : rightBoundary;

  if (splitIndex <= 0) {
    throw new Error('Reader frame fallback cannot split a single-word frame.');
  }

  return [text.slice(0, splitIndex), text.slice(splitIndex + 1)];
}
