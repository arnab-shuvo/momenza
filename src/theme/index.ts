export const LightColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#5B5FED',
  primaryLight: '#EEEEFF',
  primaryDark: '#4448CC',
  textPrimary: '#1A1A2E',
  textSecondary: '#8A8FA3',
  danger: '#FF6B6B',
  dangerLight: '#FFF0F0',
  border: '#E8EAF0',
  completed: '#A0A4B8',
  success: '#4CAF82',
  successLight: '#E8F5EE',
};

export const DarkColors = {
  background: '#0F0F14',
  surface: '#1A1A24',
  primary: '#7B7FFF',
  primaryLight: '#1E1E3A',
  primaryDark: '#9A9EFF',
  textPrimary: '#F0F0FA',
  textSecondary: '#6A6A8A',
  danger: '#FF6B6B',
  dangerLight: '#2A1515',
  border: '#2A2A3A',
  completed: '#5A5A7A',
  success: '#4CAF82',
  successLight: '#152218',
};

// Default export for backwards compat
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionMedium: { fontSize: 13, fontWeight: '500' as const },
};

export type ThemeColors = typeof LightColors;
