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
  // edgeFadeTopGradient tints the blurred top edge while letting scrolled content dissolve into the status area.
  readonly edgeFadeTopGradient: readonly [string, string, string, string];
  // edgeFadeBottomGradient dissolves scrolled content behind floating navigation without adding bottom blur.
  readonly edgeFadeBottomGradient: readonly [string, string, string];
  // modalEdgeFadeBottomGradient softly dissolves modal content without implying persistent bottom navigation.
  readonly modalEdgeFadeBottomGradient: readonly [string, string, string];
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
  systemBlue: '#6b35ff',
  systemGreen: '#087f69',
  systemRed: '#d6326b',
  systemOrange: '#a84c00',
  systemPurple: '#a86bff',
  systemPink: '#ff4d97',
  systemTeal: '#31b8ff',
  backgroundPrimary: '#f8f5ff',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#eee9fa',
  labelPrimary: '#211536',
  labelSecondary: '#665a78',
  labelTertiary: '#948aa2',
  separator: '#ddd3e8',
  glassBackground: 'rgba(255, 255, 255, 0.86)',
  backgroundGradient: ['#fdf8ff', '#f1ecff', '#eaf9ff'],
  edgeFadeTopGradient: [
    'rgba(253, 248, 255, 0.92)',
    'rgba(246, 240, 255, 0.68)',
    'rgba(241, 236, 255, 0.32)',
    'rgba(241, 236, 255, 0)',
  ],
  edgeFadeBottomGradient: [
    'rgba(234, 249, 255, 0)',
    'rgba(239, 244, 255, 0.52)',
    'rgba(234, 249, 255, 0.94)',
  ],
  modalEdgeFadeBottomGradient: [
    'rgba(234, 249, 255, 0)',
    'rgba(239, 244, 255, 0.21)',
    'rgba(234, 249, 255, 0.54)',
  ],
  blobGrape: '#a86bff',
  blobBubblegum: '#ff4d97',
  blobMint: '#31b8ff',
  tabBarSurface: 'rgba(255, 255, 255, 0.76)',
  tabBarBorder: 'rgba(255, 255, 255, 0.78)',
  bubbleSurface: 'rgba(255, 255, 255, 0.78)',
  bubbleSurfaceMuted: 'rgba(255, 255, 255, 0.54)',
  bubbleSurfaceRaised: '#ffffff',
  bubbleBorder: 'rgba(255, 255, 255, 0.88)',
  sheetSurface: 'rgba(255, 255, 255, 0.88)',
  sheetBorder: 'rgba(255, 255, 255, 0.86)',
  sheetScrim: 'rgba(36, 26, 56, 0.34)',
  pillSurface: 'rgba(255, 255, 255, 0.58)',
  pillSelectedSurface: 'rgba(104, 66, 245, 0.14)',
  pillBorder: 'rgba(104, 66, 245, 0.14)',
  badgeNeutralSurface: 'rgba(112, 101, 127, 0.11)',
  badgeAccentSurface: 'rgba(104, 66, 245, 0.13)',
  badgeSuccessSurface: 'rgba(8, 125, 104, 0.13)',
  badgeWarningSurface: 'rgba(169, 78, 0, 0.13)',
} as const;

// darkColors maps semantic app tokens to a warm Sorbet dark appearance.
export const darkColors: AppColorTokens = {
  systemBlue: '#8257ff',
  systemGreen: '#46e8c3',
  systemRed: '#ff5f91',
  systemOrange: '#ffad4d',
  systemPurple: '#bd75ff',
  systemPink: '#ff4f9a',
  systemTeal: '#44c8ff',
  backgroundPrimary: '#090615',
  backgroundSecondary: '#171025',
  backgroundTertiary: '#251a37',
  labelPrimary: '#fffaff',
  labelSecondary: '#c4b9d1',
  labelTertiary: '#857992',
  separator: '#332640',
  glassBackground: 'rgba(20, 13, 34, 0.84)',
  backgroundGradient: ['#090615', '#120922', '#071721'],
  edgeFadeTopGradient: [
    'rgba(9, 6, 21, 0.98)',
    'rgba(12, 7, 25, 0.86)',
    'rgba(16, 9, 31, 0.56)',
    'rgba(18, 9, 34, 0)',
  ],
  edgeFadeBottomGradient: [
    'rgba(7, 23, 33, 0)',
    'rgba(10, 17, 31, 0.58)',
    'rgba(7, 23, 33, 0.96)',
  ],
  modalEdgeFadeBottomGradient: [
    'rgba(7, 23, 33, 0)',
    'rgba(10, 17, 31, 0.25)',
    'rgba(7, 23, 33, 0.58)',
  ],
  blobGrape: '#8257ff',
  blobBubblegum: '#ff4f9a',
  blobMint: '#44c8ff',
  tabBarSurface: 'rgba(18, 11, 31, 0.76)',
  tabBarBorder: 'rgba(255, 255, 255, 0.11)',
  bubbleSurface: 'rgba(26, 17, 43, 0.86)',
  bubbleSurfaceMuted: 'rgba(30, 20, 49, 0.62)',
  bubbleSurfaceRaised: '#2c1d43',
  bubbleBorder: 'rgba(255, 255, 255, 0.12)',
  sheetSurface: 'rgba(20, 13, 34, 0.90)',
  sheetBorder: 'rgba(255, 255, 255, 0.12)',
  sheetScrim: 'rgba(5, 3, 10, 0.62)',
  pillSurface: 'rgba(255, 255, 255, 0.07)',
  pillSelectedSurface: 'rgba(143, 114, 255, 0.22)',
  pillBorder: 'rgba(187, 168, 255, 0.18)',
  badgeNeutralSurface: 'rgba(185, 176, 200, 0.12)',
  badgeAccentSurface: 'rgba(143, 114, 255, 0.20)',
  badgeSuccessSurface: 'rgba(88, 232, 208, 0.16)',
  badgeWarningSurface: 'rgba(255, 172, 87, 0.17)',
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
  // releaseSpringSpeed is the bounce-back speed when a press is released.
  readonly releaseSpringSpeed: number;
  // releaseSpringBounciness provides the bouncy jelly effect on release.
  readonly releaseSpringBounciness: number;
};

// motion stores spring-like constants shared by pressable and selected states.
export const motion: AppMotionTokens = {
  pressScale: 0.94,
  pressedOpacity: 0.85,
  tabPressScale: 0.94,
  selectedScale: 1.03,
  sheetEnterScale: 0.96,
  springSpeed: 34,
  springBounciness: 1,
  releaseSpringSpeed: 18,
  releaseSpringBounciness: 10,
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
    shadowColor: '#713cff',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.36,
    shadowRadius: 26,
    elevation: 12,
  },
  soft: {
    shadowColor: '#241a38',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 5,
  },
} as const;
