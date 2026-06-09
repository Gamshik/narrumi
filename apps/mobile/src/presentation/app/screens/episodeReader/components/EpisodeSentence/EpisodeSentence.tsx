import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { EpisodeSentenceFrame, TranslationAnnotation } from '@domain/index';
import { useAppTheme } from '@presentation/app/theme';
import { darkColors, lightColors } from '@presentation/theme/tokens';
import type { AppColors } from '@presentation/theme/tokens';

import type { AppStyles } from '../../../../types';
import { buildSentenceTextChunks } from '../../episodeReaderText';
import type { SentenceTextChunk } from '../../episodeReaderText';

// EpisodeSentenceProps carries one sentence row and its annotation actions.
type EpisodeSentenceProps = {
  // annotations are validated inline translation hints for the whole episode.
  readonly annotations: readonly TranslationAnnotation[];
  // isActive applies the karaoke highlight for the currently narrated sentence.
  readonly isActive: boolean;
  // isDimmed reduces emphasis only inside the episode currently being narrated.
  readonly isDimmed: boolean;
  // sentenceFrame is the explicit narration/dialogue layout for this playback unit.
  readonly sentenceFrame: EpisodeSentenceFrame;
  // sentenceIndex is the stable sentence order from the episode payload.
  readonly sentenceIndex: number;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onPressAnnotation opens the inline translation sheet.
  readonly onPressAnnotation: (annotation: TranslationAnnotation) => void;
  // onSelectSentence lets the audio controller jump to this sentence.
  readonly onSelectSentence: (sentenceIndex: number) => void;
};

/**
 * Resolves the semantic theme accent color for a specific character speaker.
 *
 * @param speaker - The name of the speaker to resolve.
 * @param themeColors - The active application theme colors.
 * @returns The resolved hex color string.
 */
function getSpeakerColor(speaker: string, themeColors: AppColors): string {
  // Normalize speaker name to lowercase for matching
  const normalized: string = speaker.toLowerCase().trim();

  if (normalized.includes('lily') || normalized.includes('alex')) {
    return themeColors.systemOrange;
  }
  if (normalized.includes('mira') || normalized.includes('detective') || normalized.includes('jones')) {
    return themeColors.systemBlue;
  }
  if (normalized.includes('voice') || normalized.includes('wizard') || normalized.includes('shadow')) {
    return themeColors.systemPurple;
  }
  if (normalized.includes('user') || normalized.includes('you')) {
    return themeColors.systemGreen;
  }
  if (normalized.includes('suspect')) {
    return themeColors.systemRed;
  }
  // Default fallback for unnamed or unknown speakers
  return themeColors.systemPurple;
}

// EpisodeSentence renders one sentence with dimming and tappable hint fragments.
export function EpisodeSentence({
  annotations,
  isActive,
  isDimmed,
  sentenceFrame,
  sentenceIndex,
  styles,
  onPressAnnotation,
  onSelectSentence,
}: EpisodeSentenceProps): ReactElement {
  const { isDark } = useAppTheme();
  const themeColors: AppColors = isDark ? darkColors : lightColors;

  // Resolves the character speaker color to style the chat avatar and bubble.
  const speakerColor: string =
    sentenceFrame.kind === 'dialogue'
      ? getSpeakerColor(sentenceFrame.speaker, themeColors)
      : themeColors.systemPurple;

  return (
    <Pressable
      onPress={() => onSelectSentence(sentenceIndex)}
      style={({ pressed }) => [
        styles.readerSentence,
        // Disable whole row background highlight for dialogue view
        sentenceFrame.kind === 'dialogue'
          ? isDimmed
            ? styles.readerSentenceDimmed
            : styles.readerSentenceRest
          : isActive
            ? styles.readerSentenceActive
            : isDimmed
              ? styles.readerSentenceDimmed
              : styles.readerSentenceRest,
        pressed && styles.pressed,
      ]}
    >
      {sentenceFrame.kind === 'dialogue' ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Avatar circle containing the first initial of the speaker */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: speakerColor,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 13, // aligns avatar center with the first text line of the bubble
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
              {sentenceFrame.speaker.substring(0, 1).toUpperCase()}
            </Text>
          </View>

          {/* Chat bubble message area */}
          <View style={{ flex: 1, marginLeft: 8, maxWidth: '86%' }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: themeColors.labelSecondary,
                textTransform: 'uppercase',
                marginBottom: 3,
                marginLeft: 4,
              }}
            >
              {sentenceFrame.speaker}
            </Text>
            <View
              style={{
                backgroundColor: isActive
                  ? speakerColor + '22' // 13% opacity accent color when active
                  : speakerColor + '14', // 8% opacity accent color when inactive
                borderColor: isActive
                  ? speakerColor
                  : speakerColor + '2b', // subtle border outline
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignSelf: 'flex-start',
              }}
            >
              <SentenceText
                annotations={annotations}
                sentenceIndex={sentenceIndex}
                styles={styles}
                text={sentenceFrame.text}
                variant="dialogue"
                onPressAnnotation={onPressAnnotation}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Standard narrative prose paragraph aligned with bubble text */
        <View style={{ marginLeft: 40 }}>
          <SentenceText
            annotations={annotations}
            sentenceIndex={sentenceIndex}
            styles={styles}
            text={sentenceFrame.text}
            onPressAnnotation={onPressAnnotation}
          />
        </View>
      )}
    </Pressable>
  );
}

// SentenceTextProps carries one text surface that may contain tappable translation chunks.
type SentenceTextProps = {
  // annotations are validated inline translation hints for the whole episode.
  readonly annotations: readonly TranslationAnnotation[];
  // sentenceIndex scopes annotation lookup to the original playback sentence.
  readonly sentenceIndex: number;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // text is the visible prose or dialogue fragment.
  readonly text: string;
  // variant changes typography inside the highlighted dialogue bubble.
  readonly variant?: 'dialogue';
  // onPressAnnotation opens the inline translation sheet.
  readonly onPressAnnotation: (annotation: TranslationAnnotation) => void;
};

// SentenceText renders prose with nested tappable annotation spans.
function SentenceText({
  annotations,
  sentenceIndex,
  styles,
  text,
  variant,
  onPressAnnotation,
}: SentenceTextProps): ReactElement {
  const chunks = buildSentenceTextChunks({
    annotations,
    sentence: text,
    sentenceIndex,
  });

  return (
    <Text
      style={[
        styles.readerSentenceText,
        variant === 'dialogue' && styles.readerDialogueText,
      ]}
    >
      {chunks.map((chunk) => (
        <SentenceTextFragment
          chunk={chunk}
          key={chunk.id}
          styles={styles}
          onPressAnnotation={onPressAnnotation}
        />
      ))}
    </Text>
  );
}

// SentenceTextFragmentProps carries one rendered fragment and its optional annotation action.
type SentenceTextFragmentProps = {
  // chunk is a stable text fragment produced by the reader text builder.
  readonly chunk: SentenceTextChunk;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onPressAnnotation opens the inline translation sheet.
  readonly onPressAnnotation: (annotation: TranslationAnnotation) => void;
};

// SentenceTextFragment renders a plain or tappable text fragment inside one sentence.
function SentenceTextFragment({
  chunk,
  styles,
  onPressAnnotation,
}: SentenceTextFragmentProps): ReactElement {
  const annotation = chunk.annotation;

  if (annotation) {
    return (
      <Text
        onPress={() => onPressAnnotation(annotation)}
        style={styles.readerAnnotatedWord}
      >
        {chunk.text}
      </Text>
    );
  }

  return <Text>{chunk.text}</Text>;
}
