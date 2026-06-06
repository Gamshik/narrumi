import * as Speech from 'expo-speech';

import type { AudioNarrationInput, AudioNarrator } from '@application/ports';

// ExpoSpeechAudioNarrator speaks validated episode sentences through Expo TTS.
export class ExpoSpeechAudioNarrator implements AudioNarrator {
  // activeSentenceIndex guards onDone from stale utterances after pause or jump.
  private activeSentenceIndex: number | undefined;

  // speak starts one sentence and advances only after the native TTS callback.
  async speak(input: AudioNarrationInput): Promise<void> {
    await this.pause();

    this.activeSentenceIndex = input.sentenceIndex;

    Speech.speak(input.sentence, {
      language: 'en-US',
      onDone: () => {
        if (this.activeSentenceIndex === input.sentenceIndex) {
          this.activeSentenceIndex = undefined;
          input.onDone(input.sentenceIndex);
        }
      },
      onStopped: () => {
        if (this.activeSentenceIndex === input.sentenceIndex) {
          this.activeSentenceIndex = undefined;
        }
      },
    });
  }

  // pause stops the native TTS utterance and prevents stale completion events.
  async pause(): Promise<void> {
    this.activeSentenceIndex = undefined;
    await Speech.stop();
  }
}
