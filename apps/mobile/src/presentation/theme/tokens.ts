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
  // tabBarSurface is the translucent fill layered over the floating tab bar blur.
  readonly tabBarSurface: string;
  // tabBarBorder is the soft highlight hairline around the floating tab bar.
  readonly tabBarBorder: string;
  // bubbleSurface is the default raised Bubble/Sorbet surface fill.
  readonly bubbleSurface: string;
  // bubbleSurfaceMuted is the lower-emphasis surface fill for quiet panels.
  readonly bubbleSurfaceMuted: string;
  // bubbleSurfaceRaised is the strongest floating surface fill for hero bubbles.
  readonly bubbleSurfaceRaised: string;
  // bubbleBorder is the soft outline used around reusable bubble surfaces.
  readonly bubbleBorder: string;
  // sheetSurface is the elevated bottom-sheet fill layered over blur.
  readonly sheetSurface: string;
  // sheetBorder is the visible sheet edge that keeps glass surfaces legible.
  readonly sheetBorder: string;
  // sheetScrim is the dimming overlay behind modal sheet surfaces.
  readonly sheetScrim: string;
  // pillSurface is the default background for unselected pill controls.
  readonly pillSurface: string;
  // pillSelectedSurface is the background for selected pill controls.
  readonly pillSelectedSurface: string;
  // pillBorder is the outline that separates pills from soft backgrounds.
  readonly pillBorder: string;
  // badgeNeutralSurface is the low-emphasis badge fill for metadata.
  readonly badgeNeutralSurface: string;
  // badgeAccentSurface is the branded badge fill for active learning states.
  readonly badgeAccentSurface: string;
  // badgeSuccessSurface is the badge fill for positive or synced states.
  readonly badgeSuccessSurface: string;
  // badgeWarningSurface is the badge fill for warning or offline states.
  readonly badgeWarningSurface: string;
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
  tabBarSurface: 'rgba(255, 255, 255, 0.82)',
  tabBarBorder: 'rgba(255, 255, 255, 0.6)',
  bubbleSurface: '#fffaf7',
  bubbleSurfaceMuted: 'rgba(255, 255, 255, 0.68)',
  bubbleSurfaceRaised: '#ffffff',
  bubbleBorder: 'rgba(255, 255, 255, 0.72)',
  sheetSurface: 'rgba(255, 255, 255, 0.9)',
  sheetBorder: 'rgba(255, 255, 255, 0.76)',
  sheetScrim: 'rgba(58, 47, 74, 0.28)',
  pillSurface: 'rgba(255, 255, 255, 0.72)',
  pillSelectedSurface: 'rgba(110, 77, 240, 0.14)',
  pillBorder: 'rgba(110, 77, 240, 0.16)',
  badgeNeutralSurface: 'rgba(124, 113, 147, 0.12)',
  badgeAccentSurface: 'rgba(110, 77, 240, 0.14)',
  badgeSuccessSurface: 'rgba(31, 191, 156, 0.14)',
  badgeWarningSurface: 'rgba(255, 159, 69, 0.16)',
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
  tabBarSurface: 'rgba(46, 36, 64, 0.82)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  bubbleSurface: '#332742',
  bubbleSurfaceMuted: 'rgba(58, 47, 74, 0.72)',
  bubbleSurfaceRaised: '#3a2f4a',
  bubbleBorder: 'rgba(255, 255, 255, 0.08)',
  sheetSurface: 'rgba(46, 36, 64, 0.92)',
  sheetBorder: 'rgba(255, 255, 255, 0.1)',
  sheetScrim: 'rgba(10, 7, 16, 0.52)',
  pillSurface: 'rgba(255, 255, 255, 0.08)',
  pillSelectedSurface: 'rgba(157, 132, 255, 0.2)',
  pillBorder: 'rgba(157, 132, 255, 0.22)',
  badgeNeutralSurface: 'rgba(201, 190, 220, 0.12)',
  badgeAccentSurface: 'rgba(157, 132, 255, 0.2)',
  badgeSuccessSurface: 'rgba(47, 217, 176, 0.18)',
  badgeWarningSurface: 'rgba(255, 179, 94, 0.18)',
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
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;

// AppTabBarLayoutTokens defines the floating navigation sizing contract.
type AppTabBarLayoutTokens = {
  // height is the visual height of the floating capsule tab bar.
  readonly height: number;
  // horizontalMargin keeps the capsule inset from the screen edges.
  readonly horizontalMargin: number;
  // minimumBottomInset is the smallest safe-area value used by floating tabs.
  readonly minimumBottomInset: number;
  // bottomGap separates the floating capsule from the effective safe area.
  readonly bottomGap: number;
  // contentGap keeps final scroll content clear of the floating capsule.
  readonly contentGap: number;
  // activeIconSize is the circular backing size for the active tab glyph.
  readonly activeIconSize: number;
};

// tabBarLayout stores the shared floating-tab dimensions used by route content.
export const tabBarLayout: AppTabBarLayoutTokens = {
  height: 62,
  horizontalMargin: spacing.md,
  minimumBottomInset: 12,
  bottomGap: 6,
  contentGap: spacing.lg,
  activeIconSize: 36,
} as const;

// AppMotionTokens defines reusable minimal motion values for Bubble controls.
type AppMotionTokens = {
  // pressScale is the standard scale applied while primary controls are pressed.
  readonly pressScale: number;
  // pressedOpacity is the shared visual softening applied during active press state.
  readonly pressedOpacity: number;
  // tabPressScale is the stronger press scale used by compact tab items.
  readonly tabPressScale: number;
  // selectedScale is the subtle lift applied to selected controls and tabs.
  readonly selectedScale: number;
  // sheetEnterScale is the starting scale for soft sheet entrance motion.
  readonly sheetEnterScale: number;
  // springSpeed is the shared React Native spring speed for tactile feedback.
  readonly springSpeed: number;
  // springBounciness keeps press motion soft without distracting bounce.
  readonly springBounciness: number;
};

// motion stores spring-like constants shared by pressable and selected states.
export const motion: AppMotionTokens = {
  pressScale: 0.93,
  pressedOpacity: 0.84,
  tabPressScale: 0.88,
  selectedScale: 1.05,
  sheetEnterScale: 0.98,
  springSpeed: 45,
  springBounciness: 0,
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
