import type { Metadata } from 'next';

import BrandingPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Branding Settings',
  description: 'Customize your organization branding, colors, and logo.',
};

export default function Page() {
  return <BrandingPageContent />;
}
