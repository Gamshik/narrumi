import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { EpisodeSentenceFrame, TranslationAnnotation } from '@domain/index';
import type { AppStyles } from '@presentation/app/types';
import { useAppTheme } from '@presentation/app/theme';
import { darkColors, lightColors } from '@presentation/theme/tokens';
import type { AppColors } from '@presentation/theme/tokens';

import type { EpisodeSelectionRange } from '../../episodeExcerptSelection';
import { SelectableReaderText } from '../SelectableReaderText';

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
  // isSelectionOwner keeps native selection handles on this sentence only.
  readonly isSelectionOwner: boolean;
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
  // onSelectionOwnerTouchStart preserves a range while its own native surface handles a tap.
  readonly onSelectionOwnerTouchStart: () => void;
  // onSelectExcerpt reports a native range or clears this sentence selection.
  readonly onSelectExcerpt: (
    range: EpisodeSelectionRange | undefined,
  ) => void;
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
  isSelectionOwner,
  sentenceFrame,
  sentenceIndex,
  speakerThemeName,
  styles,
  onPressAnnotation,
  onSelectionOwnerTouchStart,
  onSelectExcerpt,
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
    <View
      style={[
        styles.readerSentence,
        // Dialogue keeps only its own bubble border while narration may use karaoke fill.
        sentenceFrame.kind === 'dialogue'
          ? isDimmed
            ? styles.readerSentenceDimmed
            : styles.readerSentenceRest
          : isActive
            ? styles.readerSentenceActive
            : isDimmed
              ? styles.readerSentenceDimmed
              : styles.readerSentenceRest,
      ]}
    >
      {sentenceFrame.kind === 'dialogue' ? (
        <View style={styles.readerDialogueRow}>
          <View
            style={[styles.readerDialogueAvatar, { backgroundColor: speakerColor }]}
          >
            <Text style={styles.readerDialogueAvatarText}>
              {sentenceFrame.speaker.substring(0, 1).toUpperCase()}
            </Text>
          </View>

          <View style={styles.readerDialogueContent}>
            <Text
              style={[styles.readerDialogueSpeakerName, { color: speakerColor }]}
            >
              {sentenceFrame.speaker}
            </Text>
            <View
              style={[
                styles.readerDialogueBubbleFrame,
                {
                  backgroundColor: `${speakerColor}${bubbleBackgroundOpacity}`,
                  borderColor: isActive
                    ? speakerColor
                    : `${speakerColor}${bubbleBorderOpacity}`,
                },
              ]}
            >
              <SelectableReaderText
                annotationStyle={styles.readerAnnotatedWord}
                annotations={annotations}
                isSelectionOwner={isSelectionOwner}
                sentenceIndex={sentenceIndex}
                text={sentenceFrame.text}
                textStyle={[
                  styles.readerSentenceText,
                  styles.readerDialogueText,
                ]}
                onPressAnnotation={onPressAnnotation}
                onSelectionOwnerTouchStart={onSelectionOwnerTouchStart}
                onSelectionChange={onSelectExcerpt}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.readerNarrativeSentenceFrame}>
          <SelectableReaderText
            annotationStyle={styles.readerAnnotatedWord}
            annotations={annotations}
            isSelectionOwner={isSelectionOwner}
            sentenceIndex={sentenceIndex}
            text={sentenceFrame.text}
            textStyle={styles.readerSentenceText}
            onPressAnnotation={onPressAnnotation}
            onSelectionOwnerTouchStart={onSelectionOwnerTouchStart}
            onSelectionChange={onSelectExcerpt}
          />
        </View>
      )}
    </View>
  );
}
