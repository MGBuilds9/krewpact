import type { NextConfig } from 'next';
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

export default nextConfig;
