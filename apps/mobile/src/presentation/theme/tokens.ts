// AppColorTokens defines the complete semantic color contract used by app styles.
type AppColorTokens = {
  // systemBlue is the primary accent color (Sorbet "grape").
  readonly systemBlue: string;
  // systemGreen is the success/status color (Sorbet "mint").
  readonly systemGreen: string;
  // systemRed is the destructive/error color (Sorbet warm red).
  readonly systemRed: string;
  // systemOrange is the pronunciation and warning accent color (Sorbet "tangerine").
  readonly systemOrange: string;
  // systemPurple is the secondary learning accent color (Sorbet light grape).
  readonly systemPurple: string;
  // systemPink is a dialogue accent used to distinguish recurring speakers (Sorbet "bubblegum").
  readonly systemPink: string;
  // systemTeal is a dialogue accent used to distinguish recurring speakers (Sorbet "sky").
  readonly systemTeal: string;
  // backgroundPrimary is the route-level background color (fallback under the gradient).
  readonly backgroundPrimary: string;
  // backgroundSecondary is the card and list row background color.
  readonly backgroundSecondary: string;
  // backgroundTertiary is the low-emphasis fill color (chips, inputs, steppers).
  readonly backgroundTertiary: string;
  // labelPrimary is the main readable text color (Sorbet "ink").
  readonly labelPrimary: string;
  // labelSecondary is the supporting text color.
  readonly labelSecondary: string;
  // labelTertiary is the placeholder and low-emphasis text color.
  readonly labelTertiary: string;
  // separator is the hairline divider color.
  readonly separator: string;
  // glassBackground is reserved for translucent native-like surfaces.
  readonly glassBackground: string;
  // backgroundGradient are the three stops of the Sorbet screen backdrop, top to bottom.
  readonly backgroundGradient: readonly [string, string, string];
  // blobGrape tints the primary floating background blob behind screens.
  readonly blobGrape: string;
  // blobBubblegum tints the secondary floating background blob behind screens.
  readonly blobBubblegum: string;
  // blobMint tints the tertiary floating background blob behind screens.
  readonly blobMint: string;
};

// lightColors maps semantic app tokens to the warm Sorbet light appearance.
export const lightColors: AppColorTokens = {
  systemBlue: '#6e4df0',
  systemGreen: '#1fbf9c',
  systemRed: '#ff5c7a',
  systemOrange: '#ff9f45',
  systemPurple: '#8b6bff',
  systemPink: '#ff5c8a',
  systemTeal: '#4aa8ff',
  backgroundPrimary: '#fff4ec',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f4ecff',
  labelPrimary: '#3a2f4a',
  labelSecondary: '#7c7193',
  labelTertiary: '#b5aec4',
  separator: '#eadff2',
  glassBackground: '#fffffff0',
  backgroundGradient: ['#fff4ec', '#ffecf2', '#f1ecff'],
  blobGrape: '#8b6bff',
  blobBubblegum: '#ff7aa2',
  blobMint: '#2fd9b0',
} as const;

// darkColors maps semantic app tokens to a warm Sorbet dark appearance.
export const darkColors: AppColorTokens = {
  systemBlue: '#9d84ff',
  systemGreen: '#2fd9b0',
  systemRed: '#ff7a92',
  systemOrange: '#ffb35e',
  systemPurple: '#b39bff',
  systemPink: '#ff85ac',
  systemTeal: '#6ec1ff',
  backgroundPrimary: '#241c2e',
  backgroundSecondary: '#2e2440',
  backgroundTertiary: '#3a2f4a',
  labelPrimary: '#fbf5ff',
  labelSecondary: '#c9bedc',
  labelTertiary: '#8f849f',
  separator: '#43364f',
  glassBackground: '#2e2440f0',
  backgroundGradient: ['#241c2e', '#2a2036', '#31243f'],
  blobGrape: '#6e4df0',
  blobBubblegum: '#c94f7c',
  blobMint: '#1f8f78',
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

// AppRadiiTokens defines the rounded-corner scale for the claymorphic Sorbet surfaces.
type AppRadiiTokens = {
  // sm rounds small controls such as chips and inline pills.
  readonly sm: number;
  // md rounds inputs and compact buttons.
  readonly md: number;
  // lg rounds primary buttons and medium surfaces.
  readonly lg: number;
  // xl rounds cards, banners, and list containers into soft clay shapes.
  readonly xl: number;
  // pill fully rounds capsule controls and floating pills.
  readonly pill: number;
};

// radii stores the Sorbet corner-radius scale shared across clay surfaces.
export const radii: AppRadiiTokens = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

// ShadowToken describes a single soft shadow preset usable in React Native styles.
type ShadowToken = {
  // shadowColor tints the soft shadow to keep the clay look warm, not gray.
  readonly shadowColor: string;
  // shadowOffset pushes the shadow downward to lift the surface.
  readonly shadowOffset: { readonly width: number; readonly height: number };
  // shadowOpacity keeps the shadow gentle so surfaces feel soft, not harsh.
  readonly shadowOpacity: number;
  // shadowRadius blurs the shadow for the pillow-like clay softness.
  readonly shadowRadius: number;
  // elevation mirrors the shadow on Android where iOS shadow props are ignored.
  readonly elevation: number;
};

// AppShadowTokens groups the reusable soft-shadow presets for the Sorbet style.
type AppShadowTokens = {
  // clay lifts primary surfaces (banners, primary buttons) with a grape-tinted glow.
  readonly clay: ShadowToken;
  // soft lifts secondary cards and list containers with a gentle ink shadow.
  readonly soft: ShadowToken;
};

// shadows stores the soft-shadow presets that give Sorbet surfaces their depth.
export const shadows: AppShadowTokens = {
  clay: {
    shadowColor: '#6e4df0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: '#3a2f4a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;
