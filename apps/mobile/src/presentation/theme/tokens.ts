// AppColorTokens defines the complete semantic color contract used by app styles.
type AppColorTokens = {
  // systemBlue is the primary iOS accent color.
  readonly systemBlue: string;
  // systemGreen is the success/status color.
  readonly systemGreen: string;
  // systemRed is the destructive/error color.
  readonly systemRed: string;
  // systemOrange is the pronunciation and warning accent color.
  readonly systemOrange: string;
  // systemPurple is the secondary learning accent color.
  readonly systemPurple: string;
  // systemPink is a dialogue accent used to distinguish recurring speakers.
  readonly systemPink: string;
  // systemTeal is a dialogue accent used to distinguish recurring speakers.
  readonly systemTeal: string;
  // backgroundPrimary is the route-level background color.
  readonly backgroundPrimary: string;
  // backgroundSecondary is the card and list row background color.
  readonly backgroundSecondary: string;
  // backgroundTertiary is the low-emphasis fill color.
  readonly backgroundTertiary: string;
  // labelPrimary is the main readable text color.
  readonly labelPrimary: string;
  // labelSecondary is the supporting text color.
  readonly labelSecondary: string;
  // labelTertiary is the placeholder and low-emphasis text color.
  readonly labelTertiary: string;
  // separator is the hairline divider color.
  readonly separator: string;
  // glassBackground is reserved for translucent native-like surfaces.
  readonly glassBackground: string;
};

// lightColors maps semantic app tokens to iOS light appearance values.
export const lightColors: AppColorTokens = {
  systemBlue: '#007aff',
  systemGreen: '#34c759',
  systemRed: '#ff3b30',
  systemOrange: '#ff9500',
  systemPurple: '#af52de',
  systemPink: '#ff2d55',
  systemTeal: '#30b0c7',
  backgroundPrimary: '#f2f2f7',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f2f2f7',
  labelPrimary: '#000000',
  labelSecondary: '#3c3c4399',
  labelTertiary: '#3c3c434d',
  separator: '#3c3c432e',
  glassBackground: '#fffffff0',
} as const;

// darkColors maps semantic app tokens to iOS dark appearance values.
export const darkColors: AppColorTokens = {
  systemBlue: '#0a84ff',
  systemGreen: '#30d158',
  systemRed: '#ff453a',
  systemOrange: '#ff9f0a',
  systemPurple: '#bf5af2',
  systemPink: '#ff375f',
  systemTeal: '#64d2ff',
  backgroundPrimary: '#000000',
  backgroundSecondary: '#1c1c1e',
  backgroundTertiary: '#2c2c2e',
  labelPrimary: '#ffffff',
  labelSecondary: '#ebebf599',
  labelTertiary: '#ebebf54d',
  separator: '#54545699',
  glassBackground: '#1c1c1ef0',
} as const;

// AppColors is the color-token contract accepted by createStyles.
export type AppColors = typeof lightColors | typeof darkColors;

// AppSpacingTokens defines coarse spacing constants for future shared layouts.
type AppSpacingTokens = {
  // sm is the compact spacing unit.
  readonly sm: number;
  // md is the default spacing unit.
  readonly md: number;
  // lg is the large spacing unit.
  readonly lg: number;
  // xl is the extra-large spacing unit.
  readonly xl: number;
};

// spacing stores reusable layout distances aligned with the design system.
export const spacing: AppSpacingTokens = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
