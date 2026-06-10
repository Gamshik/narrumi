import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { EpisodeSentenceFrame, TranslationAnnotation } from '@domain/index';
import { useAppTheme } from '@presentation/app/theme';
import { darkColors, lightColors } from '@presentation/theme/tokens';
import type { AppColors } from '@presentation/theme/tokens';

import type { AppStyles } from '../../../../types';
import { buildSentenceTextChunks } from '../../episodeReaderText';
import type { SentenceTextChunk } from '../../episodeReaderText';

// SpeakerThemeName is the limited dialogue palette assigned by encounter order.
export type SpeakerThemeName = 'blue' | 'orange' | 'purple' | 'pink' | 'teal';

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
  // speakerThemeName selects the already-resolved visual accent for dialogue.
  readonly speakerThemeName?: SpeakerThemeName;
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
  // onPressAnnotation opens the inline translation sheet.
  readonly onPressAnnotation: (annotation: TranslationAnnotation) => void;
  // onSelectSentence lets the audio controller jump to this sentence.
  readonly onSelectSentence: (sentenceIndex: number) => void;
};

// getSpeakerColor resolves one semantic dialogue theme to the active color token.
function getSpeakerColor(
  themeName: SpeakerThemeName | undefined,
  themeColors: AppColors,
): string {
  switch (themeName) {
    case 'blue':
      return themeColors.systemBlue;
    case 'orange':
      return themeColors.systemOrange;
    case 'pink':
      return themeColors.systemPink;
    case 'teal':
      return themeColors.systemTeal;
    case 'purple':
    default:
      return themeColors.systemPurple;
  }
}

// EpisodeSentence renders one sentence with dimming and tappable hint fragments.
export function EpisodeSentence({
  annotations,
  isActive,
  isDimmed,
  sentenceFrame,
  sentenceIndex,
  speakerThemeName,
  styles,
  onPressAnnotation,
  onSelectSentence,
}: EpisodeSentenceProps): ReactElement {
  const { isDark } = useAppTheme();
  const themeColors: AppColors = isDark ? darkColors : lightColors;

  // speakerColor styles the avatar, label, border, and translucent bubble fill.
  const speakerColor: string =
    sentenceFrame.kind === 'dialogue'
      ? getSpeakerColor(speakerThemeName, themeColors)
      : themeColors.systemPurple;
  const bubbleBackgroundOpacity: string = isDark ? '14' : '0a';
  const bubbleBorderOpacity: string = isDark ? '33' : '1f';

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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: speakerColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}>
              {sentenceFrame.speaker.substring(0, 1).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, maxWidth: '86%', gap: 2 }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: speakerColor,
                textTransform: 'uppercase',
                marginLeft: 1,
              }}
            >
              {sentenceFrame.speaker}
            </Text>
            <View
              style={{
                backgroundColor: `${speakerColor}${bubbleBackgroundOpacity}`,
                borderColor: isActive
                  ? speakerColor
                  : `${speakerColor}${bubbleBorderOpacity}`,
                borderWidth: 1,
                borderRadius: 12,
                borderTopLeftRadius: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
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
        <View style={{ marginLeft: 36, paddingHorizontal: 2, paddingVertical: 4 }}>
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
