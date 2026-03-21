import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KrewPact — Construction Operations Platform',
    short_name: 'KrewPact',
    description:
      'Field operations, project management, CRM, and time tracking for MDM Group construction teams.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1510',
    theme_color: '#f5a623',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Projects',
        url: '/projects',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
