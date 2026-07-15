import type { ReactElement } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import { tabBarLayout, type AppColors } from '@presentation/theme';

// SorbetTabBubbleProps defines the semantic toy colors rendered inside the vector circle.
type SorbetTabBubbleProps = {
  // colors supplies the active theme's candy fill, toy highlight, shade, and rim.
  readonly colors: AppColors;
};

// bubbleSize mirrors the navigation layout contract so the SVG and motion geometry stay aligned.
const bubbleSize: number = tabBarLayout.activeIconSize;
// bubbleCenter is the shared origin for the circular fill and clipping path.
const bubbleCenter: number = bubbleSize / 2;
// bubbleRadius keeps the outer stroke fully inside the vector viewport.
const bubbleRadius: number = bubbleCenter - 0.75;

// SorbetTabBubble renders a mathematically circular toy bubble without native View clipping.
export function SorbetTabBubble({
  colors,
}: SorbetTabBubbleProps): ReactElement {
  return (
    <Svg
      accessibilityElementsHidden
      height={bubbleSize}
      viewBox={`0 0 ${bubbleSize} ${bubbleSize}`}
      width={bubbleSize}
    >
      <Defs>
        <LinearGradient
          id="sorbet-tab-bubble-fill"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <Stop offset="0%" stopColor={colors.tabBarActiveGradient[0]} />
          <Stop offset="54%" stopColor={colors.tabBarActiveGradient[1]} />
          <Stop offset="100%" stopColor={colors.tabBarActiveGradient[2]} />
        </LinearGradient>
        <ClipPath id="sorbet-tab-bubble-clip">
          <Circle cx={bubbleCenter} cy={bubbleCenter} r={bubbleRadius} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#sorbet-tab-bubble-clip)">
        <Circle
          cx={bubbleCenter}
          cy={bubbleCenter}
          fill="url(#sorbet-tab-bubble-fill)"
          r={bubbleRadius}
        />
        <Ellipse
          cx={13.5}
          cy={9.5}
          fill={colors.tabBarToyBubbleHighlight}
          rx={10.5}
          ry={4.6}
          transform="rotate(-18 13.5 9.5)"
        />
        <Ellipse
          cx={31}
          cy={35}
          fill={colors.tabBarToyBubbleShade}
          rx={14}
          ry={10}
          transform="rotate(12 31 35)"
        />
        <Circle
          cx={31}
          cy={9}
          fill={colors.tabBarToyRim}
          opacity={0.76}
          r={2}
        />
      </G>

      <Circle
        cx={bubbleCenter}
        cy={bubbleCenter}
        fill="none"
        r={bubbleRadius}
        stroke={colors.tabBarActiveBorder}
        strokeWidth={1}
      />
    </Svg>
  );
}
