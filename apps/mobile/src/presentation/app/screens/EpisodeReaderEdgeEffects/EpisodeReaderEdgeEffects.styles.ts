import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// EpisodeReaderEdgeEffectStyles positions reader controls and compact metadata above shared material.
type EpisodeReaderEdgeEffectStyles = {
  // fill expands the interactive overlay without blocking the reading surface.
  readonly fill: ViewStyle;
  // backButton fixes the shared navigation target inside the top glass.
  readonly backButton: ViewStyle;
  // aiContainer balances the back target so compact metadata remains optically centered.
  readonly aiContainer: ViewStyle;
  // aiBadge renders the quiet generation marker without competing with the episode title.
  readonly aiBadge: TextStyle;
  // compactMetadataContainer reserves a safe center lane between fixed controls.
  readonly compactMetadataContainer: ViewStyle;
  // compactEpisodeNumber keeps episode position visible in the narrow navigation lane.
  readonly compactEpisodeNumber: TextStyle;
  // compactTitle keeps a stable font size and crops long episode names with an ellipsis.
  readonly compactTitle: TextStyle;
};

// episodeReaderEdgeEffectStyles keeps Reader-specific controls separate from shared edge construction.
export const episodeReaderEdgeEffectStyles: EpisodeReaderEdgeEffectStyles =
  StyleSheet.create({
    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backButton: {
      position: 'absolute',
      left: 20,
    },
    aiContainer: {
      position: 'absolute',
      right: 20,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiBadge: {
      overflow: 'hidden',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: '900',
      lineHeight: 14,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    compactMetadataContainer: {
      position: 'absolute',
      left: 76,
      right: 76,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
    },
    compactEpisodeNumber: {
      fontSize: 9,
      fontWeight: '900',
      lineHeight: 12,
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    compactTitle: {
      fontSize: 16,
      lineHeight: 21,
      letterSpacing: -0.2,
      textAlign: 'center',
    },
  });
