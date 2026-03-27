import './globals.css';

import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/lib/query-client';

// Clerk requires valid keys at render time — force dynamic rendering
export const dynamic = 'force-dynamic';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.krewpact.com';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'KrewPact | Construction Operations Platform',
    template: '%s — KrewPact',
  },
  description: 'Construction operations platform for MDM Group Inc.',
  openGraph: {
    title: 'KrewPact | Construction Operations Platform',
    description: 'Construction operations platform for MDM Group Inc.',
    siteName: 'KrewPact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'KrewPact | Construction Operations Platform',
    description: 'Construction operations platform for MDM Group Inc.',
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="https://accounts.krewpact.ca/sign-in"
      signUpUrl="https://accounts.krewpact.ca/sign-up"
      afterSignOutUrl="https://accounts.krewpact.ca/sign-in"
      allowedRedirectOrigins={[
        'https://accounts.krewpact.ca',
        'https://hub.krewpact.ca',
        'https://dashboard.mdmgroupinc.ca',
        'https://portal.mdmgroupinc.ca',
        ...(appUrl !== 'https://app.krewpact.com' ? [appUrl] : []),
        ...(process.env.NODE_ENV !== 'production'
          ? [
              'https://mdm-dashboard.pages.dev',
              'https://mdm-portal.pages.dev',
              'http://localhost:3000',
              'http://127.0.0.1:3000',
              'http://localhost:3001',
              'http://127.0.0.1:3001',
            ]
          : []),
      ]}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="KrewPact" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className={`${atkinson.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>{children}</QueryProvider>
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
