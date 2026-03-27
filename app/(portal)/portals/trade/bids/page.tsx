import type { Metadata } from 'next';

import PageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Bid Opportunities',
  description: 'View and track your bid submissions and opportunities.',
};

export default function BidsPage() {
  return <PageContent />;
}
