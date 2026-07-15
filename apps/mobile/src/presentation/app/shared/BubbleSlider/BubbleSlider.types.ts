import type { AppColors } from '@presentation/theme';

// BubbleSliderProps exposes a bounded, step-based value control without owning persistence.
export type BubbleSliderProps = {
  // accessibilityLabel names the preference controlled by the adjustable slider.
  readonly accessibilityLabel: string;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // max is the inclusive upper bound for the controlled value.
  readonly max: number;
  // maximumLabel explains the meaning of the upper endpoint.
  readonly maximumLabel?: string;
  // min is the inclusive lower bound for the controlled value.
  readonly min: number;
  // minimumLabel explains the meaning of the lower endpoint.
  readonly minimumLabel?: string;
  // step defines the increment used when snapping drag positions to values.
  readonly step?: number;
  // value is the externally persisted setting value.
  readonly value: number;
  // valueUnit is announced after the current number by assistive technology.
  readonly valueUnit?: string;
  // onValueChange reports transient drag values before persistence.
  readonly onValueChange?: ((value: number) => void) | undefined;
  // onSlidingComplete reports the final snapped value after touch release.
  readonly onSlidingComplete?: ((value: number) => void) | undefined;
  // onInteractionStart lets parent scroll containers pause while dragging.
  readonly onInteractionStart?: (() => void) | undefined;
  // onInteractionEnd lets parent scroll containers resume after dragging.
  readonly onInteractionEnd?: (() => void) | undefined;
};
