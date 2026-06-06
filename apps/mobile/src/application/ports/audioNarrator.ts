// AudioNarrationInput is the boundary contract for one sentence-level playback unit.
export type AudioNarrationInput = {
  // sentence is the validated episode text passed to the future TTS adapter.
  readonly sentence: string;
  // sentenceIndex lets adapters report progress without parsing story text.
  readonly sentenceIndex: number;
  // onDone advances the reader after the current sentence finishes.
  readonly onDone: (sentenceIndex: number) => void;
};

// AudioNarrator is the application port for sentence-by-sentence episode playback.
export type AudioNarrator = {
  // speak plays one sentence and calls onDone when playback completes.
  readonly speak: (input: AudioNarrationInput) => Promise<void>;
  // pause stops current playback while preserving the selected sentence in UI state.
  readonly pause: () => Promise<void>;
};
