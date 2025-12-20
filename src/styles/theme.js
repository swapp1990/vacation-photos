// Theme constants for the app
export const colors = {
  primary: '#007AFF',
  primaryDark: '#0056b3',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: {
    primary: '#333333',
    secondary: '#666666',
    muted: '#999999',
    inverse: '#ffffff',
  },
  border: '#eeeeee',
  error: '#c62828',
  errorBackground: '#ffebee',
  success: '#2e7d32',
  successBackground: '#e8f5e9',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  splashBackground: '#4AC4F3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const typography = {
  largeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headline: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  subhead: {
    fontSize: 14,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
