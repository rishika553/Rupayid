export const colors = {
  primary: '#0866D9',
  primaryDark: '#10265B',
  primarySoft: '#EAF3FF',
  bright: '#087BFF',
  secondary: '#247FE5',
  cyan: '#DDF7FA',
  cta: '#0866D9',
  ctaDark: '#0755B5',
  success: '#10B981',
  successSoft: '#E5F8F1',
  warning: '#B66B09',
  warningSoft: '#FFF4DE',
  danger: '#DC3545',
  dangerSoft: '#FFF0F1',
  bg: '#F5F8FD',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF3FF',
  border: '#DCE8F7',
  borderStrong: '#C4D9F3',
  textPrimary: '#172554',
  textSecondary: '#64748B',
  textMuted: '#71829C',
  textOnPrimary: '#FFFFFF',
  textOnCta: '#FFFFFF',
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 } as const;
export const font = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
};
export const typography = { title: 26, heading: 20, section: 18, body: 14, caption: 12 } as const;
export const gradients = {
  primary: 'linear-gradient(115deg, #064BAF 0%, #0866D9 48%, #2995FF 100%)',
  soft: 'linear-gradient(120deg, #EDF5FF 0%, #DCEBFF 100%)',
  referral: 'linear-gradient(110deg, #E7FAF6 0%, #DDF7FA 48%, #CDEEFF 100%)',
};
export const shadow = {
  card: {
    shadowColor: '#163D83',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#0866D9',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
};
