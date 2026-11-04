export const colors = {
  primary: '#155B54',
  primaryDark: '#0F4842',
  primarySoft: '#E6EFEE',
  cta: '#DF8749',
  ctaDark: '#C76F30',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  bg: '#FBFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F3EE',
  border: '#E5E1DA',
  borderStrong: '#CDC7BC',
  textPrimary: '#121F2B',
  textSecondary: '#4A5A6F',
  textMuted: '#8A94A3',
  textOnPrimary: '#FBFAF9',
  textOnCta: '#1F140A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const font = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
};

export const shadow = {
  card: {
    shadowColor: '#121F2B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#121F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
