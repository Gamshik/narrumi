import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AppStyles } from '../../../../types';

// AudioControlsProps describes the reader playback command surface.
type AudioControlsProps = {
  // currentSentenceIndex is the active karaoke sentence position.
  readonly currentSentenceIndex: number;
  // isPlaying selects Play or Pause visual state.
  readonly isPlaying: boolean;
  // sentenceCount is the total sentence count for progress copy.
  readonly sentenceCount: number;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onPlayPause toggles the future AudioNarrator adapter.
  readonly onPlayPause: () => void;
};

// AudioControls renders the central Play/Pause control required by the MVP reader.
export function AudioControls({
  currentSentenceIndex,
  isPlaying,
  sentenceCount,
  styles,
  onPlayPause,
}: AudioControlsProps): ReactElement {
  return (
    <View style={styles.readerAudioBar}>
      <View style={styles.flex}>
        <Text style={styles.audioTrackTitle}>Episode narration</Text>
        <Text style={styles.audioTrackSubtitle}>
          Sentence {currentSentenceIndex + 1} of {sentenceCount}
        </Text>
      </View>
      <Pressable
        onPress={onPlayPause}
        style={({ pressed }) => [
          styles.audioPlayButton,
          isPlaying && styles.audioPauseButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.audioPlayButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
      </Pressable>
    </View>
  );
}
