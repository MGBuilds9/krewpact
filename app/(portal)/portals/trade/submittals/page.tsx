import type { Metadata } from 'next';

import PageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Submittals',
  description: 'Track submittal reviews and approvals for your projects.',
};

export default function SubmittalsPage() {
  return <PageContent />;
}
