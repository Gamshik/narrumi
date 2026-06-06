import type { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';

import type { TranslationAnnotation } from '@domain/index';

import type { AppStyles } from '../../../../types';
import { buildSentenceTextChunks } from '../../episodeReaderText';

// EpisodeSentenceProps carries one sentence row and its annotation actions.
type EpisodeSentenceProps = {
  // annotations are validated inline translation hints for the whole episode.
  readonly annotations: readonly TranslationAnnotation[];
  // isActive applies the karaoke highlight for the currently narrated sentence.
  readonly isActive: boolean;
  // isDimmed reduces emphasis only inside the episode currently being narrated.
  readonly isDimmed: boolean;
  // sentence is the validated text for this playback unit.
  readonly sentence: string;
  // sentenceIndex is the stable sentence order from the episode payload.
  readonly sentenceIndex: number;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onPressAnnotation opens the inline translation sheet.
  readonly onPressAnnotation: (annotation: TranslationAnnotation) => void;
  // onSelectSentence lets the audio controller jump to this sentence.
  readonly onSelectSentence: (sentenceIndex: number) => void;
};

// EpisodeSentence renders one sentence with dimming and tappable hint fragments.
export function EpisodeSentence({
  annotations,
  isActive,
  isDimmed,
  sentence,
  sentenceIndex,
  styles,
  onPressAnnotation,
  onSelectSentence,
}: EpisodeSentenceProps): ReactElement {
  const chunks = buildSentenceTextChunks({
    annotations,
    sentence,
    sentenceIndex,
  });

  return (
    <Pressable
      onPress={() => onSelectSentence(sentenceIndex)}
      style={({ pressed }) => [
        styles.readerSentence,
        isActive
          ? styles.readerSentenceActive
          : isDimmed
            ? styles.readerSentenceDimmed
            : styles.readerSentenceRest,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.readerSentenceText}>
        {chunks.map((chunk) => {
          const annotation = chunk.annotation;

          return annotation ? (
            <Text
              key={chunk.id}
              onPress={() => onPressAnnotation(annotation)}
              style={styles.readerAnnotatedWord}
            >
              {chunk.text}
            </Text>
          ) : (
            <Text key={chunk.id}>{chunk.text}</Text>
          );
        })}
      </Text>
    </Pressable>
  );
}
