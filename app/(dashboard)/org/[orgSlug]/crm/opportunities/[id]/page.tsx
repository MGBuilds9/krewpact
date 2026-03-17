import type { Metadata } from 'next';

import OpportunitiesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Opportunity Details',
  description: 'View opportunity details, estimates, proposals, and deal stage.',
};

export default function Page() {
  return <OpportunitiesPageContent />;
}
