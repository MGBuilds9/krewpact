import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function requireMobileConfig(
  value: string | undefined,
  key: string,
  options: { allowFallbackInDev?: boolean; fallbackValue?: string } = {},
): string {
  if (value && value.trim().length > 0) {
    return value;
  }

  if (isDev && options.allowFallbackInDev && options.fallbackValue) {
    return options.fallbackValue;
  }

  throw new Error(`Missing mobile config: ${key}`);
}

export const API_BASE_URL: string = requireMobileConfig(
  extra.apiBaseUrl,
  'EXPO_PUBLIC_API_BASE_URL',
  {
    allowFallbackInDev: true,
    fallbackValue: 'http://localhost:3000',
  },
);

export const CLERK_PUBLISHABLE_KEY: string = requireMobileConfig(
  extra.clerkPublishableKey,
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
);

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
