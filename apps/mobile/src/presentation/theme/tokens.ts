export const lightColors = {
  systemBlue: '#007aff',
  systemGreen: '#34c759',
  systemRed: '#ff3b30',
  systemOrange: '#ff9500',
  systemPurple: '#af52de',
  backgroundPrimary: '#f2f2f7',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f2f2f7',
  labelPrimary: '#000000',
  labelSecondary: '#3c3c4399',
  labelTertiary: '#3c3c434d',
  separator: '#3c3c432e',
  glassBackground: '#fffffff0',
} as const;

export const darkColors = {
  systemBlue: '#0a84ff',
  systemGreen: '#30d158',
  systemRed: '#ff453a',
  systemOrange: '#ff9f0a',
  systemPurple: '#bf5af2',
  backgroundPrimary: '#000000',
  backgroundSecondary: '#1c1c1e',
  backgroundTertiary: '#2c2c2e',
  labelPrimary: '#ffffff',
  labelSecondary: '#ebebf599',
  labelTertiary: '#ebebf54d',
  separator: '#54545699',
  glassBackground: '#1c1c1ef0',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;

export const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
