// SeriesDeleteActionPresentation is the layered visual state at one reveal progress value.
export type SeriesDeleteActionPresentation = {
  // haloOpacity introduces the branded grape light only while the lane is visible.
  readonly haloOpacity: number;
  // haloScale makes the internal light bloom as the foreground uncovers it.
  readonly haloScale: number;
  // haloTranslateX creates restrained parallax behind the foreground card.
  readonly haloTranslateX: number;
  // labelOpacity delays destructive copy until the open state is unambiguous.
  readonly labelOpacity: number;
  // labelTranslateY lets the compact caption settle upward beneath the icon.
  readonly labelTranslateY: number;
  // orbOpacity reveals the icon bubble after enough horizontal space exists.
  readonly orbOpacity: number;
  // orbRotation unwinds the icon bubble into its stable resting angle.
  readonly orbRotation: number;
  // orbScale inflates the icon bubble without changing the action hit target.
  readonly orbScale: number;
  // orbTranslateX lets the icon arrive from the trailing edge.
  readonly orbTranslateX: number;
  // sheenOpacity keeps the traveling highlight absent at rest.
  readonly sheenOpacity: number;
  // sheenTranslateX moves one light front across the revealed material.
  readonly sheenTranslateX: number;
};

// seriesSwipeActionWidth is both the native snap distance and exact action width in points.
export const seriesSwipeActionWidth: number = 104;
// seriesSwipeOpenThreshold requires intent while keeping the larger action easy to reveal.
export const seriesSwipeOpenThreshold: number = 46;
// seriesSwipeActivationDistance protects ordinary taps and vertical list movement from jitter.
export const seriesSwipeActivationDistance: number = 12;

// getSeriesDeleteActionPresentation maps native progress to the Sorbet reveal choreography.
export function getSeriesDeleteActionPresentation(
  // progress is the native swipe reveal where zero is covered and one is fully open.
  progress: number,
): SeriesDeleteActionPresentation {
  'worklet';

  // clampedProgress prevents native interruption or overshoot values from leaking into visuals.
  const clampedProgress: number = Math.min(1, Math.max(0, progress));
  // haloProgress begins immediately because the background material is the first visible layer.
  const haloProgress: number = Math.min(1, clampedProgress / 0.86);
  // orbProgress waits for a useful reveal width before inflating the destructive icon.
  const orbProgress: number = Math.min(
    1,
    Math.max(0, (clampedProgress - 0.16) / 0.68),
  );
  // labelProgress is the final stage so copy never clips into a narrow red strip.
  const labelProgress: number = Math.min(
    1,
    Math.max(
      0,
      clampedProgress === 1 ? 1 : (clampedProgress - 0.56) / 0.44,
    ),
  );

  return {
    haloOpacity: haloProgress * 0.42,
    haloScale: 0.58 + haloProgress * 0.58,
    haloTranslateX: 22 - haloProgress * 28,
    labelOpacity: labelProgress,
    labelTranslateY: (1 - labelProgress) * 7,
    orbOpacity: orbProgress,
    orbRotation: (1 - orbProgress) * 8,
    orbScale: 0.68 + orbProgress * 0.32,
    orbTranslateX: (1 - orbProgress) * 18,
    sheenOpacity: haloProgress * 0.54,
    sheenTranslateX: 44 - haloProgress * 58,
  };
}
