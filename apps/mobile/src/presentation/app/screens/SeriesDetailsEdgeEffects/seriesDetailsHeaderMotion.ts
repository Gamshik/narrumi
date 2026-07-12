// SeriesTitleGeometry describes the measured large-title edges in scroll-content coordinates.
export type SeriesTitleGeometry = {
  // blurBottom is the screen-space lower edge of the reusable top material.
  readonly blurBottom: number;
  // headerTop is the series header position inside the scroll content.
  readonly headerTop: number;
  // titleTop is the large title position inside the series header.
  readonly titleTop: number;
  // titleHeight is the rendered one- or two-line title height.
  readonly titleHeight: number;
};

// SeriesTitleScrollThresholds stores the exact edge-alignment offsets for both scroll directions.
export type SeriesTitleScrollThresholds = {
  // appearanceOffset aligns the large title bottom with the blur bottom while scrolling up.
  readonly appearanceOffset: number;
  // disappearanceOffset aligns the large title top with the blur bottom while scrolling down.
  readonly disappearanceOffset: number;
};

// getSeriesTitleScrollThresholds converts measured title geometry into deterministic scroll thresholds.
export function getSeriesTitleScrollThresholds({
  blurBottom,
  headerTop,
  titleHeight,
  titleTop,
}: SeriesTitleGeometry): SeriesTitleScrollThresholds {
  // largeTitleTop is the title's absolute position within the scroll content.
  const largeTitleTop: number = headerTop + titleTop;

  return {
    appearanceOffset: largeTitleTop + titleHeight - blurBottom,
    disappearanceOffset: largeTitleTop - blurBottom,
  };
}
