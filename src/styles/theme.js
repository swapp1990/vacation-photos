// Modern theme constants for the app
export const colors = {
  // Primary palette
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Accent colors
  accent: '#F59E0B', // Amber
  accentLight: '#FCD34D',

  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },

  // UI elements
  border: '#E2E8F0',
  divider: '#F1F5F9',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // Special
  shadow: '#1E293B',
  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(15, 23, 42, 0.3)',
  gradient: {
    start: 'rgba(0, 0, 0, 0)',
    end: 'rgba(0, 0, 0, 0.7)',
  },
  splashBackground: '#6366F1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 20,
    fontWeight: '600',
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  subhead: {
    fontSize: 14,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};
