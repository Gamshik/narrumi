import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

// AppFontFamilies is the semantic font-family contract used by app text styles.
// Custom fonts do not synthesize weight reliably in React Native, so each visual
// weight maps to a concrete family name instead of relying on fontWeight alone.
type AppFontFamilies = {
  // displayMedium is the rounded display face for medium-emphasis headings.
  readonly displayMedium: string;
  // display is the rounded display face for standard titles.
  readonly display: string;
  // displayHeavy is the rounded display face for the strongest hero titles.
  readonly displayHeavy: string;
  // body is the default readable body face.
  readonly body: string;
  // bodyBold is the emphasized body face for labels and secondary buttons.
  readonly bodyBold: string;
  // bodyHeavy is the strongest body face for badges and primary button text.
  readonly bodyHeavy: string;
  // bodyRegular is the lightest body face for long-form reading text.
  readonly bodyRegular: string;
};

// fontFamilies maps semantic roles to the loaded Baloo 2 and Nunito faces.
export const fontFamilies: AppFontFamilies = {
  displayMedium: 'Baloo2_600SemiBold',
  display: 'Baloo2_700Bold',
  displayHeavy: 'Baloo2_800ExtraBold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  bodyRegular: 'Nunito_400Regular',
} as const;

// sorbetFontAssets is the exact font map passed to expo-font at app startup.
// Keys must equal the family names referenced in fontFamilies above.
export const sorbetFontAssets = {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} as const;
