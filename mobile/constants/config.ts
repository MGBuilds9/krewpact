export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://hub.mdmgroupinc.ca';

export const CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsuaHViLm1kbWdyb3VwaW5jLmNhJA';

export const COLORS = {
  primary: '#2563EB',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  text: '#111827',
  textSecondary: '#6B7280',
  muted: '#9CA3AF',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
