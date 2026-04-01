import './globals.css';

import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/lib/query-client';
import { brandingToCSS } from '@/lib/tenant/branding-css';
import type { BrandingConfig } from '@/lib/validators/branding';

// Clerk requires valid keys at render time — force dynamic rendering
export const dynamic = 'force-dynamic';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.krewpact.com';
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth';
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/auth';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const brandingHeader = headersList.get('x-tenant-branding');
  let branding: BrandingConfig | null = null;

  if (brandingHeader) {
    try {
      branding = JSON.parse(brandingHeader) as BrandingConfig;
    } catch {
      // malformed header — fall back to defaults
    }
  }

  const siteName = branding?.company_name ?? 'KrewPact';
  const defaultTitle = branding?.company_name
    ? `${branding.company_name} | Construction Operations Platform`
    : 'KrewPact | Construction Operations Platform';

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: defaultTitle,
      template: `%s — ${siteName}`,
    },
    description: 'Construction operations platform',
    ...(branding?.favicon_url ? { icons: { icon: branding.favicon_url } } : {}),
    openGraph: {
      title: defaultTitle,
      description: 'Construction operations platform',
      siteName,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: defaultTitle,
      description: 'Construction operations platform',
    },
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const brandingHeader = headersList.get('x-tenant-branding');
  let tenantCSS = '';

  if (brandingHeader) {
    try {
      const branding = JSON.parse(brandingHeader) as BrandingConfig;
      tenantCSS = brandingToCSS(branding);
    } catch {
      // malformed header — no custom CSS
    }
  }
  return (
    <ClerkProvider
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignOutUrl={signInUrl}
      allowedRedirectOrigins={[
        'https://krewpact.ca',
        'https://accounts.krewpact.ca',
        'https://app.krewpact.ca',
        'https://hub.krewpact.ca',
        'https://portal.krewpact.ca',
        ...(appUrl ? [appUrl] : []),
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
          {/* tenantCSS is generated from validated hex colors only — safe to inject */}
          {tenantCSS ? <style dangerouslySetInnerHTML={{ __html: tenantCSS }} /> : null}
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
