import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/lib/query-client';
import { Toaster } from 'sonner';
import './globals.css';

// Clerk requires valid keys at render time — force dynamic rendering
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.krewpact.com'),
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      allowedRedirectOrigins={[
        'https://hub.mdmgroupinc.ca',
        'https://dashboard.mdmgroupinc.ca',
        'https://portal.mdmgroupinc.ca',
        'https://mdm-dashboard.pages.dev',
        'https://mdm-portal.pages.dev',
      ]}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>{children}</QueryProvider>
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
