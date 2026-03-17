import type { Metadata } from 'next';

import LeadSourcesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Lead Sources Report',
  description: 'Analyze lead sources, conversion rates, and acquisition channels.',
};

export default function Page() {
  return <LeadSourcesPageContent />;
}
