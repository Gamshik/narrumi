import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  createDeterministicReaderFrames,
  resolveReaderFrameEnrichment,
} from './readerFrameFallback.ts';
import type { ReaderFrameDraft } from './dialogueFramePolicy.ts';

Deno.test('reader frame fallback preserves opening prose across required frames', (): void => {
  const sourceText: string =
    'Mira opens the old map. A blue line appears beside the river. Vlad points toward a locked gate.';
  const frames: readonly ReaderFrameDraft[] = createDeterministicReaderFrames({
    sourceText,
    minFrames: 3,
    maxFrames: 16,
    maxFrameLength: 600,
  });

  assertEquals(frames.length, 3);
  assertEquals(
    frames.map((frame: ReaderFrameDraft): string => frame.text).join(' '),
    sourceText,
  );
  assertEquals(
    frames.every((frame: ReaderFrameDraft): boolean =>
      frame.kind === 'narration'
    ),
    true,
  );
});

Deno.test('reader frame fallback splits a short multi-word scene without duplication', (): void => {
  const sourceText: string = 'Mira quietly opens the hidden blue door.';
  const frames: readonly ReaderFrameDraft[] = createDeterministicReaderFrames({
    sourceText,
    minFrames: 3,
    maxFrames: 16,
    maxFrameLength: 600,
  });

  assertEquals(frames.length, 3);
  assertEquals(
    frames.map((frame: ReaderFrameDraft): string => frame.text).join(' '),
    sourceText,
  );
});

Deno.test('reader frame fallback enforces frame length and count bounds', (): void => {
  const sourceText: string = Array.from(
    { length: 30 },
    (_, index: number): string => `Sentence ${index + 1} stays concise.`,
  ).join(' ');
  const frames: readonly ReaderFrameDraft[] = createDeterministicReaderFrames({
    sourceText,
    minFrames: 3,
    maxFrames: 5,
    maxFrameLength: 180,
  });

  assertEquals(frames.length <= 5, true);
  assertEquals(
    frames.every((frame: ReaderFrameDraft): boolean => frame.text.length <= 180),
    true,
  );
  assertEquals(
    frames.map((frame: ReaderFrameDraft): string => frame.text).join(' '),
    sourceText,
  );
});

Deno.test('reader frame fallback rejects impossible minimums without copying prose', (): void => {
  assertThrows(
    (): void => {
      createDeterministicReaderFrames({
        sourceText: 'Alone.',
        minFrames: 3,
        maxFrames: 16,
        maxFrameLength: 600,
      });
    },
    Error,
    'cannot satisfy minimum count',
  );
});

Deno.test('reader framing schema exhaustion returns deterministic accepted prose', async (): Promise<void> => {
  const sourceText: string =
    'Mira checks the map. Vlad opens the gate. A bell rings nearby.';
  const frames: readonly ReaderFrameDraft[] =
    await resolveReaderFrameEnrichment({
    stage: 'test_reader_frames',
    sourceText,
    minFrames: 3,
    maxFrames: 16,
    maxFrameLength: 600,
    generate: (): Promise<never> =>
      Promise.reject(
        new Error('No object generated: response did not match schema.'),
      ),
    });

  assertEquals(frames.length, 3);
  assertEquals(
    frames.map((frame: ReaderFrameDraft): string => frame.text).join(' '),
    sourceText,
  );
});
