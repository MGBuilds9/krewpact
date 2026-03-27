import type { Metadata } from 'next';

import PageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Compliance Documents',
  description: 'View and manage your compliance documents and certifications.',
};

export default function CompliancePage() {
  return <PageContent />;
}
