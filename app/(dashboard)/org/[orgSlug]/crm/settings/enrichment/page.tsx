import type { Metadata } from 'next';

import EnrichmentPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Enrichment Settings',
  description: 'Configure data enrichment sources and waterfall priorities.',
};

export default function Page() {
  return <EnrichmentPageContent />;
}
