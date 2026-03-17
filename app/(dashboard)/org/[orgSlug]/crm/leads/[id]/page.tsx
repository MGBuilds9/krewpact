import type { Metadata } from 'next';

import LeadsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Lead Details',
  description: 'View lead details, score, enrichment data, and conversion options.',
};

export default function Page() {
  return <LeadsPageContent />;
}
