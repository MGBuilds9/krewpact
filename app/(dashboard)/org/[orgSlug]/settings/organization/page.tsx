import type { Metadata } from 'next';

import OrganizationPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Organization Settings',
  description: 'Update organization profile, divisions, and branding.',
};

export default function Page() {
  return <OrganizationPageContent />;
}
