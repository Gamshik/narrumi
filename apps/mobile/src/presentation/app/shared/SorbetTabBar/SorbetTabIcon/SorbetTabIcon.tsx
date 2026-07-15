import type { ReactElement } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// SorbetTabIconName limits the dock to the three product-level destinations.
export type SorbetTabIconName = 'home' | 'dictionary' | 'settings';

// SorbetTabIconProps defines the vector icon appearance controlled by its parent tab state.
type SorbetTabIconProps = {
  // color is the animated state's semantic stroke color.
  readonly color: string;
  // name selects one stable route symbol without relying on platform emoji rendering.
  readonly name: SorbetTabIconName;
};

// SorbetTabIcon renders consistent rounded line icons across iOS, Android, and web.
export function SorbetTabIcon({
  color,
  name,
}: SorbetTabIconProps): ReactElement {
  if (name === 'dictionary') {
    return (
      <Svg
        aria-hidden
        height={21}
        viewBox="0 0 24 24"
        width={21}
      >
        <Path
          d="M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5S19.83 5.48 21 6.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.15}
        />
      </Svg>
    );
  }

  if (name === 'settings') {
    return (
      <Svg
        aria-hidden
        height={21}
        viewBox="0 0 24 24"
        width={21}
      >
        <Path
          d="M10.33 4.32c.42-1.76 2.92-1.76 3.34 0a1.72 1.72 0 0 0 2.58 1.06c1.54-.94 3.3.83 2.37 2.37a1.72 1.72 0 0 0 1.06 2.58c1.76.42 1.76 2.92 0 3.34a1.72 1.72 0 0 0-1.06 2.58c.93 1.54-.83 3.3-2.37 2.37a1.72 1.72 0 0 0-2.58 1.06c-.42 1.76-2.92 1.76-3.34 0a1.72 1.72 0 0 0-2.58-1.06c-1.54.93-3.3-.83-2.37-2.37a1.72 1.72 0 0 0-1.06-2.58c-1.76-.42-1.76-2.92 0-3.34a1.72 1.72 0 0 0 1.06-2.58c-.93-1.54.83-3.3 2.37-2.37a1.72 1.72 0 0 0 2.58-1.06Z"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.9}
        />
        <Circle
          cx={12}
          cy={12}
          fill="none"
          r={3}
          stroke={color}
          strokeWidth={1.9}
        />
      </Svg>
    );
  }

  return (
    <Svg
      aria-hidden
      height={21}
      viewBox="0 0 24 24"
      width={21}
    >
      <Path
        d="m3 10.5 9-7.5 9 7.5M5 9.75V21h14V9.75M9 21v-6h6v6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.15}
      />
    </Svg>
  );
}
