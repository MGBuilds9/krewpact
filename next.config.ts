import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Production guard: never allow demo mode in production builds
if (process.env.NODE_ENV === 'production' && isDemoMode) {
  throw new Error(
    'FATAL: NEXT_PUBLIC_DEMO_MODE=true in production build. ' +
      'This bypasses Clerk authentication. Remove NEXT_PUBLIC_DEMO_MODE or set to "false".',
  );
}

const nextConfig: NextConfig = {
  turbopack: {
    ...(isDemoMode
      ? {
          resolveAlias: {
            '@clerk/nextjs/server': './lib/clerk-demo-server.ts',
            '@clerk/nextjs': './lib/clerk-demo-client.tsx',
          },
        }
      : {}),
  },
  webpack: isDemoMode
    ? (config) => {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@clerk/nextjs/server': path.resolve(__dirname, 'lib/clerk-demo-server.ts'),
          '@clerk/nextjs': path.resolve(__dirname, 'lib/clerk-demo-client.tsx'),
        };
        return config;
      }
    : undefined,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.mdmgroupinc.ca https://clerk.hub.mdmgroupinc.ca",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.com https://*.clerk.accounts.dev https://clerk.mdmgroupinc.ca https://clerk.hub.mdmgroupinc.ca https://*.sentry.io",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
    ];
  },
};

export default withSentryConfig(analyzeBundles(nextConfig), {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
