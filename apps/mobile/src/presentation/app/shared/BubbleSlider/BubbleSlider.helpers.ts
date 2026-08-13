// getSteppedSliderValue clamps a candidate and snaps it to the nearest valid step.
export function getSteppedSliderValue(
  candidate: number,
  min: number,
  max: number,
  step: number,
): number {
  const lowerBound: number = Math.min(min, max);
  const upperBound: number = Math.max(min, max);
  const safeStep: number = step > 0 ? step : 1;
  const clampedValue: number = Math.max(
    lowerBound,
    Math.min(upperBound, candidate),
  );
  const steppedValue: number =
    Math.round((clampedValue - lowerBound) / safeStep) * safeStep + lowerBound;

  return Math.max(
    lowerBound,
    Math.min(upperBound, Number(steppedValue.toFixed(10))),
  );
}

// getSliderValueFromDrag applies pointer movement to the value held when the drag began.
export function getSliderValueFromDrag(
  startValue: number,
  horizontalDistance: number,
  trackWidth: number,
  min: number,
  max: number,
  step: number,
): number {
  if (trackWidth <= 0) {
    return getSteppedSliderValue(startValue, min, max, step);
  }

  return getSteppedSliderValue(
    startValue + (horizontalDistance / trackWidth) * (max - min),
    min,
    max,
    step,
  );
}

// getSliderPercentage converts a bounded value into the 0-1 visual progress range.
export function getSliderPercentage(
  value: number,
  min: number,
  max: number,
): number {
  if (max === min) {
    return 0;
  }

  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
