// EpisodeHeaderGeometry describes one measured episode heading inside Reader scroll content.
export type EpisodeHeaderGeometry = {
  // height is the complete badge-and-title height that must enter the top material.
  readonly height: number;
  // index identifies the episode represented by the measured heading.
  readonly index: number;
  // top is the heading block's vertical origin inside the scroll content.
  readonly top: number;
};

// FocusedEpisodeHeaderInput contains the viewport boundary and all measured episode headings.
export type FocusedEpisodeHeaderInput = {
  // blurBottom is the screen-space lower edge of the Reader top material.
  readonly blurBottom: number;
  // headers contains headings that have completed React Native layout measurement.
  readonly headers: readonly EpisodeHeaderGeometry[];
  // scrollOffset is the current vertical Reader scroll position.
  readonly scrollOffset: number;
};

// getFocusedEpisodeHeaderIndex returns the latest heading fully contained by the top material.
export function getFocusedEpisodeHeaderIndex({
  blurBottom,
  headers,
  scrollOffset,
}: FocusedEpisodeHeaderInput): number | undefined {
  // contentBoundary converts the fixed material edge into scroll-content coordinates.
  const contentBoundary: number = scrollOffset + blurBottom;
  let focusedHeader: EpisodeHeaderGeometry | undefined;

  headers.forEach((header: EpisodeHeaderGeometry): void => {
    const headerBottom: number = header.top + header.height;

    if (
      headerBottom <= contentBoundary &&
      (focusedHeader === undefined || header.top > focusedHeader.top)
    ) {
      focusedHeader = header;
    }
  });

  return focusedHeader?.index;
}
