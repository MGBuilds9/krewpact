import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '..'),
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
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry build logs when no auth token is set
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better stack traces in production
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable source map uploads when no auth token is available
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Disable telemetry
  telemetry: false,
});
