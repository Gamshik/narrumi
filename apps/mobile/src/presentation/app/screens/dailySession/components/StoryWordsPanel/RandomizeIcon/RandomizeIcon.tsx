import type { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';

// RandomizeIconProps defines the semantic color of the platform-stable shuffle glyph.
type RandomizeIconProps = {
  // color is the active foreground color for both crossing paths.
  readonly color: string;
};

// RandomizeIcon renders one compact shuffle glyph without platform emoji variance.
export function RandomizeIcon({ color }: RandomizeIconProps): ReactElement {
  return (
    <Svg accessibilityElementsHidden height={14} viewBox="0 0 16 16" width={14}>
      <Path
        d="M2 4h2.1c1.25 0 2.16.5 2.92 1.62l2.22 3.3C10 10.04 10.9 10.55 12.15 10.55H14M11.7 8.25 14 10.55l-2.3 2.3M2 12h2.1c1.25 0 2.16-.5 2.92-1.62l2.22-3.3C10 5.96 10.9 5.45 12.15 5.45H14M11.7 3.15 14 5.45l-2.3 2.3"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}
