import type { Metadata } from 'next';

import EnrichmentPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Lead Enrichment',
  description: 'Enrich leads and contacts with data from Apollo, Clearbit, and LinkedIn.',
};

export default function Page() {
  return <EnrichmentPageContent />;
}
